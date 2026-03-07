// @ts-nocheck
import { z } from 'zod';
import { CreateProductSubcategoryInput, UpdateProductSubcategoryInput } from '@/generated/types.generated';
import { AppError } from '@/lib/errors';

const createProductSubcategorySchema = z.object({
    categoryId: z.string().uuid('Invalid Category ID'),
    name: z.string().min(1, 'Name is required'),
});

const updateProductSubcategorySchema = z.object({
    name: z.string().min(1, 'Name is required').optional(),
});

export class ProductSubcategoryValidator {
    validateCreateProductSubcategory(input: CreateProductSubcategoryInput) {
        const result = createProductSubcategorySchema.safeParse(input);
        if (!result.success) {
            throw AppError.fromZodError(result.error);
        }
        return result.data;
    }

    validateUpdateProductSubcategory(input: UpdateProductSubcategoryInput) {
        const result = updateProductSubcategorySchema.safeParse(input);
        if (!result.success) {
            throw AppError.fromZodError(result.error);
        }
        return result.data;
    }
}

export const productSubcategoryValidator = new ProductSubcategoryValidator();
