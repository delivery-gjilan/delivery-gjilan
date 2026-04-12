import { randomBytes } from 'crypto';
import {
    orderItems as orderItemsTable,
    orders as ordersTable,
    products as productsTable,
    businesses as businessesTable,
    businessHours as businessHoursTable,
    deliveryPricingTiers as deliveryPricingTiersTable,
    deliveryZones as deliveryZonesTable,
    orderPromotions as orderPromotionsTable,
    orderItemOptions as orderItemOptionsTable,
    optionGroups as optionGroupsTable,
    options as optionsDbTable,
    users as usersTable,
    promotions as promotionsTable,
    personalInventory,
    orderCoverageLogs,
    storeSettings,
} from '@/database/schema';
import { userPromoMetadata } from '@/database/schema';
import { and, asc, eq, inArray, isNull, notInArray, sql } from 'drizzle-orm';
import type { Order, CreateOrderInput } from '@/generated/types.generated';
import { AppError } from '@/lib/errors';
import { PromotionEngine } from '@/services/PromotionEngine';
import type { PromotionResult, CartContext } from '@/services/PromotionEngine';
import { PricingService } from '@/services/PricingService';
import { applyPercentageDiscount, moneyEquals, normalizeMoney } from '@/lib/utils/money';
import { calculateDrivingDistanceKm } from '@/lib/haversine';
import { isPointInPolygon } from '@/lib/pointInPolygon';
import logger from '@/lib/logger';
import type { GraphQLContext } from '@/graphql/context';
import {
    notifyAdminsNewOrder,
    notifyAdminsOrderNeedsApproval,
    notifyBusinessNewOrder,
    updateLiveActivity,
} from '@/services/orderNotifications';
import { cache } from '@/lib/cache';
import { createAuditLogger } from '@/services/AuditLogger';
import { getPrioritySurchargeAmount } from '@/config/prioritySurcharge';
import { scheduleDemoOrderProgression } from '@/services/DemoProgressionService';
import type { OrderServiceDeps } from './types';
import type { OrderMappingModule } from './OrderMappingModule';
import type { OrderPublishingModule } from './OrderPublishingModule';
import type { OrderUserBehaviorModule } from './OrderUserBehaviorModule';

const log = logger.child({ module: 'OrderCreationModule' });
const TRUSTED_CUSTOMER_MARKER = '[TRUSTED_CUSTOMER]';

export class OrderCreationModule {
    private mapping!: OrderMappingModule;
    private publishing!: OrderPublishingModule;
    private userBehavior!: OrderUserBehaviorModule;

    constructor(private deps: OrderServiceDeps) {}

    /** Called by the facade after all modules are constructed */
    setSiblings(mapping: OrderMappingModule, publishing: OrderPublishingModule, userBehavior: OrderUserBehaviorModule) {
        this.mapping = mapping;
        this.publishing = publishing;
        this.userBehavior = userBehavior;
    }

    private generateDisplayId(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
        const bytes = randomBytes(4);
        let id = '';
        for (let i = 0; i < 4; i++) {
            id += chars[bytes[i] % chars.length];
        }
        return `GJ-${id}`;
    }

    isTrustedCustomer(adminNote?: string | null, flagColor?: string | null): boolean {
        const normalizedNote = String(adminNote ?? '').toUpperCase();
        const normalizedFlag = String(flagColor ?? '').toLowerCase();
        return normalizedNote.includes(TRUSTED_CUSTOMER_MARKER) || normalizedFlag === 'green';
    }

    async getActiveDeliveryZones(): Promise<Array<typeof deliveryZonesTable.$inferSelect>> {
        const cacheKey = cache.keys.deliveryZones();
        const cachedZones = await cache.get<Array<typeof deliveryZonesTable.$inferSelect>>(cacheKey);
        if (cachedZones) {
            return cachedZones;
        }

        const zones = await this.deps.db
            .select()
            .from(deliveryZonesTable)
            .where(eq(deliveryZonesTable.isActive, true))
            .orderBy(asc(deliveryZonesTable.sortOrder));

        await cache.set(cacheKey, zones, cache.TTL.DELIVERY_ZONES);
        return zones;
    }

    async getActiveDeliveryPricingTiers(): Promise<Array<typeof deliveryPricingTiersTable.$inferSelect>> {
        const cacheKey = cache.keys.deliveryPricingTiers();
        const cachedTiers = await cache.get<Array<typeof deliveryPricingTiersTable.$inferSelect>>(cacheKey);
        if (cachedTiers) {
            return cachedTiers;
        }

        const tiers = await this.deps.db
            .select()
            .from(deliveryPricingTiersTable)
            .where(eq(deliveryPricingTiersTable.isActive, true))
            .orderBy(asc(deliveryPricingTiersTable.sortOrder), asc(deliveryPricingTiersTable.minDistanceKm));

        await cache.set(cacheKey, tiers, cache.TTL.DELIVERY_PRICING_TIERS);
        return tiers;
    }

    async calculateExpectedDeliveryPrice(params: {
        businessId: string;
        dropoffLat: number;
        dropoffLng: number;
    }): Promise<number> {
        const db = this.deps.db;
        const DEFAULT_DELIVERY_PRICE = 2.0;

        const [business] = await db
            .select()
            .from(businessesTable)
            .where(eq(businessesTable.id, params.businessId));

        if (!business) {
            throw AppError.notFound(`Business with ID ${params.businessId}`);
        }

        const { distanceKm } = await calculateDrivingDistanceKm(
            business.locationLat,
            business.locationLng,
            params.dropoffLat,
            params.dropoffLng,
        );

        const zones = await this.getActiveDeliveryZones();

        const dropoffPoint = { lat: params.dropoffLat, lng: params.dropoffLng };
        const matchedZone = zones.find(
            (zone) => !zone.isServiceZone && isPointInPolygon(dropoffPoint, zone.polygon),
        );
        if (matchedZone) {
            return normalizeMoney(Number(matchedZone.deliveryFee));
        }

        const tiers = await this.getActiveDeliveryPricingTiers();

        if (tiers.length === 0) {
            return normalizeMoney(DEFAULT_DELIVERY_PRICE);
        }

        const matchedTier = tiers.find((tier) => {
            const min = tier.minDistanceKm;
            const max = tier.maxDistanceKm;
            if (max === null || max === undefined) {
                return distanceKm >= min;
            }
            return distanceKm >= min && distanceKm < max;
        });

        if (!matchedTier) {
            const lastTier = tiers[tiers.length - 1];
            return normalizeMoney(Number(lastTier?.price ?? DEFAULT_DELIVERY_PRICE));
        }

        return normalizeMoney(Number(matchedTier.price));
    }

