import { ProductRepository } from '@/repositories/ProductRepository';
import { Product, CreateProductInput, UpdateProductInput, ProductCard } from '@/generated/types.generated';
import { productValidator } from '@/validators/ProductValidator';
import { DbProduct } from '@/database/schema/products';
import type { DbType } from '@/database';
import { productStocks } from '@/database/schema/productStock';
import { businesses } from '@/database/schema/businesses';
import { productVariantGroups } from '@/database/schema/productVariantGroups';
import { optionGroups } from '@/database/schema/optionGroups';
import { options as optionsTable } from '@/database/schema/options';
import { products as productsTable } from '@/database/schema/products';
import { and, eq, isNull, inArray } from 'drizzle-orm';
import logger from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { cache } from '@/lib/cache';

const log = logger.child({ service: 'ProductService' });

export class ProductService {
    constructor(
        private productRepository: ProductRepository,
        private db?: DbType,
    ) {}

    private mapToProduct(product: DbProduct & { stock?: number }): Product {
        return {
            ...product,
            variantGroupId: product.groupId ?? undefined,
            isOffer: product.isOffer ?? false,
            stock: product.stock ?? 0,
            price: product.price,
            salePrice: product.salePrice,
            isOnSale: product.isOnSale ?? false,
            isAvailable: product.isAvailable ?? true,
            createdAt: product.createdAt ?? new Date().toISOString(),
            updatedAt: product.updatedAt ?? new Date().toISOString(),
            // These are resolved by field resolvers via DataLoaders
            optionGroups: [],
            variants: [],
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
            groupId: validatedInput.variantGroupId,
            isOffer: validatedInput.isOffer ?? false,
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

    /**
     * Returns products grouped into ProductCard shapes for the storefront.
     * Products sharing a variant group are collapsed into a single card.
     */
    async getProductCards(businessId: string): Promise<ProductCard[]> {
        const allProducts = await this.getProducts(businessId);

        const variantGroupMap = new Map<string, Product[]>();
        const standaloneProducts: Product[] = [];

        for (const product of allProducts) {
            if (product.variantGroupId) {
                const group = variantGroupMap.get(product.variantGroupId) ?? [];
                group.push(product);
                variantGroupMap.set(product.variantGroupId, group);
            } else {
                standaloneProducts.push(product);
            }
        }

        const cards: ProductCard[] = [];

        // ProductCard.id intentionally represents the cart/list identity:
        // - variant sets use variantGroupId (group-level identity)
        // - standalone products use product.id (product-level identity)
        const groupNameById = new Map<string, string>();
        const groupIds = [...variantGroupMap.keys()];
        if (this.db && groupIds.length > 0) {
            const groups = await this.db
                .select({ id: productVariantGroups.id, name: productVariantGroups.name })
                .from(productVariantGroups)
                .where(inArray(productVariantGroups.id, groupIds));

            for (const group of groups) {
                groupNameById.set(group.id, group.name);
            }
        }

        // Variant group cards
        for (const [groupId, variants] of variantGroupMap) {
            const representative = variants[0];
            if (!representative) continue;
            const basePrice = Math.min(...variants.map((v) => v.price));
            cards.push({
                id: groupId,
                // Prefer canonical variant group name; fallback to representative product name.
                name: groupNameById.get(groupId) ?? representative.name,
                imageUrl: representative.imageUrl,
                basePrice,
                isOffer: representative.isOffer,
                variants,
                product: undefined,
            });
        }

        // Standalone product cards
        for (const product of standaloneProducts) {
            cards.push({
                id: product.id,
                name: product.name,
                imageUrl: product.imageUrl,
                basePrice: product.price,
                isOffer: product.isOffer,
                variants: [],
                product,
            });
        }

        return cards;
    }

    /**
     * Returns only products marked as offers for a given business.
     */
    async getOffers(businessId: string): Promise<Product[]> {
        const allProducts = await this.getProducts(businessId);
        return allProducts.filter((p) => p.isOffer);
    }

    async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
        const validatedInput = productValidator.validateUpdateProduct(input);

        // Extract stock and variantGroupId from input
        const { stock, variantGroupId, ...rest } = validatedInput as any;
        const updateData = { ...rest };
        if (variantGroupId !== undefined) {
            updateData.groupId = variantGroupId;
        }

        const updatedProduct = await this.productRepository.update(id, updateData);
        if (!updatedProduct) throw AppError.notFound('Product');

        // Handle stock update separately if provided and db is available
        if (stock !== undefined && this.db) {
            const existingStock = await this.db
                .select()
                .from(productStocks)
                .where(eq(productStocks.productId, id))
                .limit(1);

            if (existingStock.length > 0) {
                await this.db.update(productStocks).set({ stock }).where(eq(productStocks.productId, id));
            } else {
                await this.db.insert(productStocks).values({
                    productId: id,
                    stock,
                });
            }

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
            log.error({ err: error, businessId }, 'product:updateOrder:error');
            return false;
        }
    }

    // ─── Variant Groups ───────────────────────────────────────────────

    async createVariantGroup(input: { businessId: string; name: string }) {
        if (!this.db) throw AppError.businessRule('Database not available');
        const [created] = await this.db
            .insert(productVariantGroups)
            .values({ businessId: input.businessId, name: input.name })
            .returning();
        return created;
    }

    async deleteVariantGroup(id: string): Promise<boolean> {
        if (!this.db) throw AppError.businessRule('Database not available');
        // Products referencing this group will have groupId set to null (onDelete: 'set null')
        const [deleted] = await this.db.delete(productVariantGroups).where(eq(productVariantGroups.id, id)).returning();
        return !!deleted;
    }

    // ─── Option Groups ────────────────────────────────────────────────

    async createOptionGroup(input: {
        productId: string;
        name: string;
        minSelections: number;
        maxSelections: number;
        displayOrder?: number | null;
        options: Array<{
            name: string;
            extraPrice?: number | null;
            linkedProductId?: string | null;
            displayOrder?: number | null;
        }>;
    }) {
        if (!this.db) throw AppError.businessRule('Database not available');

        // Validate linked products are not offers
        const linkedProductIds = input.options.map((o) => o.linkedProductId).filter((id): id is string => !!id);

        if (linkedProductIds.length > 0) {
            const linkedProducts = await this.db
                .select({ id: productsTable.id, isOffer: productsTable.isOffer })
                .from(productsTable)
                .where(inArray(productsTable.id, linkedProductIds));
            for (const lp of linkedProducts) {
                if (lp.isOffer) {
                    throw AppError.badInput(`Linked product ${lp.id} cannot be an offer`);
                }
            }
        }

        const [createdGroup] = await this.db
            .insert(optionGroups)
            .values({
                productId: input.productId,
                name: input.name,
                minSelections: input.minSelections,
                maxSelections: input.maxSelections,
                displayOrder: input.displayOrder ?? 0,
            })
            .returning();

        // Insert options
        if (input.options.length > 0) {
            await this.db.insert(optionsTable).values(
                input.options.map((opt, idx) => ({
                    optionGroupId: createdGroup.id,
                    name: opt.name,
                    extraPrice: opt.extraPrice ?? 0,
                    linkedProductId: opt.linkedProductId,
                    displayOrder: opt.displayOrder ?? idx,
                })),
            );
        }

        return createdGroup;
    }

    async updateOptionGroup(
        id: string,
        input: {
            name?: string | null;
            minSelections?: number | null;
            maxSelections?: number | null;
            displayOrder?: number | null;
        },
    ) {
        if (!this.db) throw AppError.businessRule('Database not available');
        const updateData: Record<string, unknown> = {};
        if (input.name !== undefined && input.name !== null) updateData.name = input.name;
        if (input.minSelections !== undefined && input.minSelections !== null)
            updateData.minSelections = input.minSelections;
        if (input.maxSelections !== undefined && input.maxSelections !== null)
            updateData.maxSelections = input.maxSelections;
        if (input.displayOrder !== undefined && input.displayOrder !== null)
            updateData.displayOrder = input.displayOrder;

        const [updated] = await this.db.update(optionGroups).set(updateData).where(eq(optionGroups.id, id)).returning();
        if (!updated) throw AppError.notFound('OptionGroup');
        return updated;
    }

    async deleteOptionGroup(id: string): Promise<boolean> {
        if (!this.db) throw AppError.businessRule('Database not available');
        const [deleted] = await this.db.delete(optionGroups).where(eq(optionGroups.id, id)).returning();
        return !!deleted;
    }

    // ─── Options ──────────────────────────────────────────────────────

    async createOption(
        optionGroupId: string,
        input: {
            name: string;
            extraPrice?: number | null;
            linkedProductId?: string | null;
            displayOrder?: number | null;
        },
    ) {
        if (!this.db) throw AppError.businessRule('Database not available');

        // Validate linked product is not an offer
        if (input.linkedProductId) {
            const [linkedProduct] = await this.db
                .select({ isOffer: productsTable.isOffer })
                .from(productsTable)
                .where(eq(productsTable.id, input.linkedProductId));
            if (linkedProduct?.isOffer) {
                throw AppError.badInput('Linked product cannot be an offer');
            }
        }

        const [created] = await this.db
            .insert(optionsTable)
            .values({
                optionGroupId,
                name: input.name,
                extraPrice: input.extraPrice ?? 0,
                linkedProductId: input.linkedProductId,
                displayOrder: input.displayOrder ?? 0,
            })
            .returning();
        return created;
    }

    async updateOption(
        id: string,
        input: {
            name?: string | null;
            extraPrice?: number | null;
            linkedProductId?: string | null;
            displayOrder?: number | null;
        },
    ) {
        if (!this.db) throw AppError.businessRule('Database not available');

        if (input.linkedProductId) {
            const [linkedProduct] = await this.db
                .select({ isOffer: productsTable.isOffer })
                .from(productsTable)
                .where(eq(productsTable.id, input.linkedProductId));
            if (linkedProduct?.isOffer) {
                throw AppError.badInput('Linked product cannot be an offer');
            }
        }

        const updateData: Record<string, unknown> = {};
        if (input.name !== undefined && input.name !== null) updateData.name = input.name;
        if (input.extraPrice !== undefined && input.extraPrice !== null) updateData.extraPrice = input.extraPrice;
        if (input.linkedProductId !== undefined) updateData.linkedProductId = input.linkedProductId;
        if (input.displayOrder !== undefined && input.displayOrder !== null)
            updateData.displayOrder = input.displayOrder;

        const [updated] = await this.db.update(optionsTable).set(updateData).where(eq(optionsTable.id, id)).returning();
        if (!updated) throw AppError.notFound('Option');
        return updated;
    }

    async deleteOption(id: string): Promise<boolean> {
        if (!this.db) throw AppError.businessRule('Database not available');
        const [deleted] = await this.db.delete(optionsTable).where(eq(optionsTable.id, id)).returning();
        return !!deleted;
    }
}
