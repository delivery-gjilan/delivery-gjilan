import { z } from 'zod';
import { CreateProductInput, UpdateProductInput } from '@/generated/types.generated';

const createProductSchema = z.object({
    businessId: z.uuid('Invalid Business ID'),
    categoryId: z.uuid('Invalid Category ID'),
    subcategoryId: z.uuid('Invalid Subcategory ID').optional().nullable(),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional().nullable(),
    imageUrl: z.string().url().optional().nullable(),
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
    imageUrl: z.string().url().optional().nullable(),
    price: z.number().min(0, 'Price must be positive').optional(),
    isOnSale: z.boolean().optional(),
    salePrice: z.number().min(0, 'Sale price must be positive').optional().nullable(),
    isAvailable: z.boolean().optional(),
});

export class ProductValidator {
    validateCreateProduct(input: CreateProductInput) {
        return createProductSchema.parse(input);
    }

    validateUpdateProduct(input: UpdateProductInput) {
        return updateProductSchema.parse(input);
    }
}

export const productValidator = new ProductValidator();
