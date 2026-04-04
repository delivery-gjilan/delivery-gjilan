import { randomBytes } from 'crypto';
import { type DbType } from '@/database';
import { OrderRepository } from '@/repositories/OrderRepository';
import { AuthRepository } from '@/repositories/AuthRepository';
import { ProductRepository } from '@/repositories/ProductRepository';
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
    users as usersTable,
    settlements as settlementsTable,
    promotions as promotionsTable,
} from '@/database/schema';
import { userPromoMetadata } from '@/database/schema';
import { and, asc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import type { Order, OrderBusiness, OrderItem, OrderStatus, CreateOrderInput, OrderPaymentCollection } from '@/generated/types.generated';
import type { DbOrder } from '@/database/schema/orders';
import { PubSub, publish, subscribe, topics } from '@/lib/pubsub';
import { AppError } from '@/lib/errors';
import { PromotionEngine } from '@/services/PromotionEngine';
import type { PromotionResult, CartContext } from '@/services/PromotionEngine';
import { PricingService } from '@/services/PricingService';
import { FinancialService } from '@/services/FinancialService';
import { applyPercentageDiscount, moneyEquals, normalizeMoney } from '@/lib/utils/money';
import { calculateDrivingDistanceKm } from '@/lib/haversine';
import { isPointInPolygon } from '@/lib/pointInPolygon';
import { parseDbTimestamp } from '@/lib/dateTime';
import logger from '@/lib/logger';
import { ApiContextInterface } from '@/graphql/context';
import type { GraphQLContext } from '@/graphql/context';
import {
    notifyCustomerOrderStatus,
    notifyAdminsNewOrder,
    notifyAdminsOrderNeedsApproval,
    notifyBusinessNewOrder,
    updateLiveActivity,
    endLiveActivity,
} from '@/services/orderNotifications';
import { getDispatchService } from '@/services/driverServices.init';
import { getLiveDriverEta } from '@/lib/driverEtaCache';
import { cache } from '@/lib/cache';
import { emitOrderEvent } from '@/repositories/OrderEventRepository';
import { createAuditLogger } from '@/services/AuditLogger';
import { getPrioritySurchargeAmount } from '@/config/prioritySurcharge';
import { scheduleDemoOrderProgression } from '@/services/DemoProgressionService';

const log = logger.child({ service: 'OrderService' });
const TRUSTED_CUSTOMER_MARKER = '[TRUSTED_CUSTOMER]';

export class OrderService {
    public orderRepository: OrderRepository; // Made public for resolver access

    constructor(
        orderRepository: OrderRepository,
        private authRepository: AuthRepository,
        private productRepository: ProductRepository,
        private pubsub: PubSub,
        private db: DbType,
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

    private isTrustedCustomer(adminNote?: string | null, flagColor?: string | null): boolean {
        const normalizedNote = String(adminNote ?? '').toUpperCase();
        const normalizedFlag = String(flagColor ?? '').toLowerCase();
        return normalizedNote.includes(TRUSTED_CUSTOMER_MARKER) || normalizedFlag === 'green';
    }

    private async calculateExpectedDeliveryPrice(params: {
        businessId: string;
        dropoffLat: number;
        dropoffLng: number;
    }): Promise<number> {
        const db = this.db;
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
        // Service zones are coverage-only and must not override delivery fee.
        const matchedZone = zones.find(
            (zone) => !zone.isServiceZone && isPointInPolygon(dropoffPoint, zone.polygon),
        );
        if (matchedZone) {
            return normalizeMoney(Number(matchedZone.deliveryFee));
        }

        const tiers = await db
            .select()
            .from(deliveryPricingTiersTable)
            .where(eq(deliveryPricingTiersTable.isActive, true))
            .orderBy(asc(deliveryPricingTiersTable.sortOrder), asc(deliveryPricingTiersTable.minDistanceKm));

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

        // Use a single timestamp for all pricing decisions (night vs day).
        const pricingTimestamp = new Date();
        const pricingService = new PricingService(this.db);
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
        const db = this.db;
        const optionRows =
            allOptionIds.size > 0
                ? await db
                      .select()
                      .from(optionsDbTable)
                      .where(inArray(optionsDbTable.id, [...allOptionIds]))
                : [];
        const optionById = new Map<string, any>(optionRows.map((o) => [o.id, o]));
        const optionGroupRows =
            allOptionGroupIds.size > 0
                ? await db
                      .select()
                      .from(optionGroupsTable)
                      .where(inArray(optionGroupsTable.id, [...allOptionGroupIds]))
                : [];
        const optionGroupById = new Map<string, any>(optionGroupRows.map((og) => [og.id, og]));

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
        // orderBasePrice  = sum of discounted business base prices + option extras (what the business earns before promos)
        // orderMarkupPrice = sum of platform markup deltas only (finalAppliedPrice − discountedBasePrice)
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

            // Server-authoritative product pricing (rounded/normalized to 2dp)
            const priceResult = priceByProductId.get(itemInput.productId);
            if (!priceResult) {
                throw AppError.notFound(`Product with ID ${itemInput.productId}`);
            }

            const finalAppliedPrice = normalizeMoney(priceResult.finalAppliedPrice);

            // Snapshot all DB price fields at order time (used downstream for auditing/settlement)
            const basePrice = normalizeMoney(Number(product.basePrice));
            const markupPrice = product.markupPrice != null ? normalizeMoney(Number(product.markupPrice)) : null;
            const nightMarkedupPrice = product.nightMarkedupPrice != null ? normalizeMoney(Number(product.nightMarkedupPrice)) : null;
            const saleDiscountPercentage = product.saleDiscountPercentage != null ? Number(product.saleDiscountPercentage) : null;

            const discountedBasePrice = (product.isOnSale && saleDiscountPercentage != null)
                ? applyPercentageDiscount(basePrice, saleDiscountPercentage)
                : normalizeMoney(basePrice);

            // ── Strict client pricing validation ──
            // The client must send the exact per-unit price the user will pay for the product
            // (after sale discount + tier selection). If they tamper with any unit price, we reject.
            const clientUnitPrice = normalizeMoney(Number(itemInput.price));
            if (!moneyEquals(clientUnitPrice, finalAppliedPrice)) {
                throw AppError.badInput(
                    `Item price mismatch for product ${itemInput.productId}: expected ${finalAppliedPrice}, received ${clientUnitPrice}`,
                );
            }

            log.debug({ finalAppliedPrice, discountedBasePrice, quantity: itemInput.quantity, productId: itemInput.productId }, 'order:item:price');

            validateSelectedOptions(itemInput.selectedOptions ?? [], product.id, `Product ${product.id}`, true);

            // Calculate + strictly validate options extra price
            let optionsExtra = 0;
            if (itemInput.selectedOptions) {
                for (const so of itemInput.selectedOptions) {
                    const opt = optionById.get(so.optionId);
                    if (!opt) throw AppError.badInput(`Option ${so.optionId} not found`);

                    const expectedOptionPrice = normalizeMoney(Number(opt.extraPrice ?? 0));
                    const clientOptionPriceRaw = so.price;
                    const clientOptionPrice = clientOptionPriceRaw == null ? null : normalizeMoney(Number(clientOptionPriceRaw));

                    // If the option costs extra, the client MUST send its price and it must match.
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
                        // Free option: tolerate missing price or 0.
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

            // Accumulate order-level price breakdown
            // orderBasePrice = discounted business base price + option extras
            // This represents what the business set as pricing (before platform markup)
            const baseLineTotal = normalizeMoney((discountedBasePrice + optionsExtra) * itemInput.quantity);
            orderBasePrice = normalizeMoney(orderBasePrice + baseLineTotal);

            // markupPrice = platform margin: difference between what customer pays and the business base
            const productMarkup = Math.max(0, normalizeMoney(finalAppliedPrice - discountedBasePrice));
            orderMarkupPrice = normalizeMoney(orderMarkupPrice + normalizeMoney(productMarkup * itemInput.quantity));

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

                    // Child option extras are charged (covered by offer), so they count into subtotal/base.
                    calculatedItemsTotal = normalizeMoney(calculatedItemsTotal + normalizeMoney(childOptionsExtra * itemInput.quantity));
                    // Child option extras count as base price for the order (no markup on child options)
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

        // 2a. Validate single-business constraint — all items must be from one business
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

        const orderBusinesses = await db
            .select({
                id: businessesTable.id,
                name: businessesTable.name,
                businessType: businessesTable.businessType,
                opensAt: businessesTable.opensAt,
                closesAt: businessesTable.closesAt,
                minOrderAmount: businessesTable.minOrderAmount,
            })
            .from(businessesTable)
            .where(inArray(businessesTable.id, businessIdList));

        const businessesById = new Map(orderBusinesses.map((business) => [business.id, business]));

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

        // ── Priority surcharge validation ──
        // The surcharge amount is server-authoritative.  The client tells us
        // whether priority was requested via `priorityRequested`.  If so the
        // surcharge must match the server constant exactly (within float tolerance).
        // If not requested the surcharge must be absent or zero.
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

        // Delivery fee is validated AFTER promotions are applied.
        // Here we only compute the authoritative base delivery fee (pre-promo) for:
        // - promo engine inputs
        // - recording delivery discounts

        // 3. Apply Promotion (server-side validation)
        const promotionEngine = new PromotionEngine(this.db);
        // Always use the server-calculated delivery price in the promo engine so
        // that promotion discounts are computed against the authoritative base fee,
        // regardless of what the client sent (which may be 0 for a free-delivery promo).
        const cartContext: CartContext = {
            items: cartItems,
            subtotal: calculatedItemsTotal,
            deliveryPrice: expectedDeliveryPrice,
            businessIds: Array.from(businessIds),
        };

        // If a promotionId was provided, validate and apply that specific promotion.
        // Otherwise, no promotion is applied (auto-apply removed from order creation).
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

        // ── Strict client pricing validation (delivery + totals) ──
        // deliveryPrice in input is the FINAL delivery fee the customer will pay (after promotions).
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

        // Verify total price matches client input (allow small float error).
        // Priority surcharge is layered on top of the promo-engine totals.
        const expectedTotalWithSurcharge = normalizeMoney(totalOrderPrice + prioritySurcharge);
        const clientTotal = normalizeMoney(Number(input.totalPrice));
        if (!moneyEquals(clientTotal, expectedTotalWithSurcharge)) {
            throw AppError.badInput(
                `Total price mismatch: expected ${expectedTotalWithSurcharge}, received ${clientTotal}`,
            );
        }

        // 4b. Check if drop-off is outside service coverage (flag for admin)
        // If dedicated service zones exist, use those; otherwise fall back to all active zones.
        const allActiveZones = await db
            .select()
            .from(deliveryZonesTable)
            .where(eq(deliveryZonesTable.isActive, true));
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

        // Flag orders when either selected drop-off or actual user context is outside coverage.
        // This keeps troll-prevention checks visible even when user overrides to an in-zone address.
        const locationFlagged = !isDropoffInsideAnyZone || !isUserContextInsideAnyZone;

        // 4c. Determine if approval is required (first order, >€20, or out-of-zone context)
        const existingOrderCheck = await db
            .select({ id: ordersTable.id })
            .from(ordersTable)
            .where(eq(ordersTable.userId, userId))
            .limit(1);
        const isFirstOrder = existingOrderCheck.length === 0;
        const isHighValue = totalOrderPrice > 20;
        const approvalReasons: Array<'FIRST_ORDER' | 'HIGH_VALUE' | 'OUT_OF_ZONE'> = [];
        if (isFirstOrder) approvalReasons.push('FIRST_ORDER');
        if (isHighValue) approvalReasons.push('HIGH_VALUE');
        if (locationFlagged) approvalReasons.push('OUT_OF_ZONE');
        const requiresApproval = approvalReasons.length > 0;

        // ── Compute businessPrice ──
        // businessPrice = orderBasePrice minus any ORDER_PRICE discounts from BUSINESS-created promos.
        // Platform-created promos don't reduce businessPrice (the platform absorbs that discount).
        let businessFundedOrderDiscount = 0;
        if (promoResult.promotions.length > 0) {
            // Fetch the promotions to check creatorType
            const promoIds = promoResult.promotions.map((p) => p.id);
            const promoDbRows = promoIds.length > 0
                ? await db.select({ id: promotionsTable.id, creatorType: promotionsTable.creatorType })
                      .from(promotionsTable)
                      .where(inArray(promotionsTable.id, promoIds))
                : [];
            const promoCreatorMap = new Map(promoDbRows.map((r) => [r.id, r.creatorType]));

            for (const promo of promoResult.promotions) {
                // Only count non-delivery (ORDER_PRICE) discounts from BUSINESS-created promotions
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
            // Price breakdown:
            // basePrice              = sum of discounted business base prices + option extras (what business set)
            // markupPrice            = platform margin delta (contextPrice − businessBasePrice, both after discount)
            // businessPrice          = basePrice minus business-funded promo ORDER_PRICE discounts
            // actualPrice            = final item price after ALL promotions (what customer pays for items)
            // originalDeliveryPrice  = server-calculated delivery fee (before promotions/waivers)
            // deliveryPrice          = final delivery fee after promotions, excluding priority surcharge
            // prioritySurcharge      = opt-in expedited delivery fee (stored and settled separately)
            basePrice: Number(orderBasePrice.toFixed(2)),
            markupPrice: Number(orderMarkupPrice.toFixed(2)),
            businessPrice: computedBusinessPrice,
            actualPrice: effectiveOrderPrice,
            originalDeliveryPrice: expectedDeliveryPrice,
            deliveryPrice: effectiveDeliveryPrice,
            prioritySurcharge: prioritySurcharge,
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

        // Build flat items for repository (without child items — those are inserted separately)
        const flatItems = itemsToCreate.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            finalAppliedPrice: item.finalAppliedPrice,
            basePrice: item.basePrice,
            saleDiscountPercentage: item.saleDiscountPercentage,
            markupPrice: item.markupPrice,
            nightMarkedupPrice: item.nightMarkedupPrice,
            notes: item.notes,
        }));

        const createdOrder = await this.orderRepository.create(orderData, flatItems);

        // Attach approval reasons for downstream side-effects/notifications (not persisted column)
        (createdOrder as any).approvalReasons = approvalReasons;

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
                            saleDiscountPercentage: null,
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
            // Delivery discounts are computed against the authoritative base delivery fee.
            let deliveryDiscountRemaining = Math.max(
                0,
                normalizeMoney(Number(expectedDeliveryPrice) - Number(effectiveDeliveryPrice)),
            );
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
        const db = this.db;
        await db.insert(userPromoMetadata).values({ userId }).onConflictDoNothing();
    }

    private async mapToOrder(dbOrder: DbOrder): Promise<Order> {
        const db = this.db;

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
        
        // Fetch order promotions (tolerate failures to avoid breaking order mapping)
        let dbPromotions: Array<typeof orderPromotionsTable.$inferSelect> = [];
        try {
            dbPromotions = await db
                .select()
                .from(orderPromotionsTable)
                .where(eq(orderPromotionsTable.orderId, dbOrder.id));
        } catch (err) {
            log.error({ err, orderId: dbOrder.id }, 'order:promotions:fetch_failed');
            dbPromotions = [];
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
                        minOrderAmount: Number(business.minOrderAmount ?? 0),
                        isFeatured: business.isFeatured ?? false,
                        featuredSortOrder: business.featuredSortOrder ?? 0,
                        createdAt: new Date(business.createdAt),
                        updatedAt: new Date(business.updatedAt),
                        isOpen: true,
                        isTemporarilyClosed: business.isTemporarilyClosed ?? false,
                        schedule: [],
                        prepTimeOverrideMinutes: (business as any).prepTimeOverrideMinutes ?? null,
                        temporaryClosureReason: (business as any).temporaryClosureReason ?? null,
                    },
                    items: orderItems,
                });
            }
        }

        const driverUser = dbOrder.driverId ? await this.authRepository.findById(dbOrder.driverId) : null;
        const [firstOrderRecord] = await this.db
            .select({ id: ordersTable.id })
            .from(ordersTable)
            .where(eq(ordersTable.userId, dbOrder.userId))
            .orderBy(asc(ordersTable.orderDate), asc(ordersTable.createdAt))
            .limit(1);
        const isFirstOrder = firstOrderRecord?.id === dbOrder.id;

        return {
            id: dbOrder.id,
            displayId: dbOrder.displayId,
            userId: dbOrder.userId,
            businessId: dbOrder.businessId,
            deliveryPrice: Number(dbOrder.deliveryPrice),
            totalPrice:
                Number(dbOrder.actualPrice) + Number(dbOrder.deliveryPrice) + Number((dbOrder as any).prioritySurcharge ?? 0),
            // Legacy backward-compat fields
            orderPrice: Number(dbOrder.actualPrice),
            originalPrice: dbOrder.originalPrice != null ? Number(dbOrder.originalPrice) : undefined,
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
            cancelledAt: parseDbTimestamp(dbOrder.cancelledAt) ?? undefined,
            cancellationReason: dbOrder.cancellationReason ?? undefined,
            adminNote: (dbOrder as any).adminNote ?? undefined,
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
                      isDemoAccount: (driverUser as any).isDemoAccount ?? false,
                      totalOrders: 0,
                      isTrustedCustomer: false,
                      isOnline: (driverUser as any).isOnline ?? false,
                      permissions: [],
                      preferredLanguage: ((driverUser as any).preferredLanguage === 'en' ? 'EN' : 'AL') as any,
                  }
                : undefined,
            dropOffLocation: {
                latitude: dbOrder.dropoffLat,
                longitude: dbOrder.dropoffLng,
                address: dbOrder.dropoffAddress,
            },
            pickupLocations: businessOrderList.map((bo) => bo.business.location),
            driverNotes: dbOrder.driverNotes || undefined,
            needsApproval: dbOrder.status === 'AWAITING_APPROVAL',
            locationFlagged: (dbOrder as any).locationFlagged ?? false,
            approvalReasons: (() => {
                // approvalReasons is not a DB column — re-derive from persisted fields
                const reasons: Array<'FIRST_ORDER' | 'HIGH_VALUE' | 'OUT_OF_ZONE'> = [];
                const locationFlagged = (dbOrder as any).locationFlagged ?? false;
                const totalPrice = Number(dbOrder.actualPrice ?? 0) + Number(dbOrder.deliveryPrice ?? 0);
                if (isFirstOrder) reasons.push('FIRST_ORDER');
                if (locationFlagged) reasons.push('OUT_OF_ZONE');
                if (totalPrice > 20) reasons.push('HIGH_VALUE');
                return reasons;
            })(),
            prioritySurcharge: Number((dbOrder as any).prioritySurcharge ?? 0),
            businesses: businessOrderList,
            orderPromotions: dbPromotions.map((p) => ({
                id: p.id,
                promotionId: p.promotionId,
                appliesTo: p.appliesTo as any,
                discountAmount: Number(p.discountAmount),
            })),
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

    async getAllOrders(limit = 500, offset = 0): Promise<Order[]> {
        const dbOrders = await this.orderRepository.findAll(limit, offset);
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

    /**
     * Returns a driver-specific financial breakdown for an order.
     * - CASH_TO_DRIVER: driver collects totalPrice from customer and must remit
     *   the platform's share (markup + priority surcharge + delivery commission).
     * - PREPAID_TO_PLATFORM: customer paid the platform directly; driver earns
     *   only the PAYABLE settlement amounts.
     * If the order is DELIVERED, actual settlement records are used for accuracy.
     * Otherwise the amounts are estimated from the order's stored price columns.
     */
    async getDriverOrderFinancials(
        orderId: string,
        driverId: string,
    ): Promise<{
        orderId: string;
        paymentCollection: OrderPaymentCollection;
        amountToCollectFromCustomer: number;
        amountToRemitToPlatform: number;
        driverNetEarnings: number;
    } | null> {
        const dbOrder = await this.orderRepository.findById(orderId);
        if (!dbOrder) return null;
        if (dbOrder.driverId !== driverId) return null;

        const paymentCollection = dbOrder.paymentCollection;
        const totalPrice =
            Number(dbOrder.actualPrice) +
            Number(dbOrder.deliveryPrice ?? 0) +
            Number((dbOrder as any).prioritySurcharge ?? 0);

        // For PREPAID orders the driver doesn't collect cash from the customer.
        const amountToCollectFromCustomer =
            paymentCollection === 'CASH_TO_DRIVER' ? totalPrice : 0;

        let amountToRemitToPlatform: number;

        if (dbOrder.status === 'DELIVERED') {
            // Use actual settled amounts: sum all DRIVER RECEIVABLE entries for this order.
            const driverSettlements = await this.db
                .select({ amount: settlementsTable.amount, direction: settlementsTable.direction })
                .from(settlementsTable)
                .where(
                    and(
                        eq(settlementsTable.orderId, orderId),
                        eq(settlementsTable.type, 'DRIVER'),
                    ),
                );

            const receivable = driverSettlements
                .filter((s) => s.direction === 'RECEIVABLE')
                .reduce((sum, s) => sum + Number(s.amount), 0);
            const payable = driverSettlements
                .filter((s) => s.direction === 'PAYABLE')
                .reduce((sum, s) => sum + Number(s.amount), 0);

            if (paymentCollection === 'CASH_TO_DRIVER') {
                amountToRemitToPlatform = receivable - payable;
            } else {
                // PREPAID: driver earns the PAYABLE settlements (platform pays driver)
                amountToRemitToPlatform = -(payable - receivable);
            }
        } else {
            // Estimate from stored order columns (pre-delivery preview).
            // markup + prioritySurcharge are known; delivery commission is approximated to 0
            // until the settlement engine runs on delivery.
            if (paymentCollection === 'CASH_TO_DRIVER') {
                amountToRemitToPlatform =
                    Number((dbOrder as any).markupPrice ?? 0) +
                    Number((dbOrder as any).prioritySurcharge ?? 0);
            } else {
                // Delivery fee share for PREPAID case is unknown pre-delivery — show 0
                amountToRemitToPlatform = 0;
            }
        }

        const driverNetEarnings = Number((amountToCollectFromCustomer - amountToRemitToPlatform).toFixed(2));

        return {
            orderId,
            paymentCollection,
            amountToCollectFromCustomer: Number(amountToCollectFromCustomer.toFixed(2)),
            amountToRemitToPlatform: Number(amountToRemitToPlatform.toFixed(2)),
            driverNetEarnings,
        };
    }

    async getOrdersByStatus(status: OrderStatus, limit = 500, offset = 0): Promise<Order[]> {
        const dbOrders = await this.orderRepository.findByStatus(status, limit, offset);
        return Promise.all(dbOrders.map((order) => this.mapToOrder(order)));
    }

    async getOrdersByUserId(userId: string, limit = 100, offset = 0): Promise<Order[]> {
        const dbOrders = await this.orderRepository.findByUserId(userId, limit, offset);
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

    async getOrdersForDriver(driverId: string, limit = 200): Promise<Order[]> {
        const dbOrders = await this.orderRepository.findForDriver(driverId, limit);
        return Promise.all(dbOrders.map((order) => this.mapToOrder(order)));
    }

    async getOrdersForDriverByStatus(driverId: string, status: OrderStatus): Promise<Order[]> {
        const dbOrders = await this.orderRepository.findForDriverByStatus(driverId, status);
        return Promise.all(dbOrders.map((order) => this.mapToOrder(order)));
    }

    // Valid order status transitions (state machine)
    // MARKET/PHARMACY orders skip PREPARING and go PENDING → READY directly.
    // Allowing READY from PENDING here covers that path while still letting
    // restaurants use PENDING → PREPARING → READY as before.
    private static readonly VALID_TRANSITIONS: Record<string, OrderStatus[]> = {
        AWAITING_APPROVAL: ['PENDING', 'CANCELLED'],
        PENDING: ['PREPARING', 'READY', 'CANCELLED'],
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

    async updateStatusWithSideEffects(id: string, status: OrderStatus, context: GraphQLContext): Promise<Order> {
        const { userData, db, notificationService, financialService } = context;
        log.info({ orderId: id, status }, 'order:updateStatusWithSideEffects');

        const role = userData?.role;
        if (!role) {
            throw AppError.unauthorized();
        }

        const currentOrder = await this.getOrderById(id);
        if (!currentOrder) {
            throw AppError.notFound('Order');
        }

        const dbOrder = await this.orderRepository.findById(id);
        if (!dbOrder) {
            throw AppError.notFound('Order');
        }

        const currentStatus = currentOrder.status;
        const isSuperAdmin = role === 'SUPER_ADMIN';
        const isDriver = role === 'DRIVER';
        const isBusinessAdmin = role === 'BUSINESS_OWNER' || role === 'BUSINESS_EMPLOYEE';
        const isCustomer = role === 'CUSTOMER';

        let order: Order;

        if (isCustomer) {
            if (currentOrder.userId !== userData.userId) {
                throw AppError.forbidden('Not authorized to update this order');
            }
            if (status !== 'DELIVERED') {
                throw AppError.businessRule('Customers can only mark orders as DELIVERED');
            }
            order = await this.updateOrderStatus(id, status, true);
        } else if (isBusinessAdmin) {
            if (!userData.businessId) {
                throw AppError.forbidden('Business admin has no business assigned');
            }
            const canAccess = await this.orderContainsBusiness(id, userData.businessId);
            if (!canAccess) {
                throw AppError.forbidden('Not authorized to update this order');
            }
            const allowed: Record<string, string[]> = {
                PENDING: ['READY', 'CANCELLED'],
                PREPARING: ['READY', 'CANCELLED'],
            };
            if (!allowed[currentStatus]?.includes(status)) {
                throw AppError.businessRule('Invalid status transition for business admin');
            }
            order = await this.updateOrderStatus(id, status);
        } else if (isDriver) {
            const allowed: Record<string, string[]> = {
                PREPARING: ['OUT_FOR_DELIVERY'],
                READY: ['OUT_FOR_DELIVERY'],
                OUT_FOR_DELIVERY: ['DELIVERED'],
            };
            if (!allowed[currentStatus]?.includes(status)) {
                throw AppError.businessRule('Invalid status transition for driver');
            }
            if (!userData.userId) {
                throw AppError.unauthorized('Driver not authenticated');
            }
            if (dbOrder.driverId && dbOrder.driverId !== userData.userId) {
                throw AppError.conflict('Order already assigned to another driver');
            }
            if (status === 'OUT_FOR_DELIVERY') {
                order = await this.updateOrderStatusWithDriver(id, status, userData.userId);
            } else {
                order = await this.updateOrderStatus(id, status);
            }
        } else if (!isSuperAdmin) {
            throw AppError.forbidden('Not authorized to update order status');
        } else {
            order = await this.updateOrderStatus(id, status, true);
        }

        // Side Effects
        if (status === 'DELIVERED' && currentStatus !== 'DELIVERED') {
            const items = await this.db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
            await financialService.createOrderSettlements(dbOrder, items, dbOrder.driverId);
        }

        await this.updateUserBehaviorOnStatusChange(
            dbOrder.userId,
            currentStatus,
            status,
            Number(dbOrder.actualPrice) + Number(dbOrder.deliveryPrice) + Number((dbOrder as any).prioritySurcharge ?? 0),
            dbOrder.orderDate || null,
        );

        await this.publishSingleUserOrder(dbOrder.userId, id);
        await this.publishAllOrders();
        notifyCustomerOrderStatus(notificationService, dbOrder.userId, id, status);

        if (status === 'READY' && currentStatus !== 'READY') {
            try {
                const dispatchService = getDispatchService();
                // Check whether an early dispatch was already scheduled or fired from
                // startPreparing.  If 'fired' → skip (drivers already notified).
                // If 'pending' → the order became ready before the timer fired; cancel
                // the timer and dispatch immediately.  If absent → legacy path (order
                // skipped PREPARING), dispatch normally.
                const earlyState = await cache.get<string>(`dispatch:early:${id}`);
                if (earlyState === 'fired') {
                    log.info({ orderId: id }, 'updateStatus:READY — early dispatch already fired, skipping');
                } else {
                    if (earlyState === 'pending') {
                        dispatchService.cancelEarlyDispatch(id);
                        log.info({ orderId: id }, 'updateStatus:READY — order ready before early timer, dispatching now');
                    }
                    await cache.set(`dispatch:early:${id}`, 'fired', 3600);
                    dispatchService.dispatchOrder(id, notificationService).catch((err) =>
                        log.error({ err, orderId: id }, 'updateStatus:dispatch:error'),
                    );
                }
            } catch (err) {
                log.warn({ err }, 'updateStatus:dispatch:serviceNotReady');
            }
        }

        // Live Activity update logic
        this.handleLiveActivityUpdate(id, status, currentStatus, dbOrder, order, context);

        // Analytics
        this.emitAnalyticsEvent(id, status, currentStatus, dbOrder, userData, isDriver, isBusinessAdmin, isSuperAdmin);

        // Audit Log
        const auditLog = createAuditLogger(db, context as any);
        await auditLog.log({
            action: 'ORDER_STATUS_CHANGED',
            entityType: 'ORDER',
            entityId: id,
            metadata: {
                orderId: id,
                oldValue: { status: currentStatus },
                newValue: { status },
                changedFields: ['status'],
            },
        });

        return order;
    }

    async approveOrderWithSideEffects(id: string, context: ApiContextInterface): Promise<Order> {
        const { userData } = context;

        const role = userData?.role;
        if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
            throw AppError.forbidden('Only admins can approve orders');
        }

        const currentOrder = await this.getOrderById(id);
        if (!currentOrder) {
            throw AppError.notFound('Order');
        }

        if (currentOrder.status !== 'AWAITING_APPROVAL') {
            throw AppError.businessRule('Order is not awaiting approval');
        }

        const order = await this.updateOrderStatus(id, 'PENDING', true);

        try {
            await this.publishSingleUserOrder(String(order.userId), String(order.id));
            await this.publishAllOrders();
        } catch (error) {
            log.error({ err: error, orderId: id }, 'approveOrder:publish:failed');
        }

        try {
            const orderBusinessIds = Array.from(
                new Set(
                    (order.businesses ?? [])
                        .map((entry) => entry?.business?.id)
                        .filter((businessId): businessId is string => Boolean(businessId)),
                ),
            );

            if (orderBusinessIds.length > 0) {
                const businessUserRows = await this.db
                    .select({ id: usersTable.id })
                    .from(usersTable)
                    .where(
                        and(
                            inArray(usersTable.businessId, orderBusinessIds),
                            inArray(usersTable.role, ['BUSINESS_OWNER', 'BUSINESS_EMPLOYEE']),
                            isNull(usersTable.deletedAt),
                        ),
                    );

                notifyBusinessNewOrder(
                    context.notificationService,
                    businessUserRows.map((row) => row.id),
                    String(order.id),
                );
            }
        } catch (error) {
            log.error({ err: error, orderId: id }, 'approveOrder:notifyBusinessNewOrder:failed');
        }

        const auditLogger = createAuditLogger(this.db, context as any);
        await auditLogger.log({
            action: 'ORDER_STATUS_CHANGED',
            entityType: 'ORDER',
            entityId: String(id),
            metadata: { orderId: String(id), adminId: userData.userId, from: 'AWAITING_APPROVAL', to: 'PENDING' },
        });

        return order;
    }

    async startPreparingWithSideEffects(
        id: string,
        preparationMinutes: number,
        context: ApiContextInterface,
    ): Promise<Order> {
        const { userData } = context;

        const role = userData?.role;
        if (!role) {
            throw AppError.unauthorized();
        }

        const isBusinessAdmin = role === 'BUSINESS_OWNER' || role === 'BUSINESS_EMPLOYEE';
        const isSuperAdmin = role === 'SUPER_ADMIN';

        if (!isBusinessAdmin && !isSuperAdmin) {
            throw AppError.forbidden('Not authorized to start preparing');
        }

        if (isBusinessAdmin) {
            if (!userData.businessId) {
                throw AppError.forbidden('Business admin has no business assigned');
            }
            const canAccess = await this.orderContainsBusiness(id, userData.businessId);
            if (!canAccess) {
                throw AppError.forbidden('Not authorized to update this order');
            }
        }

        if (preparationMinutes < 1 || preparationMinutes > 180) {
            throw AppError.badInput('Preparation time must be between 1 and 180 minutes');
        }

        const currentOrder = await this.getOrderById(id);
        if (!currentOrder) {
            throw AppError.notFound('Order');
        }

        const order = await this.startPreparing(id, preparationMinutes);
        const dbOrder = await this.orderRepository.findById(id);

        if (dbOrder) {
            await this.updateUserBehaviorOnStatusChange(
                dbOrder.userId,
                'PENDING',
                'PREPARING',
                Number(dbOrder.actualPrice) +
                    Number(dbOrder.deliveryPrice) +
                    Number((dbOrder as any).prioritySurcharge ?? 0),
                dbOrder.orderDate || null,
            );

            await this.publishSingleUserOrder(dbOrder.userId, id);
            await this.publishAllOrders();

            notifyCustomerOrderStatus(context.notificationService, dbOrder.userId, id, 'PREPARING');

            // Schedule driver dispatch to fire EARLY_DISPATCH_LEAD_MIN minutes before ready
            // so drivers have time to reach the business before the food is ready.
            try {
                const dispatchService = getDispatchService();
                dispatchService
                    .scheduleEarlyDispatch(id, preparationMinutes, context.notificationService)
                    .catch((err) => log.error({ err, orderId: id }, 'startPreparing:earlyDispatch:error'));
            } catch (err) {
                log.warn({ err }, 'startPreparing:dispatch:serviceNotReady');
            }

            emitOrderEvent({
                orderId: id,
                eventType: 'ORDER_PREPARING',
                actorType: isBusinessAdmin ? 'RESTAURANT' : 'ADMIN',
                actorId: userData?.userId,
                businessId: userData?.businessId ?? undefined,
                metadata: { preparationMinutes },
            });

            updateLiveActivity(
                context.notificationService,
                id,
                'preparing',
                'Your driver',
                preparationMinutes,
                preparationMinutes,
                parseDbTimestamp(dbOrder.preparingAt)?.getTime() ?? Date.now(),
            );

            const auditLogger = createAuditLogger(this.db, context as any);
            await auditLogger.log({
                action: 'ORDER_STATUS_CHANGED',
                entityType: 'ORDER',
                entityId: id,
                metadata: {
                    orderId: id,
                    oldValue: { status: 'PENDING' },
                    newValue: { status: 'PREPARING', preparationMinutes },
                    changedFields: ['status', 'preparationMinutes'],
                },
            });
        }

        return order;
    }

    private async handleLiveActivityUpdate(id: string, status: string, currentStatus: string, dbOrder: DbOrder, order: Order, context: ApiContextInterface) {
        const { notificationService, userData } = context;
        const statusToLiveActivityStatus: Record<string, any> = {
            PENDING: 'pending',
            PREPARING: 'preparing',
            READY: 'ready',
            OUT_FOR_DELIVERY: 'out_for_delivery',
            DELIVERED: 'delivered',
            CANCELLED: 'cancelled',
        };
        const liveActivityStatus = statusToLiveActivityStatus[status];

        if (liveActivityStatus) {
            let driverName = 'Your driver';
            if (order.driver?.firstName) {
                driverName = `${order.driver.firstName} ${order.driver.lastName || ''}`.trim();
            }

            let estimatedMinutes = 0;
            if ((status === 'PREPARING' || status === 'READY') && dbOrder.preparationMinutes) {
                estimatedMinutes = dbOrder.preparationMinutes;
            } else if (status === 'OUT_FOR_DELIVERY') {
                const driverId = dbOrder.driverId ?? userData?.userId;
                if (driverId) {
                    try {
                        const liveEta = await getLiveDriverEta(driverId);
                        if (liveEta?.remainingEtaSeconds != null && liveEta.remainingEtaSeconds > 0) {
                            estimatedMinutes = Math.ceil(liveEta.remainingEtaSeconds / 60);
                        }
                    } catch { /* fall through */ }
                }
                if (estimatedMinutes === 0) {
                    await cache.set(`cache:la-ofd-pending:${id}`, true, 300);
                }
            }

            const phaseInitialMinutes =
                status === 'PENDING'
                    ? Math.max(1, (dbOrder.preparationMinutes ?? estimatedMinutes) || 15)
                    : (status === 'PREPARING' || status === 'READY')
                        ? Math.max(1, (dbOrder.preparationMinutes ?? estimatedMinutes) || 15)
                        : status === 'OUT_FOR_DELIVERY'
                            ? Math.max(1, estimatedMinutes || 15)
                            : Math.max(1, estimatedMinutes || 1);

            const phaseStartedAt =
                status === 'PENDING'
                    ? (parseDbTimestamp(dbOrder.orderDate)?.getTime() ?? Date.now())
                    : (status === 'PREPARING' || status === 'READY')
                        ? (parseDbTimestamp(dbOrder.preparingAt)?.getTime() ?? Date.now())
                        : status === 'OUT_FOR_DELIVERY'
                            ? (parseDbTimestamp(dbOrder.outForDeliveryAt)?.getTime() ?? Date.now())
                            : Date.now();

            // Always push the Live Activity update. When OFD has no GPS ETA yet,
            // fall back to 15 minutes so the Dynamic Island transitions immediately.
            // The frontend JS-side OFD grace period will refine the ETA once GPS arrives.
            const safeEstimatedMinutes = (status === 'OUT_FOR_DELIVERY' && estimatedMinutes === 0) ? 15 : estimatedMinutes;
            updateLiveActivity(notificationService, id, liveActivityStatus, driverName, safeEstimatedMinutes, phaseInitialMinutes, phaseStartedAt);

            if (status === 'DELIVERED' || status === 'CANCELLED') {
                endLiveActivity(notificationService, id, status === 'CANCELLED' ? 'cancelled' : 'delivered');
            }
        }
    }

    private emitAnalyticsEvent(id: string, status: string, currentStatus: string, dbOrder: DbOrder, userData: any, isDriver: boolean, isBusinessAdmin: boolean, isSuperAdmin: boolean) {
        const statusToEventType: Record<string, string> = {
            READY: 'ORDER_READY',
            OUT_FOR_DELIVERY: 'ORDER_PICKED_UP',
            DELIVERED: 'ORDER_DELIVERED',
            CANCELLED: 'ORDER_CANCELLED',
        };
        const analyticsEvent = statusToEventType[status];
        if (analyticsEvent) {
            emitOrderEvent({
                orderId: id,
                eventType: analyticsEvent as any,
                actorType: isDriver ? 'DRIVER' : isBusinessAdmin ? 'RESTAURANT' : isSuperAdmin ? 'ADMIN' : 'SYSTEM',
                actorId: userData?.userId,
                driverId: isDriver ? userData?.userId : (dbOrder.driverId ?? undefined),
                metadata: { previousStatus: currentStatus },
            });
        }
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

        const db = this.db;

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
            Number(dbOrder.actualPrice) + Number(dbOrder.deliveryPrice) + Number((dbOrder as any).prioritySurcharge ?? 0),
            dbOrder.orderDate || null,
        );
        return order;
    }

    async adminCancelOrder(id: string, reason: string, settleDriver = false, settleBusiness = false): Promise<Order> {
        const dbOrder = await this.orderRepository.findById(id);
        if (!dbOrder) {
            throw AppError.notFound('Order');
        }

        if (dbOrder.status === 'CANCELLED') {
            throw AppError.businessRule('Order is already cancelled');
        }
        if (dbOrder.status === 'DELIVERED') {
            throw AppError.businessRule('Cannot cancel a delivered order');
        }

        const db = this.db;

        const updated = await this.orderRepository.cancelWithReason(id, reason);
        if (!updated) {
            throw AppError.notFound('Order');
        }

        // Reverse promotion usage
        const promotionEngine = new PromotionEngine(db);
        await promotionEngine.reverseUsage(id, dbOrder.userId);

        // Void any pending financial settlements — skip entities admin chose to honour
        const financialService = new FinancialService(db);
        if (settleDriver || settleBusiness) {
            // Create settlements as if the order was delivered, then void the ones not honoured
            const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
            await financialService.createOrderSettlements(updated, items, updated.driverId);
            if (!settleDriver) await financialService.cancelDriverSettlementsForOrder(id);
            if (!settleBusiness) await financialService.cancelBusinessSettlementsForOrder(id);
        } else {
            // Default: void any existing pending settlements (defensive noop since settlements are
            // only created on DELIVERED, but keeps invariant clean)
            await financialService.cancelOrderSettlements(id);
        }

        await this.updateUserBehaviorOnStatusChange(
            dbOrder.userId,
            dbOrder.status as OrderStatus,
            'CANCELLED',
            Number(dbOrder.actualPrice) + Number(dbOrder.deliveryPrice) + Number((dbOrder as any).prioritySurcharge ?? 0),
            dbOrder.orderDate || null,
        );

        return this.mapToOrder(updated);
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
        const db = this.db;
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
        const db = this.db;
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
        const db = this.db;
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
        const orders = await this.getUserUncompletedOrders(userId);
        publish(this.pubsub, topics.ordersByUserChanged(userId), {
            userId,
            orders,
        });
    }

    /**
     * Lightweight delta publish — fetches and publishes only the single changed
     * order instead of re-querying the full uncompleted set.  The client merges
     * the incoming order into its local cache by id.
     */
    async publishSingleUserOrder(userId: string, orderId: string) {
        const dbOrder = await this.orderRepository.findById(orderId);
        if (!dbOrder) return;
        const order = await this.mapToOrder(dbOrder);
        publish(this.pubsub, topics.ordersByUserChanged(userId), {
            userId,
            orders: [order],
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
            const db = this.db;
            const orderIds = await db
                .selectDistinct({ orderId: orderItemsTable.orderId })
                .from(orderItemsTable)
                .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
                .where(eq(productsTable.businessId, businessId))
                .then((rows) => rows.map((r) => r.orderId));

            if (orderIds.length === 0) return [];

            // Fetch only the matched orders
            const dbOrders = await db.query.orders.findMany({
                where: and(inArray(ordersTable.id, orderIds), ne(ordersTable.status, 'AWAITING_APPROVAL')),
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
            if (status === 'AWAITING_APPROVAL') {
                return [];
            }

            const db = this.db;
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
            const db = this.db;
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

    /**
     * Create an order and handle all side effects (notifications, logic, audit)
     */
    async createOrderWithSideEffects(
        userId: string,
        input: CreateOrderInput,
        context: GraphQLContext,
    ): Promise<Order> {
        const order = await this.createOrder(userId, input);
        // Best-effort side effects
        try {
            await this.publishSingleUserOrder(userId, String(order.id));
            await this.publishAllOrders();
        } catch (error) {
            log.error({ err: error, userId, orderId: order.id }, 'createOrder:publish:failed');
        }

        try {
            const adminRows = await this.db
                .select({ id: usersTable.id })
                .from(usersTable)
                .where(
                    and(
                        inArray(usersTable.role, ['SUPER_ADMIN', 'ADMIN']),
                        isNull(usersTable.deletedAt),
                    ),
                );
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
                const orderBusinessIds = Array.from(
                    new Set(
                        (order.businesses ?? [])
                            .map((entry: any) => entry?.business?.id)
                            .filter((id: string | undefined): id is string => Boolean(id)),
                    ),
                );

                if (orderBusinessIds.length > 0) {
                    const businessUserRows = await this.db
                        .select({ id: usersTable.id })
                        .from(usersTable)
                        .where(
                            and(
                                inArray(usersTable.businessId, orderBusinessIds),
                                inArray(usersTable.role, ['BUSINESS_OWNER', 'BUSINESS_EMPLOYEE']),
                                isNull(usersTable.deletedAt),
                            ),
                        );

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

        const auditLog = createAuditLogger(this.db, context as any);
        await auditLog.log({
            action: 'ORDER_CREATED',
            entityType: 'ORDER',
            entityId: String(order.id),
            metadata: { orderId: String(order.id), userId, totalPrice: order.totalPrice },
        });

        try {
            const customer = await this.authRepository.findById(userId);
            if (customer?.isDemoAccount) {
                await scheduleDemoOrderProgression(String(order.id), context);
            }
        } catch (error) {
            log.error({ err: error, orderId: order.id, userId }, 'createOrder:demoProgression:failed');
        }

        return order;
    }
}

// export const orderService = new OrderService(orderRepository);
