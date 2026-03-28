import { z } from 'zod';
import {
    CreateProductCategoryInput,
    UpdateProductCategoryInput,
    ProductCategoryOrderInput,
} from '@/generated/types.generated';
import { AppError } from '@/lib/errors';

const createProductCategorySchema = z.object({
    businessId: z.string().uuid('Invalid Business ID'),
    name: z.string().min(1, 'Name is required'),
    sortOrder: z.number().int().min(0).optional(),
});

const updateProductCategorySchema = z.object({
    name: z.string().min(1, 'Name is required').optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
});

const productCategoryOrderSchema = z.object({
    id: z.string().uuid('Invalid Category ID'),
    sortOrder: z.number().int().min(0),
});

const categoryOrderListSchema = z.array(productCategoryOrderSchema).min(1, 'At least one category is required');

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

    validateCategoryOrderList(input: ProductCategoryOrderInput[]) {
        const result = categoryOrderListSchema.safeParse(input);
        if (!result.success) {
            throw AppError.fromZodError(result.error);
        }
        return result.data;
    }
}

export const productCategoryValidator = new ProductCategoryValidator();
