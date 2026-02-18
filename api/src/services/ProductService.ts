import { ProductRepository } from '@/repositories/ProductRepository';
import { Product, CreateProductInput, UpdateProductInput } from '@/generated/types.generated';
import { productValidator } from '@/validators/ProductValidator';
import { DbProduct } from '@/database/schema/products';
import type { DbType } from '@/database';
import { productStocks } from '@/database/schema/productStock';
import { eq } from 'drizzle-orm';

export class ProductService {
    constructor(
        private productRepository: ProductRepository,
        private db?: DbType
    ) {}

    private mapToProduct(product: DbProduct & { stock?: number }): Product {
        return {
            ...product,
            stock: product.stock ?? 0,
            price: product.price,
            salePrice: product.salePrice,
            isOnSale: product.isOnSale ?? false,
            isAvailable: product.isAvailable ?? true,
            createdAt: product.createdAt ?? new Date().toISOString(),
            updatedAt: product.updatedAt ?? new Date().toISOString(),
        };
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

        // Handle stock creation if stock is provided and db is available
        if (validatedInput.stock !== undefined && this.db && validatedInput.stock > 0) {
            await this.db.insert(productStocks).values({
                productId: createdProduct.id,
                stock: validatedInput.stock,
            });
            
            // Return product with stock included
            return this.mapToProduct({
                ...createdProduct,
                stock: validatedInput.stock,
            });
        }

        return this.mapToProduct(createdProduct);
    }

    async getProduct(id: string): Promise<Product | null> {
        const product = await this.productRepository.findById(id);
        if (!product) return null;
        return this.mapToProduct(product);
    }

    async getProducts(businessId: string): Promise<Product[]> {
        const products = await this.productRepository.findByBusinessId(businessId);
        return products.map((p) => this.mapToProduct(p));
    }

    async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
        const validatedInput = productValidator.validateUpdateProduct(input);

        // Extract stock from input as it's now in a separate table
        const { stock, ...updateData } = validatedInput as any;

        const updatedProduct = await this.productRepository.update(id, updateData);
        if (!updatedProduct) throw new Error('Product not found');

        // Handle stock update separately if provided and db is available
        if (stock !== undefined && this.db) {
            const existingStock = await this.db
                .select()
                .from(productStocks)
                .where(eq(productStocks.productId, id))
                .limit(1);

            if (existingStock.length > 0) {
                // Update existing stock record
                await this.db
                    .update(productStocks)
                    .set({ stock })
                    .where(eq(productStocks.productId, id));
            } else {
                // Create new stock record
                await this.db.insert(productStocks).values({
                    productId: id,
                    stock,
                });
            }

            // Return product with updated stock
            return this.mapToProduct({
                ...updatedProduct,
                stock,
            });
        }

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
            console.error('Error updating products order:', error);
            return false;
        }
    }
}
