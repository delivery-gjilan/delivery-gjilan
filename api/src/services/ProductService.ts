import { ProductRepository } from '@/repositories/ProductRepository';
import { Product, CreateProductInput, UpdateProductInput } from '@/generated/types.generated';
import { productValidator } from '@/validators/ProductValidator';
import { DbProduct } from '@/database/schema/products';

export class ProductService {
    constructor(private productRepository: ProductRepository) {}

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

        const updateData: Parameters<typeof this.productRepository.update>[1] & typeof validatedInput = {
            ...validatedInput,
        };
        if (validatedInput.price !== undefined) {
            updateData.price = validatedInput.price;
        }
        if (validatedInput.salePrice !== undefined) {
            updateData.salePrice = validatedInput.salePrice;
        }

        const updatedProduct = await this.productRepository.update(id, updateData);
        if (!updatedProduct) throw new Error('Product not found');

        return this.mapToProduct(updatedProduct);
    }

    async deleteProduct(id: string): Promise<boolean> {
        return this.productRepository.delete(id);
    }
}
