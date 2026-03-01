import { ProductCategoryRepository } from '@/repositories/ProductCategoryRepository';
import { ProductCategory, CreateProductCategoryInput, UpdateProductCategoryInput } from '@/generated/types.generated';
import { productCategoryValidator } from '@/validators/ProductCategoryValidator';
import { DbProductCategory } from '@/database/schema/productCategories';
import { AppError } from '@/lib/errors';

export class ProductCategoryService {
    constructor(private productCategoryRepository: ProductCategoryRepository) {}

    private mapToProductCategory(category: DbProductCategory): ProductCategory {
        return {
            ...category,
            isActive: true,
            createdAt: category.createdAt ?? new Date().toISOString(),
            updatedAt: category.updatedAt ?? new Date().toISOString(),
        };
    }

    async createProductCategory(input: CreateProductCategoryInput): Promise<ProductCategory> {
        const validatedInput = productCategoryValidator.validateCreateProductCategory(input);

        const createdCategory = await this.productCategoryRepository.create({
            businessId: validatedInput.businessId,
            name: validatedInput.name,
        });

        return this.mapToProductCategory(createdCategory);
    }

    async getProductCategory(id: string): Promise<ProductCategory | null> {
        const category = await this.productCategoryRepository.findById(id);
        if (!category) return null;
        return this.mapToProductCategory(category);
    }

    async getProductCategories(businessId: string): Promise<ProductCategory[]> {
        const categories = await this.productCategoryRepository.findByBusinessId(businessId);
        return categories.map((c) => this.mapToProductCategory(c));
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
}
