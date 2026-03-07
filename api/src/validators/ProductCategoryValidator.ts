// @ts-nocheck
import { z } from 'zod';
import { CreateProductCategoryInput, UpdateProductCategoryInput } from '@/generated/types.generated';
import { AppError } from '@/lib/errors';

const createProductCategorySchema = z.object({
    businessId: z.string().uuid('Invalid Business ID'),
    name: z.string().min(1, 'Name is required'),
});

const updateProductCategorySchema = z.object({
    name: z.string().min(1, 'Name is required').optional(),
    isActive: z.boolean().optional(),
});

export class ProductCategoryValidator {
    validateCreateProductCategory(input: CreateProductCategoryInput) {
        const result = createProductCategorySchema.safeParse(input);
        if (!result.success) {
            throw AppError.fromZodError(result.error);
        }
        return result.data;
    }

    validateUpdateProductCategory(input: UpdateProductCategoryInput) {
        const result = updateProductCategorySchema.safeParse(input);
        if (!result.success) {
            throw AppError.fromZodError(result.error);
        }
        return result.data;
    }
}

export const productCategoryValidator = new ProductCategoryValidator();
