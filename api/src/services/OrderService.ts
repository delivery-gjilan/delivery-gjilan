import { randomBytes } from 'crypto';
import { OrderRepository } from '@/repositories/OrderRepository';
import { AuthRepository } from '@/repositories/AuthRepository';
import { ProductRepository } from '@/repositories/ProductRepository';
import { getDB } from '@/database';
import {
    orderItems as orderItemsTable,
    orders as ordersTable,
    products as productsTable,
    businesses as businessesTable,
    businessHours as businessHoursTable,
    deliveryPricingTiers as deliveryPricingTiersTable,
    deliveryZones as deliveryZonesTable,
    userBehaviors as userBehaviorsTable,
    orderPromotions as orderPromotionsTable,
    orderItemOptions as orderItemOptionsTable,
    optionGroups as optionGroupsTable,
    options as optionsDbTable,
} from '@/database/schema';
import { userPromoMetadata } from '@/database/schema';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Order, OrderBusiness, OrderItem, OrderStatus, CreateOrderInput, OrderPaymentCollection } from '@/generated/types.generated';
import type { DbOrder } from '@/database/schema/orders';
import { PubSub, publish, subscribe, topics } from '@/lib/pubsub';
import { GraphQLError } from 'graphql';
import { AppError } from '@/lib/errors';
import { PromotionEngine } from '@/services/PromotionEngine';
import { FinancialService } from '@/services/FinancialService';
import { calculateDrivingDistanceKm } from '@/lib/haversine';
import { isPointInPolygon } from '@/lib/pointInPolygon';
import { parseDbTimestamp } from '@/lib/dateTime';
import logger from '@/lib/logger';

const log = logger.child({ service: 'OrderService' });

export class OrderService {
    public orderRepository: OrderRepository; // Made public for resolver access

    constructor(
        orderRepository: OrderRepository,
        private authRepository: AuthRepository,
        private productRepository: ProductRepository,
        private pubsub: PubSub,
    ) {
        this.orderRepository = orderRepository;
    }

    /**
     * Generate a short, human-readable display ID like "GJ-A3F8"
     * Format: GJ-XXXX (4 alphanumeric chars, uppercase, no ambiguous chars)
     */
    private generateDisplayId(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
        const bytes = randomBytes(4);
        let id = '';
        for (let i = 0; i < 4; i++) {
            id += chars[bytes[i] % chars.length];
        }
        return `GJ-${id}`;
    }

    private async calculateExpectedDeliveryPrice(params: {
        businessId: string;
        dropoffLat: number;
        dropoffLng: number;
    }): Promise<number> {
        const db = await getDB();
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

        const zones = await db
            .select()
            .from(deliveryZonesTable)
            .where(eq(deliveryZonesTable.isActive, true))
            .orderBy(asc(deliveryZonesTable.sortOrder));

        const dropoffPoint = { lat: params.dropoffLat, lng: params.dropoffLng };
        const matchedZone = zones.find((zone) => isPointInPolygon(dropoffPoint, zone.polygon));
        if (matchedZone) {
            return matchedZone.deliveryFee;
        }

        const tiers = await db
            .select()
            .from(deliveryPricingTiersTable)
            .where(eq(deliveryPricingTiersTable.isActive, true))
            .orderBy(asc(deliveryPricingTiersTable.sortOrder), asc(deliveryPricingTiersTable.minDistanceKm));

        if (tiers.length === 0) {
            return DEFAULT_DELIVERY_PRICE;
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
            return lastTier?.price ?? DEFAULT_DELIVERY_PRICE;
        }

        return matchedTier.price;
    }

