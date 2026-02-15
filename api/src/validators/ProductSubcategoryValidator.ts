import { z } from 'zod';
import { CreateProductSubcategoryInput, UpdateProductSubcategoryInput } from '@/generated/types.generated';

const createProductSubcategorySchema = z.object({
    categoryId: z.string().uuid('Invalid Category ID'),
    name: z.string().min(1, 'Name is required'),
});

const updateProductSubcategorySchema = z.object({
    name: z.string().min(1, 'Name is required').optional(),
});

export class ProductSubcategoryValidator {
    validateCreateProductSubcategory(input: CreateProductSubcategoryInput) {
        return createProductSubcategorySchema.parse(input);
    }

    validateUpdateProductSubcategory(input: UpdateProductSubcategoryInput) {
        return updateProductSubcategorySchema.parse(input);
    }
}

export const productSubcategoryValidator = new ProductSubcategoryValidator();
