import { ProductRepository } from '@/repositories/ProductRepository';
import { Product, CreateProductInput, UpdateProductInput } from '@/generated/types.generated';
import { productValidator } from '@/validators/ProductValidator';
import { DbProduct } from '@/database/schema/products';
import type { DbType } from '@/database';
import { businesses } from '@/database/schema/businesses';
import { and, eq, isNull } from 'drizzle-orm';
import logger from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { cache } from '@/lib/cache';

const log = logger.child({ service: 'ProductService' });

export class ProductService {
    constructor(
        private productRepository: ProductRepository,
        private db?: DbType
    ) {}

    private mapToProduct(product: DbProduct): Product {
        return {
            ...product,
            price: product.price,
            salePrice: product.salePrice,
            isOnSale: product.isOnSale ?? false,
            isAvailable: product.isAvailable ?? true,
            createdAt: product.createdAt ?? new Date().toISOString(),
            updatedAt: product.updatedAt ?? new Date().toISOString(),
        };
    }

    private async isBusinessVisible(businessId: string): Promise<boolean> {
        if (!this.db) return true;

        const business = await this.db
            .select({ id: businesses.id })
            .from(businesses)
            .where(and(eq(businesses.id, businessId), isNull(businesses.deletedAt)))
            .limit(1);

        return business.length > 0;
    }

    async createProduct(input: CreateProductInput): Promise<Product> {
        const validatedInput = productValidator.validateCreateProduct(input);

        const createdProduct = await this.productRepository.create({
            businessId: validatedInput.businessId,
            categoryId: validatedInput.categoryId,
            subcategoryId: validatedInput.subcategoryId,
            name: validatedInput.name,
            description: validatedInput.description,
            imageUrl: validatedInput.imageUrl,
            price: validatedInput.price,
            isOnSale: validatedInput.isOnSale,
            salePrice: validatedInput.salePrice,
            isAvailable: validatedInput.isAvailable ?? true,
        });

        return this.mapToProduct(createdProduct);
    }

    async getProduct(id: string): Promise<Product | null> {
        const cached = await cache.get<Product>(cache.keys.product(id));
        if (cached) {
            const isVisible = await this.isBusinessVisible(cached.businessId);
            return isVisible ? cached : null;
        }

        const product = await this.productRepository.findById(id);
        if (!product) return null;

        const isVisible = await this.isBusinessVisible(product.businessId);
        if (!isVisible) return null;

        const mapped = this.mapToProduct(product);
        await cache.set(cache.keys.product(id), mapped, cache.TTL.PRODUCTS);
        return mapped;
    }

    async getProducts(businessId: string): Promise<Product[]> {
        const isVisible = await this.isBusinessVisible(businessId);
        if (!isVisible) return [];

        const cached = await cache.get<Product[]>(cache.keys.products(businessId));
        if (cached) return cached;

        const products = await this.productRepository.findByBusinessId(businessId);
        const mapped = products.map((p) => this.mapToProduct(p));
        await cache.set(cache.keys.products(businessId), mapped, cache.TTL.PRODUCTS);
        return mapped;
    }

    async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
        const validatedInput = productValidator.validateUpdateProduct(input);

        const updatedProduct = await this.productRepository.update(id, validatedInput);
        if (!updatedProduct) throw AppError.notFound('Product');

        return this.mapToProduct(updatedProduct);
    }

    async deleteProduct(id: string): Promise<boolean> {
        return this.productRepository.delete(id);
    }

    async updateProductsOrder(businessId: string, products: { id: string; sortOrder: number }[]): Promise<boolean> {
        try {
            await this.productRepository.updateProductsOrder(businessId, products);
            return true;
        } catch (error) {
            log.error({ err: error, businessId }, 'product:updateOrder:error');
            return false;
        }
    }
}