    async createOrder(userId: string, input: CreateOrderInput): Promise<Order> {
        // 1. Validate User
        const user = await this.authRepository.findById(userId);
        if (!user) {
            throw AppError.notFound('User');
        }

        if (user.signupStep !== 'COMPLETED') {
            throw AppError.businessRule('User has not completed signup process');
        }

        // 2. Validate Products and Calculate Totals (batch fetch to avoid N+1)
        // Collect all product IDs including child items
        const allProductIds = new Set<string>();
        for (const itemInput of input.items) {
            allProductIds.add(itemInput.productId);
            if (itemInput.childItems) {
                for (const child of itemInput.childItems) {
                    allProductIds.add(child.productId);
                }
            }
        }
        const allProducts = await this.productRepository.findByIds([...allProductIds]);
        const productMap = new Map(allProducts.map((p) => [p.id, p]));

        let calculatedItemsTotal = 0;
        const itemsToCreate: Array<{
            productId: string;
            quantity: number;
            finalAppliedPrice: number;
            basePrice: number;
            salePrice: number | null;
            markupPrice: number | null;
            nightMarkedupPrice: number | null;
            notes: string | null;
            selectedOptions?: Array<{ optionGroupId: string; optionId: string }>;
            childItems?: Array<{
                productId: string;
                selectedOptions: Array<{ optionGroupId: string; optionId: string }>;
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
        const db = await getDB();
        const optionRows =
            allOptionIds.size > 0
                ? await db
                      .select()
                      .from(optionsDbTable)
                      .where(inArray(optionsDbTable.id, [...allOptionIds]))
                : [];
        const optionById = new Map(optionRows.map((o) => [o.id, o]));

        const optionGroupRows =
            allOptionGroupIds.size > 0
                ? await db
                      .select()
                      .from(optionGroupsTable)
                      .where(inArray(optionGroupsTable.id, [...allOptionGroupIds]))
                : [];
        const optionGroupById = new Map(optionGroupRows.map((og) => [og.id, og]));

        const productOptionGroupRows = await db
            .select()
            .from(optionGroupsTable)
            .where(inArray(optionGroupsTable.productId, [...allProductIds]));
        const optionGroupsByProductId = new Map<string, typeof productOptionGroupRows>();
        for (const group of productOptionGroupRows) {
            const rows = optionGroupsByProductId.get(group.productId) ?? [];
            rows.push(group);
            optionGroupsByProductId.set(group.productId, rows);
        }

        const validateSelectedOptions = (
            selectedOptions: Array<{ optionGroupId: string; optionId: string }> | undefined,
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

        for (const itemInput of input.items) {
            const product = productMap.get(itemInput.productId);
            if (!product) {
                throw AppError.notFound(`Product with ID ${itemInput.productId}`);
            }
            if (!product.isAvailable) {
                throw AppError.badInput(`Product ${product.name} is currently unavailable`);
            }

            // Use DB price for security — snapshot all price fields at order time
            const basePrice = Number(product.basePrice);
            const markupPrice = product.markupPrice != null ? Number(product.markupPrice) : null;
            const nightMarkedupPrice = product.nightMarkedupPrice != null ? Number(product.nightMarkedupPrice) : null;
            const salePrice = product.salePrice != null ? Number(product.salePrice) : null;
            const isNightHours = (() => { const h = new Date().getHours(); return h >= 23 || h < 6; })();
            const finalAppliedPrice = (product.isOnSale && salePrice != null)
                ? salePrice
                : (isNightHours && nightMarkedupPrice != null)
                    ? nightMarkedupPrice
                    : (markupPrice != null)
                        ? markupPrice
                        : basePrice;
            log.debug({ finalAppliedPrice, quantity: itemInput.quantity, productId: itemInput.productId }, 'order:item:price');

            validateSelectedOptions(itemInput.selectedOptions ?? [], product.id, `Product ${product.id}`, true);

            // Calculate options extra price
            let optionsExtra = 0;
            if (itemInput.selectedOptions) {
                for (const so of itemInput.selectedOptions) {
                    const opt = optionById.get(so.optionId);
                    if (!opt) throw AppError.badInput(`Option ${so.optionId} not found`);
                    optionsExtra += opt.extraPrice;
                }
            }

            calculatedItemsTotal += (finalAppliedPrice + optionsExtra) * itemInput.quantity;

            // Also calculate child item options extra (child finalAppliedPrice is 0, but options may cost extra)
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
                            childOptionsExtra += opt.extraPrice;
                        }
                    }
                    calculatedItemsTotal += childOptionsExtra * itemInput.quantity;
                }
            }

            itemsToCreate.push({
                productId: itemInput.productId,
                quantity: itemInput.quantity,
                finalAppliedPrice,
                basePrice,
                salePrice,
                markupPrice,
                nightMarkedupPrice,
                notes: itemInput.notes || null,
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

        // 2a. Validate multi-restaurant restriction
        const businessIdList = Array.from(businessIds);

        const orderBusinesses = await db
            .select({
                id: businessesTable.id,
                name: businessesTable.name,
                businessType: businessesTable.businessType,
                opensAt: businessesTable.opensAt,
                closesAt: businessesTable.closesAt,
            })
            .from(businessesTable)
            .where(inArray(businessesTable.id, businessIdList));

        const businessesById = new Map(orderBusinesses.map((business) => [business.id, business]));

        const restaurantCount = orderBusinesses.filter((b) => b.businessType === 'RESTAURANT').length;
        if (restaurantCount > 1) {
            throw AppError.businessRule(
                'You can only order from one restaurant at a time. Please remove items from one restaurant before adding from another.',
            );
        }

        // 2b. Check that all businesses are currently open
        const now = new Date();
        const currentDay = now.getDay();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const todayBusinessHours =
            businessIdList.length > 0
                ? await db
                      .select()
                      .from(businessHoursTable)
                      .where(
                          and(
                              inArray(businessHoursTable.businessId, businessIdList),
                              eq(businessHoursTable.dayOfWeek, currentDay),
                          ),
                      )
                : [];

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

        // 2c. Validate delivery fee against server pricing rules.
        // Current order model uses one dropoff and a single delivery fee.
        // We use the first item's business as the delivery-pricing anchor,
        // consistent with current mobile checkout behavior.
        const deliveryBusinessId = cartItems[0]?.businessId;
        if (!deliveryBusinessId) {
            throw AppError.badInput('Missing business context for delivery fee calculation');
        }

        const expectedDeliveryPrice = await this.calculateExpectedDeliveryPrice({
            businessId: deliveryBusinessId,
            dropoffLat: input.dropOffLocation.latitude,
            dropoffLng: input.dropOffLocation.longitude,
        });

        if (Math.abs(expectedDeliveryPrice - input.deliveryPrice) > 0.01) {
            throw AppError.badInput(
                `Delivery price mismatch: Calculated ${expectedDeliveryPrice}, provided ${input.deliveryPrice}`,
            );
        }

        // 3. Apply PromotionEngine (server-side validation)
        const promotionEngine = new PromotionEngine(await getDB());
        const cartContext = {
            items: cartItems,
            subtotal: calculatedItemsTotal,
            deliveryPrice: input.deliveryPrice,
            businessIds: Array.from(businessIds),
        };

        const promoResult = await promotionEngine.applyPromotions(userId, cartContext, input.promoCode || undefined);

        if (input.promoCode && promoResult.promotions.length === 0) {
            throw AppError.badInput('Invalid promo code');
        }

        const effectiveOrderPrice = promoResult.finalSubtotal;
        const effectiveDeliveryPrice = promoResult.finalDeliveryPrice;
        const totalOrderPrice = promoResult.finalTotal;
        const undiscountedTotal = calculatedItemsTotal + input.deliveryPrice;

        // Verify total price matches client input (allow small float error).
        // When no explicit promoCode is supplied, we allow either:
        // 1) effective total (after auto-applied promos), or
        // 2) undiscounted total (items + delivery) for clients that don't pre-apply auto promos.
        // If no promo code is provided, tolerate a client total that matches the
        // undiscounted total because server-side auto-promotions may still apply.
        const matchesEffectiveTotal = Math.abs(totalOrderPrice - input.totalPrice) <= 0.01;
        const matchesUndiscountedTotal = Math.abs(undiscountedTotal - input.totalPrice) <= 0.01;

        if (!matchesEffectiveTotal) {
            const allowUndiscountedForAutoPromotions = !input.promoCode && matchesUndiscountedTotal;
            if (!allowUndiscountedForAutoPromotions) {
                throw AppError.badInput(`Price mismatch: Calculated ${totalOrderPrice}, provided ${input.totalPrice}`);
            }
        }

        const orderData = {
            displayId: this.generateDisplayId(),
            price: effectiveOrderPrice,
            userId,
            deliveryPrice: effectiveDeliveryPrice,
            paymentCollection: input.paymentCollection ?? 'CASH_TO_DRIVER',
            originalPrice:
                Math.abs(calculatedItemsTotal - effectiveOrderPrice) > 0.01
                    ? Number(calculatedItemsTotal.toFixed(2))
                    : undefined,
            originalDeliveryPrice:
                Math.abs(input.deliveryPrice - effectiveDeliveryPrice) > 0.01
                    ? Number(input.deliveryPrice.toFixed(2))
                    : undefined,
            status: 'PENDING' as const,
            dropoffLat: input.dropOffLocation.latitude,
            dropoffLng: input.dropOffLocation.longitude,
            dropoffAddress: input.dropOffLocation.address,
            driverNotes: input.driverNotes || null,
        };

        // Build flat items for repository (without child items — those are inserted separately)
        const flatItems = itemsToCreate.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            finalAppliedPrice: item.finalAppliedPrice,
            basePrice: item.basePrice,
            salePrice: item.salePrice,
            markupPrice: item.markupPrice,
            nightMarkedupPrice: item.nightMarkedupPrice,
            notes: item.notes,
        }));

