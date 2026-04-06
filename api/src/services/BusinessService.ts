import { BusinessRepository } from '@/repositories/BusinessRepository';
import { BusinessHoursRepository, DbBusinessHours } from '@/repositories/BusinessHoursRepository';
import { Business, BusinessDayHours, BusinessDayHoursInput, CreateBusinessInput, UpdateBusinessInput } from '@/generated/types.generated';
import { businessValidator } from '@/validators/BusinessValidator';
import { DbBusiness } from '@/database/schema/businesses';
import { AppError } from '@/lib/errors';
import { cache } from '@/lib/cache';

export class BusinessService {
    constructor(
        private businessRepository: BusinessRepository,
        private businessHoursRepository: BusinessHoursRepository,
    ) { }

    private timeStringToMinutes(time: string): number {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    private minutesToTimeString(minutes: number): string {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    private mapHoursRow(row: DbBusinessHours): BusinessDayHours {
        return {
            id: row.id,
            dayOfWeek: row.dayOfWeek,
            opensAt: this.minutesToTimeString(row.opensAt),
            closesAt: this.minutesToTimeString(row.closesAt),
        };
    }

    private mapToBusiness(business: DbBusiness, schedule: DbBusinessHours[] = []): Business {
        return {
            ...business,
            description: business.description ?? null,
            phoneNumber: business.phoneNumber ?? null,
            location: {
                latitude: business.locationLat,
                longitude: business.locationLng,
                address: business.locationAddress,
            },
            workingHours: {
                opensAt: this.minutesToTimeString(business.opensAt),
                closesAt: this.minutesToTimeString(business.closesAt),
            },
            schedule: schedule.map((r) => this.mapHoursRow(r)),
            avgPrepTimeMinutes: business.avgPrepTimeMinutes,
            prepTimeOverrideMinutes: business.prepTimeOverrideMinutes ?? null,
            isTemporarilyClosed: business.isTemporarilyClosed,
            temporaryClosureReason: business.temporaryClosureReason ?? null,
            isActive: business.isActive ?? true,
            commissionPercentage: Number(business.commissionPercentage ?? 0),
            minOrderAmount: Number(business.minOrderAmount ?? 0),
            createdAt: new Date(business.createdAt),
            updatedAt: new Date(business.updatedAt),
            isOpen: true, // computed by field resolver
        };
    }

    async createBusiness(input: CreateBusinessInput): Promise<Business> {
        const validatedInput = businessValidator.validateCreateBusiness(input);

        const open = this.timeStringToMinutes(validatedInput.workingHours.opensAt);
        const close = this.timeStringToMinutes(validatedInput.workingHours.closesAt);

        const createdBusiness = await this.businessRepository.create({
            name: validatedInput.name,
            description: (validatedInput as any).description ?? null,
            phoneNumber: validatedInput.phoneNumber ?? null,
            imageUrl: validatedInput.imageUrl,
            businessType: validatedInput.businessType,
            locationLat: validatedInput.location.latitude,
            locationLng: validatedInput.location.longitude,
            locationAddress: validatedInput.location.address,
            opensAt: open,
            closesAt: close,
            avgPrepTimeMinutes: validatedInput.avgPrepTimeMinutes ?? 20,
            isTemporarilyClosed: false,
            temporaryClosureReason: null,
            isActive: true,
            ...(input.minOrderAmount !== null && input.minOrderAmount !== undefined
                ? { minOrderAmount: String(input.minOrderAmount) }
                : {}),
        });

        return this.mapToBusiness(createdBusiness, []);
    }

    async getBusiness(id: string): Promise<Business | null> {
        // Try cache first
        const cached = await cache.get<Business>(cache.keys.business(id));
        if (cached) return cached;

        const business = await this.businessRepository.findById(id);
        if (!business) return null;
        const schedule = await this.businessHoursRepository.findByBusinessId(id);
        const result = this.mapToBusiness(business, schedule);

        await cache.set(cache.keys.business(id), result, cache.TTL.BUSINESS);
        return result;
    }

    async getBusinesses(): Promise<Business[]> {
        // Try cache first

        try {

            const cached = await cache.get<Business[]>(cache.keys.businesses());
            if (cached) return cached;

            const allBusinesses = await this.businessRepository.findAll();
            if (allBusinesses.length === 0) return [];

            const allIds = allBusinesses.map((b) => b.id);
            const allHours = await this.businessHoursRepository.findByBusinessIds(allIds);

            // Group hours by businessId
            const hoursByBiz = new Map<string, DbBusinessHours[]>();
            for (const h of allHours) {
                const arr = hoursByBiz.get(h.businessId) ?? [];
                arr.push(h);
                hoursByBiz.set(h.businessId, arr);
            }

            const businesses = allBusinesses.map((b) => this.mapToBusiness(b, hoursByBiz.get(b.id) ?? []));

            await cache.set(cache.keys.businesses(), businesses, cache.TTL.BUSINESSES);
            return businesses;
        } catch (error) {
            console.error('Error fetching businesses:', error);
            return [];
        }
    }

    async updateBusiness(id: string, input: UpdateBusinessInput): Promise<Business> {
        const validatedInput = businessValidator.validateUpdateBusiness(input);

        const updateData: Parameters<typeof this.businessRepository.update>[1] & typeof validatedInput = {
            ...validatedInput,
        };

        if (validatedInput.workingHours) {
            updateData.opensAt = this.timeStringToMinutes(validatedInput.workingHours.opensAt);
            updateData.closesAt = this.timeStringToMinutes(validatedInput.workingHours.closesAt);
            delete updateData.workingHours;
        }

        if (validatedInput.location) {
            updateData.locationLat = validatedInput.location.latitude;
            updateData.locationLng = validatedInput.location.longitude;
            updateData.locationAddress = validatedInput.location.address;
            delete updateData.location;
        }

        if (validatedInput.isTemporarilyClosed === true) {
            const reason = (validatedInput.temporaryClosureReason ?? '').trim();
            if (!reason) {
                throw AppError.badInput('A closure reason is required when closing the store');
            }
            updateData.temporaryClosureReason = reason;
        }

        if (validatedInput.isTemporarilyClosed === false) {
            updateData.temporaryClosureReason = null;
        }

        const updatedBusiness = await this.businessRepository.update(id, {
            ...updateData,
            ...(input.minOrderAmount !== null && input.minOrderAmount !== undefined
                ? { minOrderAmount: String(input.minOrderAmount) }
                : {}),
        });
        if (!updatedBusiness) throw AppError.notFound('Business');

        const schedule = await this.businessHoursRepository.findByBusinessId(id);
        return this.mapToBusiness(updatedBusiness, schedule);
    }

    async deleteBusiness(id: string): Promise<boolean> {
        return this.businessRepository.delete(id);
    }

    async getFeaturedBusinesses(): Promise<Business[]> {
        const featured = await this.businessRepository.findFeatured();
        if (featured.length === 0) return [];

        const ids = featured.map((b) => b.id);
        const allHours = await this.businessHoursRepository.findByBusinessIds(ids);
        const hoursByBiz = new Map<string, DbBusinessHours[]>();
        for (const h of allHours) {
            const arr = hoursByBiz.get(h.businessId) ?? [];
            arr.push(h);
            hoursByBiz.set(h.businessId, arr);
        }
        return featured.map((b) => this.mapToBusiness(b, hoursByBiz.get(b.id) ?? []));
    }

    async setBusinessFeatured(id: string, isFeatured: boolean, sortOrder: number): Promise<Business> {
        const updated = await this.businessRepository.setFeatured(id, isFeatured, sortOrder);
        if (!updated) throw AppError.notFound('Business');
        const schedule = await this.businessHoursRepository.findByBusinessId(id);
        return this.mapToBusiness(updated, schedule);
    }

    // ── Schedule (per-day hours) ────────────────────────────────

    async setBusinessSchedule(businessId: string, slots: BusinessDayHoursInput[]): Promise<BusinessDayHours[]> {
        // Validate
        for (const s of slots) {
            if (s.dayOfWeek < 0 || s.dayOfWeek > 6) throw AppError.badInput(`Invalid dayOfWeek: ${s.dayOfWeek}`);
            const openMin = this.timeStringToMinutes(s.opensAt);
            const closeMin = this.timeStringToMinutes(s.closesAt);
            if (openMin < 0 || openMin > 1439) throw AppError.badInput(`Invalid opensAt: ${s.opensAt}`);
            if (closeMin < 0 || closeMin > 1439) throw AppError.badInput(`Invalid closesAt: ${s.closesAt}`);
        }

        const rows = await this.businessHoursRepository.replaceSchedule(
            businessId,
            slots.map((s) => ({
                dayOfWeek: s.dayOfWeek,
                opensAt: this.timeStringToMinutes(s.opensAt),
                closesAt: this.timeStringToMinutes(s.closesAt),
            })),
        );

        return rows.map((r) => this.mapHoursRow(r));
    }

    async getBusinessSchedule(businessId: string): Promise<BusinessDayHours[]> {
        const rows = await this.businessHoursRepository.findByBusinessId(businessId);
        return rows.map((r) => this.mapHoursRow(r));
    }
}
