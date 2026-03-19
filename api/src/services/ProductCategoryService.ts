import { ProductCategoryRepository } from '@/repositories/ProductCategoryRepository';
import {
    ProductCategory,
    CreateProductCategoryInput,
    UpdateProductCategoryInput,
    ProductCategoryOrderInput,
} from '@/generated/types.generated';
import { productCategoryValidator } from '@/validators/ProductCategoryValidator';
import { DbProductCategory } from '@/database/schema/productCategories';
import { AppError } from '@/lib/errors';
import { cache } from '@/lib/cache';
import logger from '@/lib/logger';

const log = logger.child({ service: 'ProductCategoryService' });

export class ProductCategoryService {
    constructor(private productCategoryRepository: ProductCategoryRepository) {}

    private mapToProductCategory(category: DbProductCategory): ProductCategory {
        return {
            ...category,
            sortOrder: category.sortOrder ?? 0,
            isActive: true,
            createdAt: category.createdAt ?? new Date().toISOString(),
            updatedAt: category.updatedAt ?? new Date().toISOString(),
        };
    }

    async createProductCategory(input: CreateProductCategoryInput): Promise<ProductCategory> {
        const validatedInput = productCategoryValidator.validateCreateProductCategory(input);

        const existingCategories = await this.productCategoryRepository.findByBusinessId(validatedInput.businessId);
        const maxSortOrder = existingCategories.reduce(
            (max, category) => Math.max(max, category.sortOrder ?? 0),
            0,
        );

        const createdCategory = await this.productCategoryRepository.create({
            businessId: validatedInput.businessId,
            name: validatedInput.name,
            sortOrder: validatedInput.sortOrder ?? maxSortOrder + 1,
        });

        return this.mapToProductCategory(createdCategory);
    }

    async getProductCategory(id: string): Promise<ProductCategory | null> {
        const category = await this.productCategoryRepository.findById(id);
        if (!category) return null;
        return this.mapToProductCategory(category);
    }

    async getProductCategories(businessId: string): Promise<ProductCategory[]> {
        const cached = await cache.get<ProductCategory[]>(cache.keys.categories(businessId));
        if (cached) return cached;

        const categories = await this.productCategoryRepository.findByBusinessId(businessId);
        const result = categories.map((c) => this.mapToProductCategory(c));

        await cache.set(cache.keys.categories(businessId), result, cache.TTL.CATEGORIES);
        return result;
    }

    async updateProductCategory(id: string, input: UpdateProductCategoryInput): Promise<ProductCategory> {
        const validatedInput = productCategoryValidator.validateUpdateProductCategory(input);

        const updatedCategory = await this.productCategoryRepository.update(id, validatedInput);
        if (!updatedCategory) throw AppError.notFound('Product Category');

        return this.mapToProductCategory(updatedCategory);
    }

    async deleteProductCategory(id: string): Promise<boolean> {
        return this.productCategoryRepository.delete(id);
    }

    async updateProductCategoriesOrder(
        businessId: string,
        categories: ProductCategoryOrderInput[],
    ): Promise<boolean> {
        try {
            const validatedCategories = productCategoryValidator.validateCategoryOrderList(categories);
            await this.productCategoryRepository.updateCategoriesOrder(businessId, validatedCategories);
            return true;
        } catch (error) {
            log.error({ err: error, businessId }, 'productCategory:updateOrder:error');
            return false;
        }
    }
}
