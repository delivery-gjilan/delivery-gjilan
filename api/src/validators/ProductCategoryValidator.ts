import { z } from 'zod';
import { CreateProductCategoryInput, UpdateProductCategoryInput } from '@/generated/types.generated';

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
        return createProductCategorySchema.parse(input);
    }

    validateUpdateProductCategory(input: UpdateProductCategoryInput) {
        return updateProductCategorySchema.parse(input);
    }
}

export const productCategoryValidator = new ProductCategoryValidator();