    private async ensureUserPromoMetadata(userId: string): Promise<void> {
        const db = this.deps.db;
        await db.insert(userPromoMetadata).values({ userId }).onConflictDoNothing();
    }

    async createOrder(userId: string, input: CreateOrderInput): Promise<Order> {
        // 1. Validate User
        const user = await this.deps.authRepository.findById(userId);
        if (!user) {
            throw AppError.notFound('User');
        }

        if (user.signupStep !== 'COMPLETED') {
            throw AppError.businessRule('User has not completed signup process');
        }

        // 1b. Block if user already has an active order
        const db = this.deps.db;
        const activeOrderCheck = await db
            .select({ id: ordersTable.id })
            .from(ordersTable)
            .where(
                and(
                    eq(ordersTable.userId, userId),
                    notInArray(ordersTable.status, ['DELIVERED', 'CANCELLED']),
                ),
            )
            .limit(1);
        if (activeOrderCheck.length > 0) {
            throw AppError.businessRule('You already have an active order. Please wait for it to be completed before placing a new one.');
        }

        // 2. Validate Products and Calculate Totals (batch fetch to avoid N+1)
        const allProductIds = new Set<string>();
        for (const itemInput of input.items) {
            allProductIds.add(itemInput.productId);
            if (itemInput.childItems) {
                for (const child of itemInput.childItems) {
                    allProductIds.add(child.productId);
                }
            }
        }
        const allProducts = await this.deps.productRepository.findByIds([...allProductIds]);
        const productMap = new Map(allProducts.map((p) => [p.id, p]));

        const pricingTimestamp = new Date();
        const pricingService = new PricingService(this.deps.db);
        const priceByProductId = await pricingService.calculateProductPrices([...allProductIds], { timestamp: pricingTimestamp });

        let calculatedItemsTotal = 0;
        const itemsToCreate: Array<{
            productId: string;
            quantity: number;
            finalAppliedPrice: number;
            basePrice: number;
            saleDiscountPercentage: number | null;
            markupPrice: number | null;
            nightMarkedupPrice: number | null;
            notes: string | null;
            /** Per-unit base cost (discountedBasePrice + optionsExtra) for inventory price computation. */
            _unitBaseCost: number;
            selectedOptions?: Array<{ optionGroupId: string; optionId: string; price?: number | null }>;
            childItems?: Array<{
                productId: string;
                selectedOptions: Array<{ optionGroupId: string; optionId: string; price?: number | null }>;
            }>;
        }> = [];
        const cartItems = [] as Array<{ productId: string; businessId: string; quantity: number; price: number }>;
        const businessIds = new Set<string>();

        // Collect all option IDs for batch validation
        const allOptionIds = new Set<string>();
        const allOptionGroupIds = new Set<string>();
        for (const itemInput of input.items) {
            if (itemInput.selectedOptions) {
                for (const so of itemInput.selectedOptions) {
                    allOptionIds.add(so.optionId);
                    allOptionGroupIds.add(so.optionGroupId);
                }
            }
            if (itemInput.childItems) {
                for (const child of itemInput.childItems) {
                    if (child.selectedOptions) {
                        for (const so of child.selectedOptions) {
                            allOptionIds.add(so.optionId);
                            allOptionGroupIds.add(so.optionGroupId);
                        }
                    }
                }
            }
        }

        // Batch-fetch options and option groups for price snapshots and validation
        const [optionRows, optionGroupRows, productOptionGroupRows] = await Promise.all([
            allOptionIds.size > 0
                ? db
                      .select()
                      .from(optionsDbTable)
                      .where(and(inArray(optionsDbTable.id, [...allOptionIds]), eq(optionsDbTable.isDeleted, false)))
                : Promise.resolve([]),
            allOptionGroupIds.size > 0
                ? db
                      .select()
                      .from(optionGroupsTable)
                      .where(and(inArray(optionGroupsTable.id, [...allOptionGroupIds]), eq(optionGroupsTable.isDeleted, false)))
                : Promise.resolve([]),
            db
                .select()
                .from(optionGroupsTable)
                .where(and(inArray(optionGroupsTable.productId, [...allProductIds]), eq(optionGroupsTable.isDeleted, false))),
        ]);
        const optionById = new Map<string, any>(optionRows.map((o) => [o.id, o]));
        const optionGroupById = new Map<string, any>(optionGroupRows.map((og) => [og.id, og]));
        const optionGroupsByProductId = new Map<string, typeof productOptionGroupRows>();
        for (const group of productOptionGroupRows) {
            const rows = optionGroupsByProductId.get(group.productId) ?? [];
            rows.push(group);
            optionGroupsByProductId.set(group.productId, rows);
        }

        const validateSelectedOptions = (
            selectedOptions: Array<{ optionGroupId: string; optionId: string; price?: number | null }> | undefined,
            ownerProductId: string,
            label: string,
            enforceMinimumSelections: boolean,
        ) => {
            const countsByGroup = new Map<string, number>();

            if (selectedOptions) {
                for (const so of selectedOptions) {
                    const opt = optionById.get(so.optionId);
                    if (!opt) throw AppError.badInput(`Option ${so.optionId} not found`);

                    if (opt.optionGroupId !== so.optionGroupId) {
                        throw AppError.badInput(
                            `${label} contains option ${so.optionId} that does not belong to group ${so.optionGroupId}`,
                        );
                    }

                    const group = optionGroupById.get(so.optionGroupId);
                    if (!group) {
                        throw AppError.badInput(`${label} references unknown option group ${so.optionGroupId}`);
                    }

                    if (group.productId !== ownerProductId) {
                        throw AppError.badInput(
                            `${label} contains option group ${so.optionGroupId} that is not valid for product ${ownerProductId}`,
                        );
                    }

                    countsByGroup.set(so.optionGroupId, (countsByGroup.get(so.optionGroupId) ?? 0) + 1);
                }
            }

            const productGroups = optionGroupsByProductId.get(ownerProductId) ?? [];
            for (const group of productGroups) {
                const selectedCount = countsByGroup.get(group.id) ?? 0;
                const minSelections = Math.max(0, Number(group.minSelections ?? 0));
                const maxSelections = Number(group.maxSelections ?? 0);

                if (enforceMinimumSelections && selectedCount < minSelections) {
                    throw AppError.badInput(
                        `${label} is missing required selections for group ${group.name} (minimum ${minSelections})`,
                    );
                }

                if (maxSelections > 0 && selectedCount > maxSelections) {
                    throw AppError.badInput(
                        `${label} has too many selections for group ${group.name} (maximum ${maxSelections})`,
                    );
                }
            }
        };

        // Track order-level price breakdown
        let orderBasePrice = 0;
        let orderMarkupPrice = 0;

        for (const itemInput of input.items) {
            const product = productMap.get(itemInput.productId);
            if (!product) {
                throw AppError.notFound(`Product with ID ${itemInput.productId}`);
            }
            if (!product.isAvailable) {
                throw AppError.badInput(`Product ${product.name} is currently unavailable`);
            }

            const priceResult = priceByProductId.get(itemInput.productId);
            if (!priceResult) {
                throw AppError.notFound(`Product with ID ${itemInput.productId}`);
            }

            const finalAppliedPrice = normalizeMoney(priceResult.finalAppliedPrice);

            const basePrice = normalizeMoney(Number(product.basePrice));
            const markupPrice = product.markupPrice != null ? normalizeMoney(Number(product.markupPrice)) : null;
            const nightMarkedupPrice = product.nightMarkedupPrice != null ? normalizeMoney(Number(product.nightMarkedupPrice)) : null;
            const saleDiscountPercentage = product.saleDiscountPercentage != null ? Number(product.saleDiscountPercentage) : null;

            const discountedBasePrice = (product.isOnSale && saleDiscountPercentage != null)
                ? applyPercentageDiscount(basePrice, saleDiscountPercentage)
                : normalizeMoney(basePrice);

            const clientUnitPrice = normalizeMoney(Number(itemInput.price));
            if (!moneyEquals(clientUnitPrice, finalAppliedPrice)) {
                throw AppError.badInput(
                    `Item price mismatch for product ${itemInput.productId}: expected ${finalAppliedPrice}, received ${clientUnitPrice}`,
                );
            }

            log.debug({ finalAppliedPrice, discountedBasePrice, quantity: itemInput.quantity, productId: itemInput.productId }, 'order:item:price');

            validateSelectedOptions(itemInput.selectedOptions ?? [], product.id, `Product ${product.id}`, true);

            let optionsExtra = 0;
            if (itemInput.selectedOptions) {
                for (const so of itemInput.selectedOptions) {
                    const opt = optionById.get(so.optionId);
                    if (!opt) throw AppError.badInput(`Option ${so.optionId} not found`);

                    const expectedOptionPrice = normalizeMoney(Number(opt.extraPrice ?? 0));
                    const clientOptionPriceRaw = so.price;
                    const clientOptionPrice = clientOptionPriceRaw == null ? null : normalizeMoney(Number(clientOptionPriceRaw));

                    if (expectedOptionPrice > 0.01) {
                        if (clientOptionPrice == null) {
                            throw AppError.badInput(
                                `Missing option price for option ${so.optionId} (expected ${expectedOptionPrice})`,
                            );
                        }
                        if (!moneyEquals(clientOptionPrice, expectedOptionPrice)) {
                            throw AppError.badInput(
                                `Option price mismatch for option ${so.optionId}: expected ${expectedOptionPrice}, received ${clientOptionPrice}`,
                            );
                        }
                    } else {
                        if (clientOptionPrice != null && !moneyEquals(clientOptionPrice, 0)) {
                            throw AppError.badInput(
                                `Option price mismatch for option ${so.optionId}: expected 0, received ${clientOptionPrice}`,
                            );
                        }
                    }

                    optionsExtra = normalizeMoney(optionsExtra + expectedOptionPrice);
                }
            }

            const itemLineTotal = normalizeMoney((finalAppliedPrice + optionsExtra) * itemInput.quantity);
            calculatedItemsTotal = normalizeMoney(calculatedItemsTotal + itemLineTotal);

            const baseLineTotal = normalizeMoney((discountedBasePrice + optionsExtra) * itemInput.quantity);
            orderBasePrice = normalizeMoney(orderBasePrice + baseLineTotal);

            const productMarkup = Math.max(0, normalizeMoney(finalAppliedPrice - discountedBasePrice));
            orderMarkupPrice = normalizeMoney(orderMarkupPrice + normalizeMoney(productMarkup * itemInput.quantity));

            if (itemInput.childItems) {
                const linkedChildCounts = new Map<string, number>();
                for (const so of itemInput.selectedOptions ?? []) {
                    const opt = optionById.get(so.optionId);
                    const linkedProductId = opt?.linkedProductId;
                    if (linkedProductId) {
                        linkedChildCounts.set(linkedProductId, (linkedChildCounts.get(linkedProductId) ?? 0) + 1);
                    }
                }

                for (const child of itemInput.childItems) {
                    const childProduct = productMap.get(child.productId);
                    if (!childProduct) throw AppError.notFound(`Product with ID ${child.productId}`);
                    if (childProduct.isOffer)
                        throw AppError.badInput(`Child product ${child.productId} cannot be an offer`);

                    const remainingLinkedCount = linkedChildCounts.get(child.productId) ?? 0;
                    if (remainingLinkedCount <= 0) {
                        throw AppError.badInput(
                            `Child product ${child.productId} is not linked to a selected offer option on parent product ${product.id}`,
                        );
                    }
                    linkedChildCounts.set(child.productId, remainingLinkedCount - 1);

                    validateSelectedOptions(child.selectedOptions ?? [], childProduct.id, `Child product ${child.productId}`, false);

                    let childOptionsExtra = 0;
                    if (child.selectedOptions) {
                        for (const so of child.selectedOptions) {
                            const opt = optionById.get(so.optionId);
                            if (!opt) throw AppError.badInput(`Option ${so.optionId} not found`);

                            const expectedOptionPrice = normalizeMoney(Number(opt.extraPrice ?? 0));
                            const clientOptionPriceRaw = so.price;
                            const clientOptionPrice = clientOptionPriceRaw == null ? null : normalizeMoney(Number(clientOptionPriceRaw));

                            if (expectedOptionPrice > 0.01) {
                                if (clientOptionPrice == null) {
                                    throw AppError.badInput(
                                        `Missing option price for option ${so.optionId} (expected ${expectedOptionPrice})`,
                                    );
                                }
                                if (!moneyEquals(clientOptionPrice, expectedOptionPrice)) {
                                    throw AppError.badInput(
                                        `Option price mismatch for option ${so.optionId}: expected ${expectedOptionPrice}, received ${clientOptionPrice}`,
                                    );
                                }
                            } else {
                                if (clientOptionPrice != null && !moneyEquals(clientOptionPrice, 0)) {
                                    throw AppError.badInput(
                                        `Option price mismatch for option ${so.optionId}: expected 0, received ${clientOptionPrice}`,
                                    );
                                }
                            }

                            childOptionsExtra = normalizeMoney(childOptionsExtra + expectedOptionPrice);
                        }
                    }

                    calculatedItemsTotal = normalizeMoney(calculatedItemsTotal + normalizeMoney(childOptionsExtra * itemInput.quantity));
                    orderBasePrice = normalizeMoney(orderBasePrice + normalizeMoney(childOptionsExtra * itemInput.quantity));
                }
            }

            itemsToCreate.push({
                productId: itemInput.productId,
                quantity: itemInput.quantity,
                finalAppliedPrice,
                basePrice,
                saleDiscountPercentage,
                markupPrice,
                nightMarkedupPrice,
                notes: itemInput.notes || null,
                _unitBaseCost: normalizeMoney(discountedBasePrice + optionsExtra),
                selectedOptions: itemInput.selectedOptions ?? [],
                childItems: itemInput.childItems ?? undefined,
            });

            cartItems.push({
                productId: itemInput.productId,
                businessId: product.businessId,
                quantity: itemInput.quantity,
                price: finalAppliedPrice,
            });

            businessIds.add(product.businessId);
        }

        log.debug({ itemsTotal: calculatedItemsTotal, deliveryPrice: input.deliveryPrice }, 'order:totals');

        // 2a. Validate single-business constraint
        const businessIdList = Array.from(businessIds);
        if (businessIdList.length > 1) {
            throw AppError.businessRule(
                'All items in an order must be from the same business. Please remove items from other businesses.',
            );
        }
        const orderBusinessId = businessIdList[0];
        if (!orderBusinessId) {
            throw AppError.badInput('Order must contain at least one item');
        }

        // ── Inventory coverage check at order creation ──────────────────────
        let orderInventoryPrice = 0;
        const inventoryCoverageEntries: Array<{
            productId: string;
            orderedQty: number;
            fromStock: number;
            fromMarket: number;
            inventoryBusinessId: string;
        }> = [];
        const itemInventoryQuantities = new Map<number, number>(); // itemsToCreate index → fromStock

        const storeSettingsRow = await db
            .select({ inventoryModeEnabled: storeSettings.inventoryModeEnabled })
            .from(storeSettings)
            .where(eq(storeSettings.id, 'default'))
            .limit(1);
        const inventoryModeEnabled = storeSettingsRow[0]?.inventoryModeEnabled ?? false;

        if (inventoryModeEnabled) {
            // Resolve inventory product IDs (sourceProductId for adopted products)
            const invProductIdByProductId = new Map<string, string>();
            const sourceProductIdsToFetch = new Set<string>();
            for (const item of itemsToCreate) {
                const product = productMap.get(item.productId)!;
                const invId = product.sourceProductId ?? item.productId;
                invProductIdByProductId.set(item.productId, invId);
                if (product.sourceProductId) {
                    sourceProductIdsToFetch.add(product.sourceProductId);
                }
            }

            // Resolve source business IDs for adopted products
            const sourceBusinessIds = new Set<string>([orderBusinessId]);
            if (sourceProductIdsToFetch.size > 0) {
                const sourceProducts = await db
                    .select({ id: productsTable.id, businessId: productsTable.businessId })
                    .from(productsTable)
                    .where(inArray(productsTable.id, [...sourceProductIdsToFetch]));
                for (const sp of sourceProducts) {
                    sourceBusinessIds.add(sp.businessId);
                }
            }

            // Query personal_inventory for all relevant businesses
            const inventoryRows = await db
                .select({
                    productId: personalInventory.productId,
                    quantity: personalInventory.quantity,
                    businessId: personalInventory.businessId,
                })
                .from(personalInventory)
                .where(inArray(personalInventory.businessId, [...sourceBusinessIds]));

            const inventoryMap = new Map<string, { quantity: number; businessId: string }>();
            for (const inv of inventoryRows) {
                inventoryMap.set(inv.productId, { quantity: inv.quantity, businessId: inv.businessId });
            }

            // Aggregate ordered quantities by inventory product ID
            const orderedQtyByInvProduct = new Map<string, number>();
            for (const item of itemsToCreate) {
                const invId = invProductIdByProductId.get(item.productId)!;
                orderedQtyByInvProduct.set(invId, (orderedQtyByInvProduct.get(invId) ?? 0) + item.quantity);
            }

            // Compute coverage per inventory product
            const coverageByInvProduct = new Map<string, { fromStock: number; fromMarket: number; remaining: number; businessId: string }>();
            for (const [invId, totalQty] of orderedQtyByInvProduct) {
                const inv = inventoryMap.get(invId);
                const available = inv?.quantity ?? 0;
                const fromStock = Math.min(available, totalQty);
                const fromMarket = totalQty - fromStock;
                coverageByInvProduct.set(invId, {
                    fromStock,
                    fromMarket,
                    remaining: fromStock,
                    businessId: inv?.businessId ?? orderBusinessId,
                });
            }

            // Distribute inventory across individual items (greedy, first-come-first-served)
            for (let i = 0; i < itemsToCreate.length; i++) {
                const item = itemsToCreate[i];
                const invId = invProductIdByProductId.get(item.productId)!;
                const coverage = coverageByInvProduct.get(invId);
                if (!coverage || coverage.remaining <= 0) continue;

                const fromStock = Math.min(coverage.remaining, item.quantity);
                coverage.remaining -= fromStock;

                itemInventoryQuantities.set(i, fromStock);
                orderInventoryPrice = normalizeMoney(
                    orderInventoryPrice + normalizeMoney(item._unitBaseCost * fromStock),
                );
            }

            // Build coverage log entries (aggregated by inventory product)
            for (const [invId, totalQty] of orderedQtyByInvProduct) {
                const coverage = coverageByInvProduct.get(invId)!;
                if (coverage.fromStock > 0) {
                    inventoryCoverageEntries.push({
                        productId: invId,
                        orderedQty: totalQty,
                        fromStock: coverage.fromStock,
                        fromMarket: coverage.fromMarket,
                        inventoryBusinessId: coverage.businessId,
                    });
                }
            }

            // Adjust orderBasePrice to exclude inventory-covered portion
            orderBasePrice = normalizeMoney(orderBasePrice - orderInventoryPrice);

            log.info(
                { orderInventoryPrice, adjustedBasePrice: orderBasePrice, coverageEntries: inventoryCoverageEntries.length },
                'order:inventory:coverage',
            );
        }

        // 2b. Check that all businesses are currently open
        const now = new Date();
        const currentDay = now.getDay();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const [orderBusinesses, todayBusinessHours] = await Promise.all([
            db
                .select({
                    id: businessesTable.id,
                    name: businessesTable.name,
                    businessType: businessesTable.businessType,
                    opensAt: businessesTable.opensAt,
                    closesAt: businessesTable.closesAt,
                    minOrderAmount: businessesTable.minOrderAmount,
                })
                .from(businessesTable)
                .where(inArray(businessesTable.id, businessIdList)),
            businessIdList.length > 0
                ? db
                      .select()
                      .from(businessHoursTable)
                      .where(
                          and(
                              inArray(businessHoursTable.businessId, businessIdList),
                              eq(businessHoursTable.dayOfWeek, currentDay),
                          ),
                      )
                : Promise.resolve([]),
        ]);

        const businessesById = new Map(orderBusinesses.map((business) => [business.id, business]));

        const hoursByBusinessId = new Map<string, typeof todayBusinessHours>();
        for (const row of todayBusinessHours) {
            const rows = hoursByBusinessId.get(row.businessId);
            if (rows) {
                rows.push(row);
            } else {
                hoursByBusinessId.set(row.businessId, [row]);
            }
        }

        for (const bizId of businessIdList) {
            const biz = businessesById.get(bizId);
            if (!biz) {
                throw AppError.notFound(`Business with ID ${bizId}`);
            }

            const hoursRows = hoursByBusinessId.get(bizId) ?? [];

            if (hoursRows.length === 0) {
                const isOpenLegacy =
                    biz.closesAt <= biz.opensAt
                        ? currentMinutes >= biz.opensAt || currentMinutes < biz.closesAt
                        : currentMinutes >= biz.opensAt && currentMinutes < biz.closesAt;
                if (!isOpenLegacy) {
                    throw AppError.businessRule(`Business "${biz.name}" is currently closed.`);
                }
            } else {
                const isOpenNow = hoursRows.some((slot) => {
                    if (slot.closesAt <= slot.opensAt) {
                        return currentMinutes >= slot.opensAt || currentMinutes < slot.closesAt;
                    }
                    return currentMinutes >= slot.opensAt && currentMinutes < slot.closesAt;
                });
                if (!isOpenNow) {
                    throw AppError.businessRule(`Business "${biz.name}" is currently closed.`);
                }
            }
        }

        // 2c. Validate delivery fee against server pricing rules
        const deliveryBusinessId = cartItems[0]?.businessId;
        if (!deliveryBusinessId) {
            throw AppError.badInput('Missing business context for delivery fee calculation');
        }

        const expectedDeliveryPricePromise = this.calculateExpectedDeliveryPrice({
            businessId: deliveryBusinessId,
            dropoffLat: input.dropOffLocation.latitude,
            dropoffLng: input.dropOffLocation.longitude,
        });
        const expectedDeliveryPrice = await expectedDeliveryPricePromise;

        // Priority surcharge validation
        const serverPrioritySurchargeAmount = normalizeMoney(getPrioritySurchargeAmount());
        const priorityRequested = Boolean(input.priorityRequested);
        const clientSurcharge = normalizeMoney(Number(input.prioritySurcharge ?? 0));

        let prioritySurcharge: number;
        if (priorityRequested) {
            if (!moneyEquals(clientSurcharge, serverPrioritySurchargeAmount)) {
                throw AppError.badInput(
                    `Priority surcharge mismatch: expected ${serverPrioritySurchargeAmount}, received ${clientSurcharge}`,
                );
            }
            prioritySurcharge = serverPrioritySurchargeAmount;
        } else {
            if (clientSurcharge > 0.01) {
                throw AppError.badInput('Priority surcharge provided but priorityRequested is false');
            }
            prioritySurcharge = 0;
        }

        // 3. Apply Promotion (server-side validation)
        const promotionEngine = new PromotionEngine(this.deps.db);
        const cartContext: CartContext = {
            items: cartItems,
            subtotal: calculatedItemsTotal,
            deliveryPrice: expectedDeliveryPrice,
            businessIds: Array.from(businessIds),
        };

        let promoResult: PromotionResult;
        if (input.promotionId) {
            promoResult = await promotionEngine.applySinglePromotion(userId, input.promotionId, cartContext);
        } else {
            promoResult = {
                promotions: [],
                totalDiscount: 0,
                freeDeliveryApplied: false,
                finalSubtotal: normalizeMoney(cartContext.subtotal),
                finalDeliveryPrice: normalizeMoney(cartContext.deliveryPrice),
                finalTotal: normalizeMoney(cartContext.subtotal + cartContext.deliveryPrice),
            };
        }

        const effectiveOrderPrice = normalizeMoney(promoResult.finalSubtotal);
        const effectiveDeliveryPrice = normalizeMoney(promoResult.finalDeliveryPrice);
        const totalOrderPrice = normalizeMoney(promoResult.finalTotal);

        const clientDeliveryPrice = normalizeMoney(Number(input.deliveryPrice));
        if (!moneyEquals(clientDeliveryPrice, effectiveDeliveryPrice)) {
            throw AppError.badInput(
                `Delivery price mismatch: expected ${effectiveDeliveryPrice}, received ${clientDeliveryPrice}`,
            );
        }

        // Enforce minimum order amount
        const orderBusiness = businessesById.get(orderBusinessId);
        const minOrderAmount = Number(orderBusiness?.minOrderAmount ?? 0);
        if (minOrderAmount > 0 && effectiveOrderPrice < minOrderAmount) {
            throw AppError.badInput(
                `Minimum order amount for this business is €${minOrderAmount.toFixed(2)}. Your subtotal is €${effectiveOrderPrice.toFixed(2)}.`
            );
        }

        // Driver tip: optional, must be non-negative, not server-validated (customer's free choice)
        const driverTip = normalizeMoney(Math.max(0, Number(input.driverTip ?? 0)));

        const expectedTotalWithSurcharge = normalizeMoney(totalOrderPrice + prioritySurcharge + driverTip);
        const clientTotal = normalizeMoney(Number(input.totalPrice));
        if (!moneyEquals(clientTotal, expectedTotalWithSurcharge)) {
            throw AppError.badInput(
                `Total price mismatch: expected ${expectedTotalWithSurcharge}, received ${clientTotal}`,
            );
        }

        // 4b. Check if drop-off is outside service coverage
        const [allActiveZones, existingOrderCheck] = await Promise.all([
            this.getActiveDeliveryZones(),
            db
                .select({ id: ordersTable.id })
                .from(ordersTable)
                .where(eq(ordersTable.userId, userId))
                .limit(1),
        ]);
        const activeServiceZones = allActiveZones.filter((z) => z.isServiceZone);
        const effectiveServiceZones = activeServiceZones.length > 0 ? activeServiceZones : allActiveZones;
        const dropoffPoint = { lat: input.dropOffLocation.latitude, lng: input.dropOffLocation.longitude };
        const isDropoffInsideAnyZone = effectiveServiceZones.some((z) => isPointInPolygon(dropoffPoint, z.polygon));

        const userContextPoint = input.userContextLocation
            ? { lat: input.userContextLocation.latitude, lng: input.userContextLocation.longitude }
            : null;
        const isUserContextInsideAnyZone = userContextPoint
            ? effectiveServiceZones.some((z) => isPointInPolygon(userContextPoint, z.polygon))
            : true;

        const locationFlagged = !isDropoffInsideAnyZone || !isUserContextInsideAnyZone;

        // 4c. Determine if approval is required
        const isFirstOrder = existingOrderCheck.length === 0;
        const isHighValue = totalOrderPrice > 20;
        const approvalReasons: Array<'FIRST_ORDER' | 'HIGH_VALUE' | 'OUT_OF_ZONE'> = [];
        if (isFirstOrder) approvalReasons.push('FIRST_ORDER');
        if (isHighValue) approvalReasons.push('HIGH_VALUE');
        if (locationFlagged) approvalReasons.push('OUT_OF_ZONE');
        const requiresApproval = approvalReasons.length > 0;

        // Compute businessPrice
        let businessFundedOrderDiscount = 0;
        if (promoResult.promotions.length > 0) {
            const promoIds = promoResult.promotions.map((p) => p.id);
            const promoDbRows = promoIds.length > 0
                ? await db.select({ id: promotionsTable.id, creatorType: promotionsTable.creatorType })
                      .from(promotionsTable)
                      .where(inArray(promotionsTable.id, promoIds))
                : [];
            const promoCreatorMap = new Map(promoDbRows.map((r) => [r.id, r.creatorType]));

            for (const promo of promoResult.promotions) {
                if (!promo.freeDelivery && promoCreatorMap.get(promo.id) === 'BUSINESS') {
                    businessFundedOrderDiscount += Math.max(0, Number(promo.appliedAmount ?? 0));
                }
            }
        }
        const computedBusinessPrice = Math.max(0, Number((orderBasePrice - businessFundedOrderDiscount).toFixed(2)));

        const orderData = {
            displayId: this.generateDisplayId(),
            userId,
            businessId: orderBusinessId,
            basePrice: Number(orderBasePrice.toFixed(2)),
            markupPrice: Number(orderMarkupPrice.toFixed(2)),
            businessPrice: computedBusinessPrice,
            inventoryPrice: orderInventoryPrice > 0 ? Number(orderInventoryPrice.toFixed(2)) : null,
            actualPrice: effectiveOrderPrice,
            originalDeliveryPrice: expectedDeliveryPrice,
            deliveryPrice: effectiveDeliveryPrice,
            prioritySurcharge: prioritySurcharge,
            driverTip,
            paymentCollection: input.paymentCollection ?? 'CASH_TO_DRIVER',
            originalPrice:
                Math.abs(calculatedItemsTotal - effectiveOrderPrice) > 0.01
                    ? Number(calculatedItemsTotal.toFixed(2))
                    : undefined,
            status: (requiresApproval ? 'AWAITING_APPROVAL' : 'PENDING') as 'AWAITING_APPROVAL' | 'PENDING',
            locationFlagged,
            dropoffLat: input.dropOffLocation.latitude,
            dropoffLng: input.dropOffLocation.longitude,
            dropoffAddress: input.dropOffLocation.address,
            driverNotes: input.driverNotes || null,
        };

        const flatItems = itemsToCreate.map((item, idx) => ({
            productId: item.productId,
            quantity: item.quantity,
            finalAppliedPrice: item.finalAppliedPrice,
            basePrice: item.basePrice,
            saleDiscountPercentage: item.saleDiscountPercentage,
            markupPrice: item.markupPrice,
            nightMarkedupPrice: item.nightMarkedupPrice,
            notes: item.notes,
            inventoryQuantity: itemInventoryQuantities.get(idx) ?? 0,
        }));

        const createdOrder = await this.deps.orderRepository.create(orderData, flatItems);

        (createdOrder as any).approvalReasons = approvalReasons;

        if (!createdOrder) {
            throw AppError.businessRule(
                'Failed to create order: no items were associated or the database insert failed',
            );
        }

        // ── Write inventory coverage logs and deduct stock ──────────────────
        if (inventoryCoverageEntries.length > 0) {
            const invNow = new Date().toISOString();
            try {
                await db.transaction(async (tx) => {
                    // Write coverage logs (batch insert)
                    await tx.insert(orderCoverageLogs).values(
                        inventoryCoverageEntries.map((entry) => ({
                            orderId: createdOrder.id,
                            productId: entry.productId,
                            orderedQty: entry.orderedQty,
                            fromStock: entry.fromStock,
                            fromMarket: entry.fromMarket,
                            deducted: true,
                            deductedAt: invNow,
                        })),
                    );

                    // Batch UPDATE personal_inventory — single round-trip for all items
                    const valuesList = inventoryCoverageEntries.map(
                        (e) => sql`(${e.inventoryBusinessId}::uuid, ${e.productId}::uuid, ${e.fromStock}::int)`,
                    );
                    await tx.execute(sql`
                        UPDATE personal_inventory AS pi
                        SET quantity = GREATEST(0, pi.quantity - v.from_stock),
                            updated_at = ${invNow}
                        FROM (VALUES ${sql.join(valuesList, sql`, `)}) AS v(business_id, product_id, from_stock)
                        WHERE pi.business_id = v.business_id
                          AND pi.product_id = v.product_id
                    `);
                });

                log.info({ orderId: createdOrder.id, entries: inventoryCoverageEntries.length }, 'order:inventory:deducted');
            } catch (invError) {
                // Non-fatal: the DELIVERED handler's deductOrderStockCore is a safety net.
                // order_items.inventory_quantity is already set (in the order transaction), so
                // the fallback will use the canonical allocation — not re-derive from current stock.
                log.error({ orderId: createdOrder.id, error: invError }, 'order:inventory:deduction-failed');
            }
        }

        // Insert child items and order_item_options
        const createdItems = await db
            .select()
            .from(orderItemsTable)
            .where(and(eq(orderItemsTable.orderId, createdOrder.id), isNull(orderItemsTable.parentOrderItemId)));

        const buildTopLevelItemKey = (item: {
            productId: string;
            finalAppliedPrice: number;
            quantity: number;
            notes: string | null;
        }) => {
            const normalizedNotes = (item.notes ?? '').trim();
            return `${item.productId}::${item.finalAppliedPrice}::${item.quantity}::${normalizedNotes}`;
        };

        const createdItemsByKey = new Map<string, typeof createdItems>();
        for (const createdItem of createdItems) {
            const key = buildTopLevelItemKey({
                productId: createdItem.productId,
                finalAppliedPrice: Number(createdItem.finalAppliedPrice),
                quantity: createdItem.quantity,
                notes: createdItem.notes,
            });
            const rows = createdItemsByKey.get(key) ?? [];
            rows.push(createdItem);
            createdItemsByKey.set(key, rows);
        }

        const topLevelOrderItemOptionValues: Array<typeof orderItemOptionsTable.$inferInsert> = [];

        for (let i = 0; i < itemsToCreate.length; i++) {
            const inputItem = itemsToCreate[i];
            const key = buildTopLevelItemKey({
                productId: inputItem.productId,
                finalAppliedPrice: inputItem.finalAppliedPrice,
                quantity: inputItem.quantity,
                notes: inputItem.notes,
            });
            const bucket = createdItemsByKey.get(key) ?? [];
            const createdItem = bucket.shift();
            createdItemsByKey.set(key, bucket);
            if (!createdItem) {
                log.error(
                    {
                        orderId: createdOrder.id,
                        key,
                        productId: inputItem.productId,
                        finalAppliedPrice: inputItem.finalAppliedPrice,
                        quantity: inputItem.quantity,
                    },
                    'order:create:failed_to_match_created_item_for_options_and_children',
                );
                continue;
            }

            if (inputItem.selectedOptions && inputItem.selectedOptions.length > 0) {
                topLevelOrderItemOptionValues.push(
                    ...inputItem.selectedOptions.map((so) => ({
                        orderItemId: createdItem.id,
                        optionGroupId: so.optionGroupId,
                        optionId: so.optionId,
                        priceAtOrder: optionById.get(so.optionId)?.extraPrice ?? 0,
                    })),
                );
            }

            if (inputItem.childItems && inputItem.childItems.length > 0) {
                const childItemValues = inputItem.childItems.map((childInput) => ({
                    orderId: createdOrder.id,
                    productId: childInput.productId,
                    parentOrderItemId: createdItem.id,
                    quantity: inputItem.quantity,
                    finalAppliedPrice: 0,
                    basePrice: 0,
                    saleDiscountPercentage: null,
                    markupPrice: null,
                    nightMarkedupPrice: null,
                    notes: null,
                }));

                const insertedChildItems = await db.insert(orderItemsTable).values(childItemValues).returning();
                const childOrderItemOptionValues: Array<typeof orderItemOptionsTable.$inferInsert> = [];

                for (let childIndex = 0; childIndex < inputItem.childItems.length; childIndex++) {
                    const childInput = inputItem.childItems[childIndex];
                    const childItem = insertedChildItems[childIndex];
                    if (!childItem || !childInput.selectedOptions || childInput.selectedOptions.length === 0) {
                        continue;
                    }

                    childOrderItemOptionValues.push(
                        ...childInput.selectedOptions.map((so) => ({
                            orderItemId: childItem.id,
                            optionGroupId: so.optionGroupId,
                            optionId: so.optionId,
                            priceAtOrder: optionById.get(so.optionId)?.extraPrice ?? 0,
                        })),
                    );
                }

                if (childOrderItemOptionValues.length > 0) {
                    await db.insert(orderItemOptionsTable).values(childOrderItemOptionValues);
                }
            }
        }

        if (topLevelOrderItemOptionValues.length > 0) {
            await db.insert(orderItemOptionsTable).values(topLevelOrderItemOptionValues);
        }

        await this.userBehavior.updateUserBehaviorOnOrderCreated(userId, createdOrder.orderDate || null);

        await this.ensureUserPromoMetadata(userId);

        if (promoResult.promotions.length > 0) {
            const appliedPromotionIds = promoResult.promotions.map((promo) => promo.id);

            const perPromotionUsage = promoResult.promotions.map((promo) => ({
                promotionId: promo.id,
                discountAmount: promo.freeDelivery ? 0 : Math.max(0, Number(promo.appliedAmount ?? 0)),
                freeDeliveryApplied: Boolean(promo.freeDelivery && promoResult.freeDeliveryApplied),
            }));

            await promotionEngine.recordUsage(
                appliedPromotionIds,
                userId,
                createdOrder.id,
                promoResult.totalDiscount,
                promoResult.freeDeliveryApplied,
                promoResult.finalSubtotal,
                orderBusinessId,
                perPromotionUsage,
            );

            let deliveryDiscountRemaining = Math.max(
                0,
                normalizeMoney(Number(expectedDeliveryPrice) - Number(effectiveDeliveryPrice)),
            );
            const orderPromotionValues: Array<typeof orderPromotionsTable.$inferInsert> = [];
            for (const promo of promoResult.promotions) {
                const appliesTo = promo.freeDelivery ? 'DELIVERY' : 'PRICE';
                const discountAmount = promo.freeDelivery
                    ? (() => {
                          if (deliveryDiscountRemaining <= 0) return 0;
                          const applied = deliveryDiscountRemaining;
                          deliveryDiscountRemaining = 0;
                          return applied;
                      })()
                    : Math.max(0, Number(promo.appliedAmount ?? 0));

                if (discountAmount > 0) {
                    orderPromotionValues.push({
                        orderId: createdOrder.id,
                        promotionId: promo.id,
                        appliesTo,
                        discountAmount,
                    });
                }
            }

            if (orderPromotionValues.length > 0) {
                await db.insert(orderPromotionsTable).values(orderPromotionValues).onConflictDoNothing();
            }

            const hasFirstOrderPromo = promoResult.promotions.some((promo) => promo.target === 'FIRST_ORDER');
            if (hasFirstOrderPromo) {
                await promotionEngine.markFirstOrderUsed(userId);
            }
        }

        return this.mapping.mapToOrder(createdOrder);
    }

