import { ProductSubcategoryRepository } from '@/repositories/ProductSubcategoryRepository';
import { ProductCategoryRepository } from '@/repositories/ProductCategoryRepository';
import { CreateProductSubcategoryInput, ProductSubcategory, UpdateProductSubcategoryInput } from '@/generated/types.generated';
import { DbProductSubcategory } from '@/database/schema/productSubcategories';
import { productSubcategoryValidator } from '@/validators/ProductSubcategoryValidator';
import { AppError } from '@/lib/errors';
import { cache } from '@/lib/cache';

export class ProductSubcategoryService {
    constructor(
        private productSubcategoryRepository: ProductSubcategoryRepository,
        private productCategoryRepository: ProductCategoryRepository,
    ) {}

    private mapToProductSubcategory(subcategory: DbProductSubcategory): ProductSubcategory {
        return {
            ...subcategory,
            createdAt: subcategory.createdAt ?? new Date().toISOString(),
            updatedAt: subcategory.updatedAt ?? new Date().toISOString(),
        };
    }

    async getProductSubcategories(categoryId: string): Promise<ProductSubcategory[]> {
        const cached = await cache.get<ProductSubcategory[]>(cache.keys.subcategoriesByCat(categoryId));
        if (cached) return cached;

        const subcategories = await this.productSubcategoryRepository.findByCategoryId(categoryId);
        const result = subcategories.map((s) => this.mapToProductSubcategory(s));

        await cache.set(cache.keys.subcategoriesByCat(categoryId), result, cache.TTL.SUBCATEGORIES);
        return result;
    }

    async getProductSubcategoriesByBusiness(businessId: string): Promise<ProductSubcategory[]> {
        const cached = await cache.get<ProductSubcategory[]>(cache.keys.subcategories(businessId));
        if (cached) return cached;

        const categories = await this.productCategoryRepository.findByBusinessId(businessId);
        const categoryIds = categories.map((category) => category.id);
        const subcategories = await this.productSubcategoryRepository.findByCategoryIds(categoryIds);
        const result = subcategories.map((s) => this.mapToProductSubcategory(s));

        await cache.set(cache.keys.subcategories(businessId), result, cache.TTL.SUBCATEGORIES);
        return result;
    }

    async createProductSubcategory(input: CreateProductSubcategoryInput): Promise<ProductSubcategory> {
        const validatedInput = productSubcategoryValidator.validateCreateProductSubcategory(input);
        const created = await this.productSubcategoryRepository.create({
            categoryId: validatedInput.categoryId,
            name: validatedInput.name,
        });
        return this.mapToProductSubcategory(created);
    }

    async updateProductSubcategory(id: string, input: UpdateProductSubcategoryInput): Promise<ProductSubcategory> {
        const validatedInput = productSubcategoryValidator.validateUpdateProductSubcategory(input);
        const updated = await this.productSubcategoryRepository.update(id, validatedInput);
        if (!updated) throw AppError.notFound('Product Subcategory');
        return this.mapToProductSubcategory(updated);
    }

    async deleteProductSubcategory(id: string): Promise<boolean> {
        return this.productSubcategoryRepository.delete(id);
    }
}