        const createdOrder = await this.orderRepository.create(orderData, flatItems);

        if (!createdOrder) {
            throw AppError.businessRule(
                'Failed to create order: no items were associated or the database insert failed',
            );
        }

        // Now insert child items and order_item_options
        // First, fetch the created order items to get their IDs
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

        // Match created items back to input items using a queue key to avoid reusing the same row.
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

            // Insert order_item_options for this top-level item
            if (inputItem.selectedOptions && inputItem.selectedOptions.length > 0) {
                await db.insert(orderItemOptionsTable).values(
                    inputItem.selectedOptions.map((so) => ({
                        orderItemId: createdItem.id,
                        optionGroupId: so.optionGroupId,
                        optionId: so.optionId,
                        priceAtOrder: optionById.get(so.optionId)?.extraPrice ?? 0,
                    })),
                );
            }

            // Insert child items for offers
            if (inputItem.childItems && inputItem.childItems.length > 0) {
                for (const childInput of inputItem.childItems) {
                    const [childItem] = await db
                        .insert(orderItemsTable)
                        .values({
                            orderId: createdOrder.id,
                            productId: childInput.productId,
                            parentOrderItemId: createdItem.id,
                            quantity: inputItem.quantity,
                            finalAppliedPrice: 0, // child items are covered by the offer price
                            basePrice: 0,
                            salePrice: null,
                            markupPrice: null,
                            nightMarkedupPrice: null,
                            notes: null,
                        })
                        .returning();

                    // Insert order_item_options for child item
                    if (childInput.selectedOptions && childInput.selectedOptions.length > 0) {
                        await db.insert(orderItemOptionsTable).values(
                            childInput.selectedOptions.map((so) => ({
                                orderItemId: childItem.id,
                                optionGroupId: so.optionGroupId,
                                optionId: so.optionId,
                                priceAtOrder: optionById.get(so.optionId)?.extraPrice ?? 0,
                            })),
                        );
                    }
                }
            }
        }

        await this.updateUserBehaviorOnOrderCreated(userId, createdOrder.orderDate || null);

        // Ensure metadata row exists before promo updates
        await this.ensureUserPromoMetadata(userId);

        if (promoResult.promotions.length > 0) {
            const appliedPromotionIds = promoResult.promotions.map((promo) => promo.id);
            const orderBusinessId = businessIds.size === 1 ? Array.from(businessIds)[0] : null;

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

            // Store promotions in orderPromotions table
            let deliveryDiscountRemaining = Math.max(0, Number(input.deliveryPrice) - Number(effectiveDeliveryPrice));
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
                    await db
                        .insert(orderPromotionsTable)
                        .values({
                            orderId: createdOrder.id,
                            promotionId: promo.id,
                            appliesTo,
                            discountAmount,
                        })
                        .onConflictDoNothing();
                }
            }

            const hasFirstOrderPromo = promoResult.promotions.some((promo) => promo.target === 'FIRST_ORDER');
            if (hasFirstOrderPromo) {
                await promotionEngine.markFirstOrderUsed(userId);
            }
        }

        return this.mapToOrder(createdOrder);
    }

    private async ensureUserPromoMetadata(userId: string): Promise<void> {
        const db = await getDB();
        await db.insert(userPromoMetadata).values({ userId }).onConflictDoNothing();
    }

    private async mapToOrder(dbOrder: DbOrder): Promise<Order> {
        const db = await getDB();

        // Fetch all items for this order (1 query) — both top-level and children
        const allItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, dbOrder.id));

        // Batch-fetch all order_item_options for these items (1 query)
        const allItemIds = allItems.map((i) => i.id);
        const allItemOptionRows =
            allItemIds.length > 0
                ? await db
                      .select()
                      .from(orderItemOptionsTable)
                      .where(inArray(orderItemOptionsTable.orderItemId, allItemIds))
                : [];

        // Batch-fetch option groups and options for names
        const ogIds = [...new Set(allItemOptionRows.map((r) => r.optionGroupId))];
        const optIds = [...new Set(allItemOptionRows.map((r) => r.optionId))];
        const ogRows =
            ogIds.length > 0
                ? await db.select().from(optionGroupsTable).where(inArray(optionGroupsTable.id, ogIds))
                : [];
        const optRows =
            optIds.length > 0 ? await db.select().from(optionsDbTable).where(inArray(optionsDbTable.id, optIds)) : [];
        const ogNameById = new Map(ogRows.map((og) => [og.id, og.name]));
        const optNameById = new Map(optRows.map((o) => [o.id, o.name]));

        // Group item options by orderItemId
        const itemOptionsMap = new Map<string, typeof allItemOptionRows>();
        for (const row of allItemOptionRows) {
            const arr = itemOptionsMap.get(row.orderItemId) ?? [];
            arr.push(row);
            itemOptionsMap.set(row.orderItemId, arr);
        }

        // Batch-fetch all products for those items (1 query)
        const productIds = [...new Set(allItems.map((i) => i.productId))];
        const productsRows =
            productIds.length > 0
                ? await db.select().from(productsTable).where(inArray(productsTable.id, productIds))
                : [];
        const productById = new Map(productsRows.map((p) => [p.id, p]));

        // Separate top-level and child items
        const topLevelItems = allItems.filter((i) => !i.parentOrderItemId);
        const childItemsMap = new Map<string, typeof allItems>();
        for (const item of allItems) {
            if (item.parentOrderItemId) {
                const arr = childItemsMap.get(item.parentOrderItemId) ?? [];
                arr.push(item);
                childItemsMap.set(item.parentOrderItemId, arr);
            }
        }

        // Helper to build an OrderItem from a DB row
        const buildOrderItem = (item: (typeof allItems)[0]): OrderItem => {
            const product = productById.get(item.productId);

            const selectedOptions = (itemOptionsMap.get(item.id) ?? []).map((oio) => ({
                id: oio.id,
                optionGroupId: oio.optionGroupId,
                optionGroupName: ogNameById.get(oio.optionGroupId) ?? '',
                optionId: oio.optionId,
                optionName: optNameById.get(oio.optionId) ?? '',
                priceAtOrder: oio.priceAtOrder,
            }));

            const children = (childItemsMap.get(item.id) ?? []).map(buildOrderItem);

            return {
                id: item.id,
                productId: item.productId,
                name: product?.name ?? '',
                imageUrl: product?.imageUrl || undefined,
                quantity: item.quantity,
                basePrice: Number(item.basePrice),
                unitPrice: Number(item.finalAppliedPrice), // DB: finalAppliedPrice → GraphQL: unitPrice
                notes: item.notes || undefined,
                selectedOptions,
                childItems: children,
                parentOrderItemId: item.parentOrderItemId || undefined,
            };
        };

        // Build businessMap in memory — zero per-item queries
        const businessMap = new Map<string, OrderItem[]>();

        for (const item of topLevelItems) {
            const product = productById.get(item.productId);
            if (!product) continue;

            if (!businessMap.has(product.businessId)) {
                businessMap.set(product.businessId, []);
            }

            businessMap.get(product.businessId)!.push(buildOrderItem(item));
        }

        // Batch-fetch all businesses (1 query)
        const businessIds = [...businessMap.keys()];
        const businessRows =
            businessIds.length > 0
                ? await db.select().from(businessesTable).where(inArray(businessesTable.id, businessIds))
                : [];
        const businessById = new Map(businessRows.map((b) => [b.id, b]));

        const businessOrderList: OrderBusiness[] = [];

        for (const [businessId, orderItems] of businessMap) {
            const business = businessById.get(businessId);
            if (business) {
                businessOrderList.push({
                    business: {
                        id: business.id,
                        name: business.name,
                        businessType: business.businessType,
                        imageUrl: business.imageUrl || undefined,
                        isActive: business.isActive ?? true,
                        location: {
                            latitude: business.locationLat,
                            longitude: business.locationLng,
                            address: business.locationAddress,
                        },
                        workingHours: {
                            opensAt: this.minutesToTimeString(business.opensAt),
                            closesAt: this.minutesToTimeString(business.closesAt),
                        },
                        avgPrepTimeMinutes: business.avgPrepTimeMinutes,
                        commissionPercentage: Number(business.commissionPercentage),
                        createdAt: new Date(business.createdAt),
                        updatedAt: new Date(business.updatedAt),
                        isOpen: true,
                    },
                    items: orderItems,
                });
            }
        }

        const driverUser = dbOrder.driverId ? await this.authRepository.findById(dbOrder.driverId) : null;

        return {
            id: dbOrder.id,
            displayId: dbOrder.displayId,
            userId: dbOrder.userId,
            orderPrice: dbOrder.price,
            deliveryPrice: dbOrder.deliveryPrice,
            originalPrice: dbOrder.originalPrice ?? undefined,
            originalDeliveryPrice: dbOrder.originalDeliveryPrice ?? undefined,
            totalPrice: dbOrder.price + dbOrder.deliveryPrice,
            orderDate: parseDbTimestamp(dbOrder.orderDate) ?? new Date(),
            updatedAt: parseDbTimestamp(dbOrder.updatedAt) ?? new Date(),
            status: dbOrder.status as OrderStatus,
            paymentCollection: dbOrder.paymentCollection as OrderPaymentCollection,
            preparationMinutes: dbOrder.preparationMinutes ?? undefined,
            estimatedReadyAt: parseDbTimestamp(dbOrder.estimatedReadyAt) ?? undefined,
            preparingAt: parseDbTimestamp(dbOrder.preparingAt) ?? undefined,
            readyAt: parseDbTimestamp(dbOrder.readyAt) ?? undefined,
            outForDeliveryAt: parseDbTimestamp(dbOrder.outForDeliveryAt) ?? undefined,
            deliveredAt: parseDbTimestamp(dbOrder.deliveredAt) ?? undefined,
            driver: driverUser
                ? {
                      id: driverUser.id,
                      email: driverUser.email,
                      firstName: driverUser.firstName,
                      lastName: driverUser.lastName,
                      address: driverUser.address || undefined,
                      phoneNumber: driverUser.phoneNumber || undefined,
                      emailVerified: driverUser.emailVerified,
                      phoneVerified: driverUser.phoneVerified,
                      signupStep: driverUser.signupStep,
                      role: driverUser.role,
                      businessId: driverUser.businessId || undefined,
                      business: undefined,
                      adminNote: driverUser.adminNote || undefined,
                      flagColor: driverUser.flagColor || undefined,
                  }
                : undefined,
            dropOffLocation: {
                latitude: dbOrder.dropoffLat,
                longitude: dbOrder.dropoffLng,
                address: dbOrder.dropoffAddress,
            },
            driverNotes: dbOrder.driverNotes || undefined,
            businesses: businessOrderList,
        };
    }

    // Public method for resolvers to map orders after authorization
    async mapToOrderPublic(dbOrder: DbOrder): Promise<Order> {
        return this.mapToOrder(dbOrder);
    }

    private minutesToTimeString(minutes: number): string {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    async getAllOrders(limit = 500): Promise<Order[]> {
        const dbOrders = await this.orderRepository.findAll(limit);
        return Promise.all(dbOrders.map((order) => this.mapToOrder(order)));
    }

    async getUncompletedOrders(): Promise<Order[]> {
        const dbOrders = await this.orderRepository.findUncompleted();
        return Promise.all(dbOrders.map((order) => this.mapToOrder(order)));
    }

    async getOrderById(id: string): Promise<Order | null> {
        const dbOrder = await this.orderRepository.findById(id);
        if (!dbOrder) return null;
        return this.mapToOrder(dbOrder);
    }

    async getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
        const dbOrders = await this.orderRepository.findByStatus(status);
        return Promise.all(dbOrders.map((order) => this.mapToOrder(order)));
    }

    async getOrdersByUserId(userId: string, limit = 100): Promise<Order[]> {
        const dbOrders = await this.orderRepository.findByUserId(userId, limit);
        return Promise.all(dbOrders.map((order) => this.mapToOrder(order)));
    }

    async getActiveOrdersByUserId(userId: string): Promise<Order[]> {
        const dbOrders = await this.orderRepository.findActiveByUserId(userId);
        return Promise.all(dbOrders.map((order) => this.mapToOrder(order)));
    }

    async getOrdersByUserIdAndStatus(userId: string, status: OrderStatus): Promise<Order[]> {
        const dbOrders = await this.orderRepository.findByUserIdAndStatus(userId, status);
        return Promise.all(dbOrders.map((order) => this.mapToOrder(order)));
    }

    async getOrdersForDriver(driverId: string): Promise<Order[]> {
        const dbOrders = await this.orderRepository.findForDriver(driverId);
        return Promise.all(dbOrders.map((order) => this.mapToOrder(order)));
    }

    async getOrdersForDriverByStatus(driverId: string, status: OrderStatus): Promise<Order[]> {
        const dbOrders = await this.orderRepository.findForDriverByStatus(driverId, status);
        return Promise.all(dbOrders.map((order) => this.mapToOrder(order)));
    }

    // Valid order status transitions (state machine)
    private static readonly VALID_TRANSITIONS: Record<string, OrderStatus[]> = {
        PENDING: ['PREPARING', 'CANCELLED'],
        PREPARING: ['READY', 'CANCELLED'],
        READY: ['OUT_FOR_DELIVERY', 'CANCELLED'],
        OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
        DELIVERED: [],
        CANCELLED: [],
    };

    private async validateStatusTransition(orderId: string, newStatus: OrderStatus): Promise<void> {
        const order = await this.orderRepository.findById(orderId);
        if (!order) {
            throw AppError.notFound('Order');
        }
        const currentStatus = order.status as OrderStatus;
        const allowed = OrderService.VALID_TRANSITIONS[currentStatus];
        if (!allowed || !allowed.includes(newStatus)) {
            throw AppError.businessRule(`Invalid status transition: ${currentStatus} → ${newStatus}`);
        }
    }

    async updateOrderStatus(id: string, status: OrderStatus, skipValidation = false): Promise<Order> {
        if (!skipValidation) {
            await this.validateStatusTransition(id, status);
        }
        // Set timestamp based on status transition
        const timestampMap: Record<string, 'readyAt' | 'outForDeliveryAt' | 'deliveredAt'> = {
            READY: 'readyAt',
            OUT_FOR_DELIVERY: 'outForDeliveryAt',
            DELIVERED: 'deliveredAt',
        };
        const tsField = timestampMap[status];
        let updated;
        if (tsField) {
            updated = await this.orderRepository.updateStatusWithTimestamp(id, status, tsField);
        } else {
            updated = await this.orderRepository.updateStatus(id, status);
        }
        if (!updated) {
            throw AppError.notFound('Order');
        }
        return this.mapToOrder(updated);
    }

    async startPreparing(id: string, preparationMinutes: number): Promise<Order> {
        const updated = await this.orderRepository.startPreparing(id, preparationMinutes);
        if (!updated) {
            throw AppError.notFound('Order not found or not in PENDING status');
        }
        return this.mapToOrder(updated);
    }

    async updatePreparationTime(id: string, preparationMinutes: number): Promise<Order> {
        const updated = await this.orderRepository.updatePreparationTime(id, preparationMinutes);
        if (!updated) {
            throw AppError.notFound('Order not found or not in PREPARING status');
        }
        return this.mapToOrder(updated);
    }

    async updateOrderStatusWithDriver(id: string, status: OrderStatus, driverId: string): Promise<Order> {
        let updated = await this.orderRepository.updateStatusAndDriver(id, status, driverId, 'READY');
        if (!updated) {
            updated = await this.orderRepository.updateStatusAndDriver(id, status, driverId, 'PREPARING');
        }
        if (!updated) {
            throw AppError.conflict('Order already assigned or not ready');
        }
        return this.mapToOrder(updated);
    }

    async assignDriverToOrder(id: string, driverId: string | null, onlyIfUnassigned = false): Promise<Order | null> {
        const updated = await this.orderRepository.assignDriver(id, driverId, onlyIfUnassigned);
        if (!updated) {
            return null;
        }
        return this.mapToOrder(updated);
    }

    async cancelOrder(id: string): Promise<Order> {
        // Get the order to retrieve its items
        const dbOrder = await this.orderRepository.findById(id);
        if (!dbOrder) {
            throw AppError.notFound('Order');
        }

        const db = await getDB();

        const order = await this.updateOrderStatus(id, 'CANCELLED');

        // Reverse promotion usage for this cancelled order
        const promotionEngine = new PromotionEngine(db);
        await promotionEngine.reverseUsage(id, dbOrder.userId);

        // Void any pending financial settlements for this order
        const financialService = new FinancialService(db);
        await financialService.cancelOrderSettlements(id);

        await this.updateUserBehaviorOnStatusChange(
            dbOrder.userId,
            dbOrder.status as OrderStatus,
            'CANCELLED',
            dbOrder.price + dbOrder.deliveryPrice,
            dbOrder.orderDate || null,
        );
        return order;
    }

    async updateUserBehaviorOnStatusChange(
        userId: string,
        fromStatus: OrderStatus,
        toStatus: OrderStatus,
        orderTotal: number,
        orderDate: string | null,
    ): Promise<void> {
        if (fromStatus === toStatus) return;

        if (toStatus === 'DELIVERED') {
            await this.updateUserBehaviorOnDelivered(userId, orderTotal, orderDate);
            return;
        }

        if (toStatus === 'CANCELLED') {
            await this.updateUserBehaviorOnCancelled(userId, orderDate);
        }
    }

    private async updateUserBehaviorOnOrderCreated(userId: string, orderDate: string | null): Promise<void> {
        const db = await getDB();
        const orderTimestamp = orderDate || new Date().toISOString();

        await db
            .insert(userBehaviorsTable)
            .values({
                userId,
                totalOrders: 1,
                firstOrderAt: orderTimestamp,
                lastOrderAt: orderTimestamp,
            })
            .onConflictDoUpdate({
                target: userBehaviorsTable.userId,
                set: {
                    totalOrders: sql`${userBehaviorsTable.totalOrders} + 1`,
                    lastOrderAt: orderTimestamp,
                    firstOrderAt: sql`COALESCE(${userBehaviorsTable.firstOrderAt}, ${orderTimestamp})`,
                    updatedAt: sql`CURRENT_TIMESTAMP`,
                },
            });
    }

    private async updateUserBehaviorOnDelivered(
        userId: string,
        orderTotal: number,
        orderDate: string | null,
    ): Promise<void> {
        const db = await getDB();
        const orderTimestamp = orderDate || new Date().toISOString();

        await db
            .insert(userBehaviorsTable)
            .values({
                userId,
                deliveredOrders: 1,
                totalSpend: orderTotal,
                avgOrderValue: orderTotal,
                firstOrderAt: orderTimestamp,
                lastOrderAt: orderTimestamp,
                lastDeliveredAt: orderTimestamp,
            })
            .onConflictDoUpdate({
                target: userBehaviorsTable.userId,
                set: {
                    deliveredOrders: sql`${userBehaviorsTable.deliveredOrders} + 1`,
                    totalSpend: sql`${userBehaviorsTable.totalSpend} + ${orderTotal}`,
                    avgOrderValue: sql`CASE WHEN ${userBehaviorsTable.deliveredOrders} + 1 = 0 THEN 0 ELSE (${userBehaviorsTable.totalSpend} + ${orderTotal}) / (${userBehaviorsTable.deliveredOrders} + 1) END`,
                    lastDeliveredAt: orderTimestamp,
                    lastOrderAt: sql`GREATEST(COALESCE(${userBehaviorsTable.lastOrderAt}, ${orderTimestamp}), ${orderTimestamp})`,
                    firstOrderAt: sql`COALESCE(${userBehaviorsTable.firstOrderAt}, ${orderTimestamp})`,
                    updatedAt: sql`CURRENT_TIMESTAMP`,
                },
            });
    }

    private async updateUserBehaviorOnCancelled(userId: string, orderDate: string | null): Promise<void> {
        const db = await getDB();
        const orderTimestamp = orderDate || new Date().toISOString();

        await db
            .insert(userBehaviorsTable)
            .values({
                userId,
                cancelledOrders: 1,
                firstOrderAt: orderTimestamp,
                lastOrderAt: orderTimestamp,
            })
            .onConflictDoUpdate({
                target: userBehaviorsTable.userId,
                set: {
                    cancelledOrders: sql`${userBehaviorsTable.cancelledOrders} + 1`,
                    lastOrderAt: sql`GREATEST(COALESCE(${userBehaviorsTable.lastOrderAt}, ${orderTimestamp}), ${orderTimestamp})`,
                    firstOrderAt: sql`COALESCE(${userBehaviorsTable.firstOrderAt}, ${orderTimestamp})`,
                    updatedAt: sql`CURRENT_TIMESTAMP`,
                },
            });
    }

    subscribeToOrderUpdates(userId: string): ReturnType<typeof subscribe> {
        return subscribe(this.pubsub, topics.ordersByUserChanged(userId));
    }

    subscribeToAllOrders(): ReturnType<typeof subscribe> {
        return subscribe(this.pubsub, topics.allOrdersChanged());
    }

    async publishUserOrders(userId: string) {
        // Lightweight signal — client refetches on its own
        publish(this.pubsub, topics.ordersByUserChanged(userId), {
            userId,
            orders: [],
        });
    }

    async publishAllOrders() {
        // Lightweight signal — clients refetch on their own
        publish(this.pubsub, topics.allOrdersChanged(), { orders: [] });
    }

    async getUserUncompletedOrders(userId: string) {
        const userOrders = await this.orderRepository.findUncompletedOrdersByUserId(userId);
        const orders: Order[] = [];
        for (const dbOrder of userOrders) {
            const order = await this.mapToOrder(dbOrder);
            orders.push(order);
        }
        return orders;
    }

    async getOrdersByBusinessId(businessId: string): Promise<Order[]> {
        try {
            // Single query: find order IDs that contain items from this business
            const db = await getDB();
            const orderIds = await db
                .selectDistinct({ orderId: orderItemsTable.orderId })
                .from(orderItemsTable)
                .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
                .where(eq(productsTable.businessId, businessId))
                .then((rows) => rows.map((r) => r.orderId));

            if (orderIds.length === 0) return [];

            // Fetch only the matched orders
            const dbOrders = await db.query.orders.findMany({
                where: inArray(ordersTable.id, orderIds),
                orderBy: (tbl, { desc }) => [desc(tbl.createdAt)],
            });

            return Promise.all(dbOrders.map((o) => this.mapToOrder(o)));
        } catch (error) {
            log.error({ err: error, businessId }, 'order:filterByBusiness:error');
            throw error;
        }
    }

    async getOrdersByBusinessIdAndStatus(businessId: string, status: OrderStatus): Promise<Order[]> {
        try {
            const db = await getDB();
            const orderIds = await db
                .selectDistinct({ orderId: orderItemsTable.orderId })
                .from(orderItemsTable)
                .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
                .where(eq(productsTable.businessId, businessId))
                .then((rows) => rows.map((r) => r.orderId));

            if (orderIds.length === 0) return [];

            const dbOrders = await db.query.orders.findMany({
                where: (tbl, { and: andOp, eq: eqOp }) => andOp(inArray(tbl.id, orderIds), eqOp(tbl.status, status)),
                orderBy: (tbl, { desc }) => [desc(tbl.createdAt)],
            });

            return Promise.all(dbOrders.map((o) => this.mapToOrder(o)));
        } catch (error) {
            log.error({ err: error, businessId, status }, 'order:filterByBusinessAndStatus:error');
            throw error;
        }
    }

    async orderContainsBusiness(orderId: string, businessId: string): Promise<boolean> {
        try {
            // Lightweight check — single DB query, no mapToOrder
            const db = await getDB();
            const match = await db
                .select({ orderId: orderItemsTable.orderId })
                .from(orderItemsTable)
                .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
                .where(and(eq(orderItemsTable.orderId, orderId), eq(productsTable.businessId, businessId)))
                .limit(1);
            return match.length > 0;
        } catch (error) {
            log.error({ err: error, orderId, businessId }, 'order:containsBusiness:error');
            return false;
        }
    }
}

// export const orderService = new OrderService(orderRepository);
