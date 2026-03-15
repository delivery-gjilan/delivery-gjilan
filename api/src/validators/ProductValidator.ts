import { z } from 'zod';
import { CreateProductInput, UpdateProductInput } from '@/generated/types.generated';
import { AppError } from '@/lib/errors';

const createProductSchema = z.object({
    businessId: z.uuid('Invalid Business ID'),
    categoryId: z.uuid('Invalid Category ID'),
    subcategoryId: z.uuid('Invalid Subcategory ID').optional().nullable(),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    price: z.number().min(0, 'Price must be positive'),
    isOnSale: z.boolean().optional(),
    salePrice: z.number().min(0, 'Sale price must be positive').optional().nullable(),
    isAvailable: z.boolean().optional(),
});

const updateProductSchema = z.object({
    categoryId: z.uuid('Invalid Category ID').optional(),
    subcategoryId: z.uuid('Invalid Subcategory ID').optional().nullable(),
    name: z.string().min(1, 'Name is required').optional(),
    description: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    price: z.number().min(0, 'Price must be positive').optional(),
    isOnSale: z.boolean().optional(),
    salePrice: z.number().min(0, 'Sale price must be positive').optional().nullable(),
    isAvailable: z.boolean().optional(),
});

export class ProductValidator {
    validateCreateProduct(input: CreateProductInput) {
        const result = createProductSchema.safeParse(input);
        if (!result.success) {
            throw AppError.fromZodError(result.error);
        }
        return result.data;
    }

    validateUpdateProduct(input: UpdateProductInput) {
        const result = updateProductSchema.safeParse(input);
        if (!result.success) {
            throw AppError.fromZodError(result.error);
        }
        return result.data;
    }
}

export const productValidator = new ProductValidator();
