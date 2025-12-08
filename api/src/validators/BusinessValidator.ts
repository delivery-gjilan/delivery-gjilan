import { z } from 'zod';
import { CreateBusinessInput, UpdateBusinessInput } from '@/generated/types.generated';

const workingHoursSchema = z.object({
    opensAt: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    closesAt: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
});

const createBusinessSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    imageUrl: z.string().optional().nullable(),
    businessType: z.enum(['RESTAURANT', 'MARKET', 'PHARMACY']),
    location: z.object({
        latitude: z.number(),
        longitude: z.number(),
        address: z.string(),
    }),
    workingHours: workingHoursSchema,
});

const updateBusinessSchema = z.object({
    name: z.string().min(1, 'Name is required').optional(),
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
});

export class BusinessValidator {
    validateCreateBusiness(input: CreateBusinessInput) {
        return createBusinessSchema.parse(input);
    }

    validateUpdateBusiness(input: UpdateBusinessInput) {
        return updateBusinessSchema.parse(input);
    }
}

export const businessValidator = new BusinessValidator();
