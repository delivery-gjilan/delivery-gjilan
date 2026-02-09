import { BusinessRepository } from '@/repositories/BusinessRepository';
import { Business, CreateBusinessInput, UpdateBusinessInput } from '@/generated/types.generated';
import { businessValidator } from '@/validators/BusinessValidator';
import { DbBusiness } from '@/database/schema/businesses';

export class BusinessService {
    constructor(private businessRepository: BusinessRepository) {}

    private timeStringToMinutes(time: string): number {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    private minutesToTimeString(minutes: number): string {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    private mapToBusiness(business: DbBusiness): Business {
        return {
            ...business,
            location: {
                latitude: business.locationLat,
                longitude: business.locationLng,
                address: business.locationAddress,
            },
            workingHours: {
                opensAt: this.minutesToTimeString(business.opensAt),
                closesAt: this.minutesToTimeString(business.closesAt),
            },
            avgPrepTimeMinutes: business.avgPrepTimeMinutes,
            prepTimeOverrideMinutes: business.prepTimeOverrideMinutes ?? null,
            isActive: business.isActive ?? true,
            createdAt: new Date(business.createdAt),
            updatedAt: new Date(business.updatedAt),
            isOpen: true,
        };
    }

    async createBusiness(input: CreateBusinessInput): Promise<Business> {
        const validatedInput = businessValidator.validateCreateBusiness(input);

        const open = this.timeStringToMinutes(validatedInput.workingHours.opensAt);
        const close = this.timeStringToMinutes(validatedInput.workingHours.closesAt);

        const createdBusiness = await this.businessRepository.create({
            name: validatedInput.name,
            imageUrl: validatedInput.imageUrl,
            businessType: validatedInput.businessType,
            locationLat: validatedInput.location.latitude,
            locationLng: validatedInput.location.longitude,
            locationAddress: validatedInput.location.address,
            opensAt: open,
            closesAt: close,
            avgPrepTimeMinutes: validatedInput.avgPrepTimeMinutes ?? 20,
            isActive: true,
        });

        return this.mapToBusiness(createdBusiness);
    }

    async getBusiness(id: string): Promise<Business | null> {
        const business = await this.businessRepository.findById(id);
        if (!business) return null;
        return this.mapToBusiness(business);
    }

    async getBusinesses(): Promise<Business[]> {
        const businesses = await this.businessRepository.findAll();
        return businesses.map((b) => this.mapToBusiness(b));
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

        const updatedBusiness = await this.businessRepository.update(id, updateData);
        if (!updatedBusiness) throw new Error('Business not found');

        return this.mapToBusiness(updatedBusiness);
    }

    async deleteBusiness(id: string): Promise<boolean> {
        return this.businessRepository.delete(id);
    }
}
