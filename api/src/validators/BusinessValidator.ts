import { z } from 'zod';
import { CreateBusinessInput, UpdateBusinessInput } from '@/generated/types.generated';
import { AppError } from '@/lib/errors';

const workingHoursSchema = z.object({
    opensAt: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    closesAt: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
});

const createBusinessSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    phoneNumber: z.string().min(3).max(32).optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    businessType: z.enum(['RESTAURANT', 'MARKET', 'PHARMACY']),
    location: z.object({
        latitude: z.number(),
        longitude: z.number(),
        address: z.string(),
    }),
    workingHours: workingHoursSchema,
    avgPrepTimeMinutes: z.number().int().min(1).max(240).optional(),
});

const updateBusinessSchema = z.object({
    name: z.string().min(1, 'Name is required').optional(),
    phoneNumber: z.string().min(3).max(32).optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    businessType: z.enum(['RESTAURANT', 'MARKET', 'PHARMACY']).optional(),
    location: z
        .object({
            latitude: z.number(),
            longitude: z.number(),
            address: z.string(),
        })
        .optional(),
    workingHours: workingHoursSchema.optional(),
    isActive: z.boolean().optional(),
    avgPrepTimeMinutes: z.number().int().min(1).max(240).optional(),
    prepTimeOverrideMinutes: z.number().int().min(1).max(240).optional().nullable(),
});

export class BusinessValidator {
    validateCreateBusiness(input: CreateBusinessInput) {
        const result = createBusinessSchema.safeParse(input);
        if (!result.success) {
            throw AppError.fromZodError(result.error);
        }
        return result.data;
    }

    validateUpdateBusiness(input: UpdateBusinessInput) {
        const result = updateBusinessSchema.safeParse(input);
        if (!result.success) {
            throw AppError.fromZodError(result.error);
        }
        return result.data;
    }
}

export const businessValidator = new BusinessValidator();