    async createOrderWithSideEffects(
        userId: string,
        input: CreateOrderInput,
        context: GraphQLContext,
    ): Promise<Order> {
        const order = await this.createOrder(userId, input);
        // Best-effort side effects
        try {
            await this.publishing.publishSingleUserOrder(userId, String(order.id));
            await this.publishing.publishAllOrders();
        } catch (error) {
            log.error({ err: error, userId, orderId: order.id }, 'createOrder:publish:failed');
        }

        // Fetch admin user IDs and (if applicable) business user IDs in parallel to avoid
        // sequential network round-trips to the remote DB.
        const orderBusinessIds = Array.from(
            new Set(
                (order.businesses ?? [])
                    .map((entry: any) => entry?.business?.id)
                    .filter((id: string | undefined): id is string => Boolean(id)),
            ),
        );

        const [adminRows, businessUserRows] = await Promise.all([
            this.deps.db
                .select({ id: usersTable.id })
                .from(usersTable)
                .where(and(inArray(usersTable.role, ['SUPER_ADMIN', 'ADMIN']), isNull(usersTable.deletedAt))),
            orderBusinessIds.length > 0
                ? this.deps.db
                      .select({ id: usersTable.id })
                      .from(usersTable)
                      .where(
                          and(
                              inArray(usersTable.businessId, orderBusinessIds),
                              inArray(usersTable.role, ['BUSINESS_OWNER', 'BUSINESS_EMPLOYEE']),
                              isNull(usersTable.deletedAt),
                          ),
                      )
                : Promise.resolve([]),
        ]);

        try {
            const adminUserIds = adminRows.map((row: any) => row.id);
            notifyAdminsNewOrder(context.notificationService, adminUserIds, String(order.id));
            if (order.needsApproval) {
                const approvalReasons = (order as any).approvalReasons as Array<'FIRST_ORDER' | 'HIGH_VALUE' | 'OUT_OF_ZONE'> | undefined;
                notifyAdminsOrderNeedsApproval(context.notificationService, adminUserIds, String(order.id), approvalReasons);
            }
        } catch (error) {
            log.error({ err: error, orderId: order.id }, 'createOrder:notifyAdmins:failed');
        }

        if (!order.needsApproval) {
            try {
                if (orderBusinessIds.length > 0) {
                    notifyBusinessNewOrder(
                        context.notificationService,
                        businessUserRows.map((row: any) => row.id),
                        String(order.id),
                    );
                }
            } catch (error) {
                log.error({ err: error, orderId: order.id }, 'createOrder:notifyBusiness:failed');
            }
        }

        try {
            updateLiveActivity(context.notificationService, String(order.id), 'pending', 'Your driver', 0);
        } catch (error) {
            log.error({ err: error, orderId: order.id }, 'createOrder:liveActivity:failed');
        }

        const auditLog = createAuditLogger(this.deps.db, context as any);
        await auditLog.log({
            action: 'ORDER_CREATED',
            entityType: 'ORDER',
            entityId: String(order.id),
            metadata: { orderId: String(order.id), userId, totalPrice: order.totalPrice },
        });

        try {
            const customer = await this.deps.authRepository.findById(userId);
            if (customer?.isDemoAccount) {
                await scheduleDemoOrderProgression(String(order.id), context);
            }
        } catch (error) {
            log.error({ err: error, orderId: order.id, userId }, 'createOrder:demoProgression:failed');
        }

        return order;
    }
}
