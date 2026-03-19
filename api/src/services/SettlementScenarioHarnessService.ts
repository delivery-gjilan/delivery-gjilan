import { randomUUID } from 'crypto';
import { DbType } from '@/database';
import {
    businesses,
    drivers,
    orderItems,
    orderPromotions,
    orders,
    productCategories,
    products,
    promotionBusinessEligibility,
    promotions,
    promotionUsage,
    settlementRules,
    settlements,
    userPromotions,
    users,
    userPromoMetadata,
} from '@/database/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { FinancialService } from '@/services/FinancialService';
import { SettlementRepository } from '@/repositories/SettlementRepository';

type Database = DbType;

type ExpectedSettlement = {
    type: 'DRIVER' | 'BUSINESS';
    direction: 'RECEIVABLE' | 'PAYABLE';
    driverId: string | null;
    businessId: string | null;
    ruleId: string | null;
    amount: number;
};

type ScenarioDefinition = {
    id: string;
    name: string;
    description: string;
    run: (service: SettlementScenarioHarnessService) => Promise<ScenarioRunResult>;
};

type ScenarioRunResult = {
    scenarioId: string;
    name: string;
    passed: boolean;
    expectedCount: number;
    actualCount: number;
    mismatches: string[];
    expectedSettlements: ExpectedSettlement[];
    actualSettlements: ExpectedSettlement[];
};

const IDS = {
    customerUserId: '00000000-0000-0000-0000-000000000101',
    driverUserId: '00000000-0000-0000-0000-000000000102',
    driverProfileId: '00000000-0000-0000-0000-000000000103',

    businessAId: '00000000-0000-0000-0000-000000000201',
    businessBId: '00000000-0000-0000-0000-000000000202',

    categoryAId: '00000000-0000-0000-0000-000000000301',
    categoryBId: '00000000-0000-0000-0000-000000000302',

    productAId: '00000000-0000-0000-0000-000000000401',
    productBId: '00000000-0000-0000-0000-000000000402',

    promoFreeDeliveryId: '00000000-0000-0000-0000-000000000501',
    promoPriceDiscountId: '00000000-0000-0000-0000-000000000502',
    promoBusinessFreeDeliveryId: '00000000-0000-0000-0000-000000000503',
    promoBusinessFullSponsorFreeDeliveryId: '00000000-0000-0000-0000-000000000504',
    promoBusinessSplitSponsorFreeDeliveryId: '00000000-0000-0000-0000-000000000505',
    promoBusinessPrepaidSponsorFreeDeliveryId: '00000000-0000-0000-0000-000000000506',

    ruleBusiness10SubtotalId: '00000000-0000-0000-0000-000000000601',
    ruleDriver80DeliveryId: '00000000-0000-0000-0000-000000000602',
    ruleDriverFreeDelivery2Id: '00000000-0000-0000-0000-000000000603',
    ruleBusinessPromoFixed15Id: '00000000-0000-0000-0000-000000000604',
    ruleDriverBusinessFreeDelivery1Id: '00000000-0000-0000-0000-000000000605',
    ruleDriver20DeliveryReceivableId: '00000000-0000-0000-0000-000000000606',
    ruleDriverBusinessFullSponsor1Id: '00000000-0000-0000-0000-000000000607',
    ruleBusinessBusinessFullSponsorRecover1Id: '00000000-0000-0000-0000-000000000608',
    ruleDriverBusinessSplitSponsor2Id: '00000000-0000-0000-0000-000000000609',
    ruleBusinessBusinessSplitSponsorRecover1Id: '00000000-0000-0000-0000-000000000610',
    ruleDriverBusinessPrepaidSponsor1Id: '00000000-0000-0000-0000-000000000611',
    ruleBusinessBusinessPrepaidSponsorRecover1Id: '00000000-0000-0000-0000-000000000612',
};

const SCENARIO_ORDER_IDS = {
    cashMarkupBasic: '00000000-0000-0000-0000-000000000701',
    prepaidMarkupNoRemittance: '00000000-0000-0000-0000-000000000702',
    cashFreeDeliveryPromo: '00000000-0000-0000-0000-000000000703',
    cashPricePromoScopedRule: '00000000-0000-0000-0000-000000000704',
    noDriverAssigned: '00000000-0000-0000-0000-000000000705',
    multiBusinessGlobalRule: '00000000-0000-0000-0000-000000000706',
    businessPromoFreeDeliveryMixedFlows: '00000000-0000-0000-0000-000000000707',
    businessPromoFreeDeliveryBusinessCoversDriver: '00000000-0000-0000-0000-000000000708',
    businessPromoFreeDeliverySplitFunding: '00000000-0000-0000-0000-000000000709',
    businessPromoFreeDeliveryPrepaidViaPlatform: '00000000-0000-0000-0000-000000000710',
} as const;

const SCENARIO_DEFINITIONS: ScenarioDefinition[] = [
    {
        id: 'cash-markup-basic',
        name: 'Cash + Markup + Driver Assigned',
        description:
            'Cash-collected order with markup: should create business commission, driver delivery share, and automatic markup remittance.',
        run: (service) => service.runCashMarkupBasic(),
    },
    {
        id: 'prepaid-markup-no-remittance',
        name: 'Prepaid + Markup + Driver Assigned',
        description:
            'Prepaid order with markup: should not create automatic driver markup remittance.',
        run: (service) => service.runPrepaidMarkupNoRemittance(),
    },
    {
        id: 'cash-free-delivery-promo',
        name: 'Cash + Free Delivery Promo',
        description:
            'Free-delivery promo should trigger promo-scoped fixed driver compensation plus markup remittance.',
        run: (service) => service.runCashFreeDeliveryPromo(),
    },
    {
        id: 'cash-price-promo-scoped-rule',
        name: 'Cash + Price Promo Scoped Rule',
        description:
            'Price promo should trigger promo-scoped business fixed settlement in addition to global rules.',
        run: (service) => service.runCashPricePromoScopedRule(),
    },
    {
        id: 'no-driver-assigned',
        name: 'No Driver Assigned',
        description:
            'No driver settlements should be created when driver is missing.',
        run: (service) => service.runNoDriverAssigned(),
    },
    {
        id: 'multi-business-global-rule',
        name: 'Multi-business Global Rule',
        description:
            'Global business rule should create one settlement per business represented in order items.',
        run: (service) => service.runMultiBusinessGlobalRule(),
    },
    {
        id: 'business-promo-free-delivery-mixed-flows',
        name: 'Business Free Delivery + Mixed Settlement Flows',
        description:
            'Business-created free-delivery promo with fixed driver compensation, business commission, driver delivery commission receivable, and markup remittance.',
        run: (service) => service.runBusinessPromoFreeDeliveryMixedFlows(),
    },
    {
        id: 'business-promo-free-delivery-business-covers-driver',
        name: 'Business Free Delivery + Business Covers Driver',
        description:
            'Business-created free-delivery promo where business reimburses platform for fixed driver compensation.',
        run: (service) => service.runBusinessPromoFreeDeliveryBusinessCoversDriver(),
    },
    {
        id: 'business-promo-free-delivery-split-funding',
        name: 'Business Free Delivery + Split Funding',
        description:
            'Business-created free-delivery promo where driver gets fixed compensation and business reimburses only part of it.',
        run: (service) => service.runBusinessPromoFreeDeliverySplitFunding(),
    },
    {
        id: 'business-promo-free-delivery-prepaid-via-platform',
        name: 'Business Free Delivery + Prepaid Via Platform',
        description:
            'Business-created free-delivery promo on prepaid collection to validate no auto markup remittance while reimbursement still applies.',
        run: (service) => service.runBusinessPromoFreeDeliveryPrepaidViaPlatform(),
    },
];

export class SettlementScenarioHarnessService {
    private financialService: FinancialService;
    private settlementRepo: SettlementRepository;

    constructor(private db: Database) {
        this.financialService = new FinancialService(this.db as any);
        this.settlementRepo = new SettlementRepository(this.db as any);
    }

    getScenarioDefinitions() {
        return SCENARIO_DEFINITIONS.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
        }));
    }

    async runHarness(scenarioIds?: string[] | null) {
        await this.seedBaseData();

        const selected = scenarioIds && scenarioIds.length > 0
            ? SCENARIO_DEFINITIONS.filter((s) => scenarioIds.includes(s.id))
            : SCENARIO_DEFINITIONS;

        const results: ScenarioRunResult[] = [];

        for (const scenario of selected) {
            const result = await scenario.run(this);
            results.push(result);
        }

        const passedCount = results.filter((r) => r.passed).length;
        return {
            passed: passedCount === results.length,
            total: results.length,
            passedCount,
            failedCount: results.length - passedCount,
            results,
        };
    }

    private async seedBaseData() {
        const allOrderIds = Object.values(SCENARIO_ORDER_IDS);

        // Clean scenario orders and generated settlements
        await this.db.delete(orderPromotions).where(inArray(orderPromotions.orderId, allOrderIds));
        await this.db.delete(orderItems).where(inArray(orderItems.orderId, allOrderIds));
        await this.db.delete(settlements).where(inArray(settlements.orderId, allOrderIds));
        await this.db.delete(orders).where(inArray(orders.id, allOrderIds));

        // Clean seeded rule/promo/product/business/user data
        await this.db.delete(settlementRules).where(inArray(settlementRules.id, [
            IDS.ruleBusiness10SubtotalId,
            IDS.ruleDriver80DeliveryId,
            IDS.ruleDriverFreeDelivery2Id,
            IDS.ruleBusinessPromoFixed15Id,
            IDS.ruleDriverBusinessFreeDelivery1Id,
            IDS.ruleDriver20DeliveryReceivableId,
            IDS.ruleDriverBusinessFullSponsor1Id,
            IDS.ruleBusinessBusinessFullSponsorRecover1Id,
            IDS.ruleDriverBusinessSplitSponsor2Id,
            IDS.ruleBusinessBusinessSplitSponsorRecover1Id,
            IDS.ruleDriverBusinessPrepaidSponsor1Id,
            IDS.ruleBusinessBusinessPrepaidSponsorRecover1Id,
        ]));

        await this.db.delete(promotionUsage).where(inArray(promotionUsage.promotionId, [
            IDS.promoFreeDeliveryId,
            IDS.promoPriceDiscountId,
            IDS.promoBusinessFreeDeliveryId,
            IDS.promoBusinessFullSponsorFreeDeliveryId,
            IDS.promoBusinessSplitSponsorFreeDeliveryId,
            IDS.promoBusinessPrepaidSponsorFreeDeliveryId,
        ]));
        await this.db.delete(userPromotions).where(inArray(userPromotions.promotionId, [
            IDS.promoFreeDeliveryId,
            IDS.promoPriceDiscountId,
            IDS.promoBusinessFreeDeliveryId,
            IDS.promoBusinessFullSponsorFreeDeliveryId,
            IDS.promoBusinessSplitSponsorFreeDeliveryId,
            IDS.promoBusinessPrepaidSponsorFreeDeliveryId,
        ]));
        await this.db.delete(promotionBusinessEligibility).where(inArray(promotionBusinessEligibility.promotionId, [
            IDS.promoFreeDeliveryId,
            IDS.promoPriceDiscountId,
            IDS.promoBusinessFreeDeliveryId,
            IDS.promoBusinessFullSponsorFreeDeliveryId,
            IDS.promoBusinessSplitSponsorFreeDeliveryId,
            IDS.promoBusinessPrepaidSponsorFreeDeliveryId,
        ]));
        await this.db.delete(promotions).where(inArray(promotions.id, [
            IDS.promoFreeDeliveryId,
            IDS.promoPriceDiscountId,
            IDS.promoBusinessFreeDeliveryId,
            IDS.promoBusinessFullSponsorFreeDeliveryId,
            IDS.promoBusinessSplitSponsorFreeDeliveryId,
            IDS.promoBusinessPrepaidSponsorFreeDeliveryId,
        ]));

        await this.db.delete(products).where(inArray(products.id, [IDS.productAId, IDS.productBId]));
        await this.db.delete(productCategories).where(inArray(productCategories.id, [IDS.categoryAId, IDS.categoryBId]));

        await this.db.delete(drivers).where(eq(drivers.id, IDS.driverProfileId));
        await this.db.delete(userPromoMetadata).where(inArray(userPromoMetadata.userId, [IDS.customerUserId, IDS.driverUserId]));
        await this.db.delete(users).where(inArray(users.id, [IDS.customerUserId, IDS.driverUserId]));
        await this.db.delete(businesses).where(inArray(businesses.id, [IDS.businessAId, IDS.businessBId]));

        const now = new Date().toISOString();

        // Seed businesses
        await this.db.insert(businesses).values([
            {
                id: IDS.businessAId,
                name: 'Scenario Business A',
                businessType: 'RESTAURANT',
                locationLat: 42.463,
                locationLng: 21.469,
                locationAddress: 'Scenario Street A',
                opensAt: 0,
                closesAt: 1439,
                commissionPercentage: '0',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.businessBId,
                name: 'Scenario Business B',
                businessType: 'MARKET',
                locationLat: 42.465,
                locationLng: 21.471,
                locationAddress: 'Scenario Street B',
                opensAt: 0,
                closesAt: 1439,
                commissionPercentage: '0',
                createdAt: now,
                updatedAt: now,
            },
        ]);

        // Seed categories
        await this.db.insert(productCategories).values([
            {
                id: IDS.categoryAId,
                businessId: IDS.businessAId,
                name: 'Scenario Category A',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.categoryBId,
                businessId: IDS.businessBId,
                name: 'Scenario Category B',
                createdAt: now,
                updatedAt: now,
            },
        ]);

        // Seed products
        await this.db.insert(products).values([
            {
                id: IDS.productAId,
                businessId: IDS.businessAId,
                categoryId: IDS.categoryAId,
                name: 'Scenario Product A',
                basePrice: 10,
                markupPrice: 15,
                nightMarkedupPrice: null,
                isOnSale: false,
                salePrice: null,
                isAvailable: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.productBId,
                businessId: IDS.businessBId,
                categoryId: IDS.categoryBId,
                name: 'Scenario Product B',
                basePrice: 20,
                markupPrice: 20,
                nightMarkedupPrice: null,
                isOnSale: false,
                salePrice: null,
                isAvailable: true,
                createdAt: now,
                updatedAt: now,
            },
        ]);

        // Seed users + driver profile
        await this.db.insert(users).values([
            {
                id: IDS.customerUserId,
                email: 'scenario-customer@example.com',
                password: 'seeded-password',
                firstName: 'Scenario',
                lastName: 'Customer',
                role: 'CUSTOMER',
                signupStep: 'COMPLETED',
                emailVerified: true,
                phoneVerified: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.driverUserId,
                email: 'scenario-driver@example.com',
                password: 'seeded-password',
                firstName: 'Scenario',
                lastName: 'Driver',
                role: 'DRIVER',
                signupStep: 'COMPLETED',
                emailVerified: true,
                phoneVerified: true,
                createdAt: now,
                updatedAt: now,
            },
        ]);

        await this.db.insert(drivers).values({
            id: IDS.driverProfileId,
            userId: IDS.driverUserId,
            commissionPercentage: '0',
            maxActiveOrders: '2',
            hasOwnVehicle: true,
            createdAt: now,
            updatedAt: now,
        });

        // Seed promotions used for rule scoping scenarios
        await this.db.insert(promotions).values([
            {
                id: IDS.promoFreeDeliveryId,
                code: 'SCENARIOFREEDELIVERY',
                name: 'Scenario Free Delivery Promo',
                type: 'FREE_DELIVERY',
                target: 'ALL_USERS',
                discountValue: 0,
                isActive: true,
                isStackable: false,
                currentGlobalUsage: 0,
                totalUsageCount: 0,
                creatorType: 'PLATFORM',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.promoPriceDiscountId,
                code: 'SCENARIOPRICEDISCOUNT',
                name: 'Scenario Price Discount Promo',
                type: 'FIXED_AMOUNT',
                target: 'ALL_USERS',
                discountValue: 3,
                isActive: true,
                isStackable: false,
                currentGlobalUsage: 0,
                totalUsageCount: 0,
                creatorType: 'PLATFORM',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.promoBusinessFreeDeliveryId,
                code: 'SCENARIOBIZFREEDELIVERY',
                name: 'Scenario Business Free Delivery Promo',
                type: 'FREE_DELIVERY',
                target: 'ALL_USERS',
                discountValue: 0,
                isActive: true,
                isStackable: false,
                currentGlobalUsage: 0,
                totalUsageCount: 0,
                creatorType: 'BUSINESS',
                creatorId: IDS.businessAId,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.promoBusinessFullSponsorFreeDeliveryId,
                code: 'SCENARIOBIZFREEDELIVERYFULL',
                name: 'Scenario Business Full Sponsor Free Delivery Promo',
                type: 'FREE_DELIVERY',
                target: 'ALL_USERS',
                discountValue: 0,
                isActive: true,
                isStackable: false,
                currentGlobalUsage: 0,
                totalUsageCount: 0,
                creatorType: 'BUSINESS',
                creatorId: IDS.businessAId,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.promoBusinessSplitSponsorFreeDeliveryId,
                code: 'SCENARIOBIZFREEDELIVERYSPLIT',
                name: 'Scenario Business Split Sponsor Free Delivery Promo',
                type: 'FREE_DELIVERY',
                target: 'ALL_USERS',
                discountValue: 0,
                isActive: true,
                isStackable: false,
                currentGlobalUsage: 0,
                totalUsageCount: 0,
                creatorType: 'BUSINESS',
                creatorId: IDS.businessAId,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.promoBusinessPrepaidSponsorFreeDeliveryId,
                code: 'SCENARIOBIZFREEDELIVERYPREPAID',
                name: 'Scenario Business Prepaid Sponsor Free Delivery Promo',
                type: 'FREE_DELIVERY',
                target: 'ALL_USERS',
                discountValue: 0,
                isActive: true,
                isStackable: false,
                currentGlobalUsage: 0,
                totalUsageCount: 0,
                creatorType: 'BUSINESS',
                creatorId: IDS.businessAId,
                createdAt: now,
                updatedAt: now,
            },
        ]);

        await this.db.insert(promotionBusinessEligibility).values([
            {
                promotionId: IDS.promoBusinessFreeDeliveryId,
                businessId: IDS.businessAId,
                createdAt: now,
            },
            {
                promotionId: IDS.promoBusinessFullSponsorFreeDeliveryId,
                businessId: IDS.businessAId,
                createdAt: now,
            },
            {
                promotionId: IDS.promoBusinessSplitSponsorFreeDeliveryId,
                businessId: IDS.businessAId,
                createdAt: now,
            },
            {
                promotionId: IDS.promoBusinessPrepaidSponsorFreeDeliveryId,
                businessId: IDS.businessAId,
                createdAt: now,
            },
        ]);

        // Seed settlement rules
        await this.db.insert(settlementRules).values([
            {
                id: IDS.ruleBusiness10SubtotalId,
                name: 'Global Business 10% Subtotal',
                entityType: 'BUSINESS',
                direction: 'RECEIVABLE',
                amountType: 'PERCENT',
                amount: '10.00',
                appliesTo: 'SUBTOTAL',
                businessId: null,
                promotionId: null,
                isActive: true,
                notes: 'Scenario seed rule',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.ruleDriver80DeliveryId,
                name: 'Global Driver 80% Delivery Fee',
                entityType: 'DRIVER',
                direction: 'PAYABLE',
                amountType: 'PERCENT',
                amount: '80.00',
                appliesTo: 'DELIVERY_FEE',
                businessId: null,
                promotionId: null,
                isActive: true,
                notes: 'Scenario seed rule',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.ruleDriverFreeDelivery2Id,
                name: 'Driver Free Delivery Compensation 2 EUR',
                entityType: 'DRIVER',
                direction: 'PAYABLE',
                amountType: 'FIXED',
                amount: '2.00',
                appliesTo: null,
                businessId: null,
                promotionId: IDS.promoFreeDeliveryId,
                isActive: true,
                notes: 'Scenario seed rule',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.ruleBusinessPromoFixed15Id,
                name: 'Business Price Promo Fixed 1.5 EUR',
                entityType: 'BUSINESS',
                direction: 'RECEIVABLE',
                amountType: 'FIXED',
                amount: '1.50',
                appliesTo: null,
                businessId: null,
                promotionId: IDS.promoPriceDiscountId,
                isActive: true,
                notes: 'Scenario seed rule',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.ruleDriverBusinessFreeDelivery1Id,
                name: 'Business Free Delivery Driver Compensation 1 EUR',
                entityType: 'DRIVER',
                direction: 'PAYABLE',
                amountType: 'FIXED',
                amount: '1.00',
                appliesTo: null,
                businessId: IDS.businessAId,
                promotionId: IDS.promoBusinessFreeDeliveryId,
                isActive: true,
                notes: 'Scenario seed rule',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.ruleDriver20DeliveryReceivableId,
                name: 'Business Free Delivery Driver 20% Delivery Fee Receivable',
                entityType: 'DRIVER',
                direction: 'RECEIVABLE',
                amountType: 'PERCENT',
                amount: '20.00',
                appliesTo: 'DELIVERY_FEE',
                businessId: null,
                promotionId: IDS.promoBusinessFreeDeliveryId,
                isActive: true,
                notes: 'Scenario seed rule',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.ruleDriverBusinessFullSponsor1Id,
                name: 'Business Full Sponsor Driver Compensation 1 EUR',
                entityType: 'DRIVER',
                direction: 'PAYABLE',
                amountType: 'FIXED',
                amount: '1.00',
                appliesTo: null,
                businessId: IDS.businessAId,
                promotionId: IDS.promoBusinessFullSponsorFreeDeliveryId,
                isActive: true,
                notes: 'Scenario seed rule',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.ruleBusinessBusinessFullSponsorRecover1Id,
                name: 'Business Full Sponsor Reimbursement 1 EUR',
                entityType: 'BUSINESS',
                direction: 'RECEIVABLE',
                amountType: 'FIXED',
                amount: '1.00',
                appliesTo: null,
                businessId: IDS.businessAId,
                promotionId: IDS.promoBusinessFullSponsorFreeDeliveryId,
                isActive: true,
                notes: 'Scenario seed rule',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.ruleDriverBusinessSplitSponsor2Id,
                name: 'Business Split Sponsor Driver Compensation 2 EUR',
                entityType: 'DRIVER',
                direction: 'PAYABLE',
                amountType: 'FIXED',
                amount: '2.00',
                appliesTo: null,
                businessId: IDS.businessAId,
                promotionId: IDS.promoBusinessSplitSponsorFreeDeliveryId,
                isActive: true,
                notes: 'Scenario seed rule',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.ruleBusinessBusinessSplitSponsorRecover1Id,
                name: 'Business Split Sponsor Reimbursement 1 EUR',
                entityType: 'BUSINESS',
                direction: 'RECEIVABLE',
                amountType: 'FIXED',
                amount: '1.00',
                appliesTo: null,
                businessId: IDS.businessAId,
                promotionId: IDS.promoBusinessSplitSponsorFreeDeliveryId,
                isActive: true,
                notes: 'Scenario seed rule',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.ruleDriverBusinessPrepaidSponsor1Id,
                name: 'Business Prepaid Sponsor Driver Compensation 1 EUR',
                entityType: 'DRIVER',
                direction: 'PAYABLE',
                amountType: 'FIXED',
                amount: '1.00',
                appliesTo: null,
                businessId: IDS.businessAId,
                promotionId: IDS.promoBusinessPrepaidSponsorFreeDeliveryId,
                isActive: true,
                notes: 'Scenario seed rule',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.ruleBusinessBusinessPrepaidSponsorRecover1Id,
                name: 'Business Prepaid Sponsor Reimbursement 1 EUR',
                entityType: 'BUSINESS',
                direction: 'RECEIVABLE',
                amountType: 'FIXED',
                amount: '1.00',
                appliesTo: null,
                businessId: IDS.businessAId,
                promotionId: IDS.promoBusinessPrepaidSponsorFreeDeliveryId,
                isActive: true,
                notes: 'Scenario seed rule',
                createdAt: now,
                updatedAt: now,
            },
        ]);
    }

    async runCashMarkupBasic(): Promise<ScenarioRunResult> {
        const { order, items } = await this.insertOrderWithItems({
            orderId: SCENARIO_ORDER_IDS.cashMarkupBasic,
            displayId: 'SCN-701',
            driverUserId: IDS.driverUserId,
            paymentCollection: 'CASH_TO_DRIVER',
            subtotal: 30,
            deliveryFee: 5,
            itemRows: [
                { productId: IDS.productAId, quantity: 2, basePrice: 10, finalAppliedPrice: 15 },
            ],
        });

        await this.financialService.createOrderSettlements(order as any, items as any, order.driverId);

        return this.evaluateScenario(
            'cash-markup-basic',
            'Cash + Markup + Driver Assigned',
            order.id,
            [
                {
                    type: 'BUSINESS',
                    direction: 'RECEIVABLE',
                    driverId: null,
                    businessId: IDS.businessAId,
                    ruleId: IDS.ruleBusiness10SubtotalId,
                    amount: 3,
                },
                {
                    type: 'DRIVER',
                    direction: 'PAYABLE',
                    driverId: IDS.driverProfileId,
                    businessId: null,
                    ruleId: IDS.ruleDriver80DeliveryId,
                    amount: 4,
                },
                {
                    type: 'DRIVER',
                    direction: 'RECEIVABLE',
                    driverId: IDS.driverProfileId,
                    businessId: null,
                    ruleId: null,
                    amount: 10,
                },
            ],
        );
    }

    async runPrepaidMarkupNoRemittance(): Promise<ScenarioRunResult> {
        const { order, items } = await this.insertOrderWithItems({
            orderId: SCENARIO_ORDER_IDS.prepaidMarkupNoRemittance,
            displayId: 'SCN-702',
            driverUserId: IDS.driverUserId,
            paymentCollection: 'PREPAID_TO_PLATFORM',
            subtotal: 30,
            deliveryFee: 5,
            itemRows: [
                { productId: IDS.productAId, quantity: 2, basePrice: 10, finalAppliedPrice: 15 },
            ],
        });

        await this.financialService.createOrderSettlements(order as any, items as any, order.driverId);

        return this.evaluateScenario(
            'prepaid-markup-no-remittance',
            'Prepaid + Markup + Driver Assigned',
            order.id,
            [
                {
                    type: 'BUSINESS',
                    direction: 'RECEIVABLE',
                    driverId: null,
                    businessId: IDS.businessAId,
                    ruleId: IDS.ruleBusiness10SubtotalId,
                    amount: 3,
                },
                {
                    type: 'DRIVER',
                    direction: 'PAYABLE',
                    driverId: IDS.driverProfileId,
                    businessId: null,
                    ruleId: IDS.ruleDriver80DeliveryId,
                    amount: 4,
                },
            ],
        );
    }

    async runCashFreeDeliveryPromo(): Promise<ScenarioRunResult> {
        const { order, items } = await this.insertOrderWithItems({
            orderId: SCENARIO_ORDER_IDS.cashFreeDeliveryPromo,
            displayId: 'SCN-703',
            driverUserId: IDS.driverUserId,
            paymentCollection: 'CASH_TO_DRIVER',
            subtotal: 30,
            deliveryFee: 0,
            itemRows: [
                { productId: IDS.productAId, quantity: 2, basePrice: 10, finalAppliedPrice: 15 },
            ],
            promoRows: [
                { promotionId: IDS.promoFreeDeliveryId, appliesTo: 'DELIVERY', discountAmount: 5 },
            ],
        });

        await this.financialService.createOrderSettlements(order as any, items as any, order.driverId);

        return this.evaluateScenario(
            'cash-free-delivery-promo',
            'Cash + Free Delivery Promo',
            order.id,
            [
                {
                    type: 'BUSINESS',
                    direction: 'RECEIVABLE',
                    driverId: null,
                    businessId: IDS.businessAId,
                    ruleId: IDS.ruleBusiness10SubtotalId,
                    amount: 3,
                },
                {
                    type: 'DRIVER',
                    direction: 'PAYABLE',
                    driverId: IDS.driverProfileId,
                    businessId: null,
                    ruleId: IDS.ruleDriverFreeDelivery2Id,
                    amount: 2,
                },
                {
                    type: 'DRIVER',
                    direction: 'RECEIVABLE',
                    driverId: IDS.driverProfileId,
                    businessId: null,
                    ruleId: null,
                    amount: 10,
                },
            ],
        );
    }

    async runCashPricePromoScopedRule(): Promise<ScenarioRunResult> {
        const { order, items } = await this.insertOrderWithItems({
            orderId: SCENARIO_ORDER_IDS.cashPricePromoScopedRule,
            displayId: 'SCN-704',
            driverUserId: IDS.driverUserId,
            paymentCollection: 'CASH_TO_DRIVER',
            subtotal: 30,
            deliveryFee: 5,
            itemRows: [
                { productId: IDS.productAId, quantity: 2, basePrice: 10, finalAppliedPrice: 15 },
            ],
            promoRows: [
                { promotionId: IDS.promoPriceDiscountId, appliesTo: 'PRICE', discountAmount: 3 },
            ],
        });

        await this.financialService.createOrderSettlements(order as any, items as any, order.driverId);

        return this.evaluateScenario(
            'cash-price-promo-scoped-rule',
            'Cash + Price Promo Scoped Rule',
            order.id,
            [
                {
                    type: 'BUSINESS',
                    direction: 'RECEIVABLE',
                    driverId: null,
                    businessId: IDS.businessAId,
                    ruleId: IDS.ruleBusiness10SubtotalId,
                    amount: 3,
                },
                {
                    type: 'BUSINESS',
                    direction: 'RECEIVABLE',
                    driverId: null,
                    businessId: IDS.businessAId,
                    ruleId: IDS.ruleBusinessPromoFixed15Id,
                    amount: 1.5,
                },
                {
                    type: 'DRIVER',
                    direction: 'PAYABLE',
                    driverId: IDS.driverProfileId,
                    businessId: null,
                    ruleId: IDS.ruleDriver80DeliveryId,
                    amount: 4,
                },
                {
                    type: 'DRIVER',
                    direction: 'RECEIVABLE',
                    driverId: IDS.driverProfileId,
                    businessId: null,
                    ruleId: null,
                    amount: 10,
                },
            ],
        );
    }

    async runNoDriverAssigned(): Promise<ScenarioRunResult> {
        const { order, items } = await this.insertOrderWithItems({
            orderId: SCENARIO_ORDER_IDS.noDriverAssigned,
            displayId: 'SCN-705',
            driverUserId: null,
            paymentCollection: 'CASH_TO_DRIVER',
            subtotal: 30,
            deliveryFee: 5,
            itemRows: [
                { productId: IDS.productAId, quantity: 2, basePrice: 10, finalAppliedPrice: 15 },
            ],
        });

        await this.financialService.createOrderSettlements(order as any, items as any, order.driverId);

        return this.evaluateScenario(
            'no-driver-assigned',
            'No Driver Assigned',
            order.id,
            [
                {
                    type: 'BUSINESS',
                    direction: 'RECEIVABLE',
                    driverId: null,
                    businessId: IDS.businessAId,
                    ruleId: IDS.ruleBusiness10SubtotalId,
                    amount: 3,
                },
            ],
        );
    }

    async runMultiBusinessGlobalRule(): Promise<ScenarioRunResult> {
        const { order, items } = await this.insertOrderWithItems({
            orderId: SCENARIO_ORDER_IDS.multiBusinessGlobalRule,
            displayId: 'SCN-706',
            driverUserId: null,
            paymentCollection: 'CASH_TO_DRIVER',
            subtotal: 35,
            deliveryFee: 5,
            itemRows: [
                { productId: IDS.productAId, quantity: 1, basePrice: 10, finalAppliedPrice: 15 },
                { productId: IDS.productBId, quantity: 1, basePrice: 20, finalAppliedPrice: 20 },
            ],
        });

        await this.financialService.createOrderSettlements(order as any, items as any, order.driverId);

        return this.evaluateScenario(
            'multi-business-global-rule',
            'Multi-business Global Rule',
            order.id,
            [
                {
                    type: 'BUSINESS',
                    direction: 'RECEIVABLE',
                    driverId: null,
                    businessId: IDS.businessAId,
                    ruleId: IDS.ruleBusiness10SubtotalId,
                    amount: 3.5,
                },
                {
                    type: 'BUSINESS',
                    direction: 'RECEIVABLE',
                    driverId: null,
                    businessId: IDS.businessBId,
                    ruleId: IDS.ruleBusiness10SubtotalId,
                    amount: 3.5,
                },
            ],
        );
    }

    async runBusinessPromoFreeDeliveryMixedFlows(): Promise<ScenarioRunResult> {
        const { order, items } = await this.insertOrderWithItems({
            orderId: SCENARIO_ORDER_IDS.businessPromoFreeDeliveryMixedFlows,
            displayId: 'SCN-707',
            driverUserId: IDS.driverUserId,
            paymentCollection: 'CASH_TO_DRIVER',
            subtotal: 30,
            deliveryFee: 5,
            itemRows: [
                { productId: IDS.productAId, quantity: 2, basePrice: 10, finalAppliedPrice: 15 },
            ],
            promoRows: [
                { promotionId: IDS.promoBusinessFreeDeliveryId, appliesTo: 'DELIVERY', discountAmount: 5 },
            ],
        });

        await this.financialService.createOrderSettlements(order as any, items as any, order.driverId);

        return this.evaluateScenario(
            'business-promo-free-delivery-mixed-flows',
            'Business Free Delivery + Mixed Settlement Flows',
            order.id,
            [
                {
                    type: 'BUSINESS',
                    direction: 'RECEIVABLE',
                    driverId: null,
                    businessId: IDS.businessAId,
                    ruleId: IDS.ruleBusiness10SubtotalId,
                    amount: 3,
                },
                {
                    type: 'DRIVER',
                    direction: 'PAYABLE',
                    driverId: IDS.driverProfileId,
                    businessId: null,
                    ruleId: IDS.ruleDriver80DeliveryId,
                    amount: 4,
                },
                {
                    type: 'DRIVER',
                    direction: 'PAYABLE',
                    driverId: IDS.driverProfileId,
                    businessId: null,
                    ruleId: IDS.ruleDriverBusinessFreeDelivery1Id,
                    amount: 1,
                },
                {
                    type: 'DRIVER',
                    direction: 'RECEIVABLE',
                    driverId: IDS.driverProfileId,
                    businessId: null,
                    ruleId: IDS.ruleDriver20DeliveryReceivableId,
                    amount: 1,
                },
                {
                    type: 'DRIVER',
                    direction: 'RECEIVABLE',
                    driverId: IDS.driverProfileId,
                    businessId: null,
                    ruleId: null,
                    amount: 10,
                },
            ],
        );
    }

    async runBusinessPromoFreeDeliveryBusinessCoversDriver(): Promise<ScenarioRunResult> {
        const { order, items } = await this.insertOrderWithItems({
            orderId: SCENARIO_ORDER_IDS.businessPromoFreeDeliveryBusinessCoversDriver,
            displayId: 'SCN-708',
            driverUserId: IDS.driverUserId,
            paymentCollection: 'CASH_TO_DRIVER',
            subtotal: 30,
            deliveryFee: 5,
            itemRows: [
                { productId: IDS.productAId, quantity: 2, basePrice: 10, finalAppliedPrice: 15 },
            ],
            promoRows: [
                { promotionId: IDS.promoBusinessFullSponsorFreeDeliveryId, appliesTo: 'DELIVERY', discountAmount: 5 },
            ],
        });

        await this.financialService.createOrderSettlements(order as any, items as any, order.driverId);

        return this.evaluateScenario(
            'business-promo-free-delivery-business-covers-driver',
            'Business Free Delivery + Business Covers Driver',
            order.id,
            [
                {
                    type: 'BUSINESS',
                    direction: 'RECEIVABLE',
                    driverId: null,
                    businessId: IDS.businessAId,
                    ruleId: IDS.ruleBusiness10SubtotalId,
                    amount: 3,
                },
                {
                    type: 'BUSINESS',
                    direction: 'RECEIVABLE',
                    driverId: null,
                    businessId: IDS.businessAId,
                    ruleId: IDS.ruleBusinessBusinessFullSponsorRecover1Id,
                    amount: 1,
                },
                {
                    type: 'DRIVER',
                    direction: 'PAYABLE',
                    driverId: IDS.driverProfileId,
                    businessId: null,
                    ruleId: IDS.ruleDriver80DeliveryId,
                    amount: 4,
                },
                {
                    type: 'DRIVER',
                    direction: 'PAYABLE',
                    driverId: IDS.driverProfileId,
                    businessId: null,
                    ruleId: IDS.ruleDriverBusinessFullSponsor1Id,
                    amount: 1,
                },
                {
                    type: 'DRIVER',
                    direction: 'RECEIVABLE',
                    driverId: IDS.driverProfileId,
                    businessId: null,
                    ruleId: null,
                    amount: 10,
                },
            ],
        );
    }

    async runBusinessPromoFreeDeliverySplitFunding(): Promise<ScenarioRunResult> {
        const { order, items } = await this.insertOrderWithItems({
            orderId: SCENARIO_ORDER_IDS.businessPromoFreeDeliverySplitFunding,
            displayId: 'SCN-709',
            driverUserId: IDS.driverUserId,
            paymentCollection: 'CASH_TO_DRIVER',
            subtotal: 30,
            deliveryFee: 5,
            itemRows: [
                { productId: IDS.productAId, quantity: 2, basePrice: 10, finalAppliedPrice: 15 },
            ],
            promoRows: [
                { promotionId: IDS.promoBusinessSplitSponsorFreeDeliveryId, appliesTo: 'DELIVERY', discountAmount: 5 },
            ],
        });

        await this.financialService.createOrderSettlements(order as any, items as any, order.driverId);

        return this.evaluateScenario(
            'business-promo-free-delivery-split-funding',
            'Business Free Delivery + Split Funding',
            order.id,
            [
                {
                    type: 'BUSINESS',
                    direction: 'RECEIVABLE',
                    driverId: null,
                    businessId: IDS.businessAId,
                    ruleId: IDS.ruleBusiness10SubtotalId,
                    amount: 3,
                },
                {
                    type: 'BUSINESS',
                    direction: 'RECEIVABLE',
                    driverId: null,
                    businessId: IDS.businessAId,
                    ruleId: IDS.ruleBusinessBusinessSplitSponsorRecover1Id,
                    amount: 1,
                },
                {
                    type: 'DRIVER',
                    direction: 'PAYABLE',
                    driverId: IDS.driverProfileId,
                    businessId: null,
                    ruleId: IDS.ruleDriver80DeliveryId,
                    amount: 4,
                },
                {
                    type: 'DRIVER',
                    direction: 'PAYABLE',
                    driverId: IDS.driverProfileId,
                    businessId: null,
                    ruleId: IDS.ruleDriverBusinessSplitSponsor2Id,
                    amount: 2,
                },
                {
                    type: 'DRIVER',
                    direction: 'RECEIVABLE',
                    driverId: IDS.driverProfileId,
                    businessId: null,
                    ruleId: null,
                    amount: 10,
                },
            ],
        );
    }

    async runBusinessPromoFreeDeliveryPrepaidViaPlatform(): Promise<ScenarioRunResult> {
        const { order, items } = await this.insertOrderWithItems({
            orderId: SCENARIO_ORDER_IDS.businessPromoFreeDeliveryPrepaidViaPlatform,
            displayId: 'SCN-710',
            driverUserId: IDS.driverUserId,
            paymentCollection: 'PREPAID_TO_PLATFORM',
            subtotal: 30,
            deliveryFee: 5,
            itemRows: [
                { productId: IDS.productAId, quantity: 2, basePrice: 10, finalAppliedPrice: 15 },
            ],
            promoRows: [
                { promotionId: IDS.promoBusinessPrepaidSponsorFreeDeliveryId, appliesTo: 'DELIVERY', discountAmount: 5 },
            ],
        });

        await this.financialService.createOrderSettlements(order as any, items as any, order.driverId);

        return this.evaluateScenario(
            'business-promo-free-delivery-prepaid-via-platform',
            'Business Free Delivery + Prepaid Via Platform',
            order.id,
            [
                {
                    type: 'BUSINESS',
                    direction: 'RECEIVABLE',
                    driverId: null,
                    businessId: IDS.businessAId,
                    ruleId: IDS.ruleBusiness10SubtotalId,
                    amount: 3,
                },
                {
                    type: 'BUSINESS',
                    direction: 'RECEIVABLE',
                    driverId: null,
                    businessId: IDS.businessAId,
                    ruleId: IDS.ruleBusinessBusinessPrepaidSponsorRecover1Id,
                    amount: 1,
                },
                {
                    type: 'DRIVER',
                    direction: 'PAYABLE',
                    driverId: IDS.driverProfileId,
                    businessId: null,
                    ruleId: IDS.ruleDriver80DeliveryId,
                    amount: 4,
                },
                {
                    type: 'DRIVER',
                    direction: 'PAYABLE',
                    driverId: IDS.driverProfileId,
                    businessId: null,
                    ruleId: IDS.ruleDriverBusinessPrepaidSponsor1Id,
                    amount: 1,
                },
            ],
        );
    }

    private async insertOrderWithItems(params: {
        orderId: string;
        displayId: string;
        driverUserId: string | null;
        paymentCollection: 'CASH_TO_DRIVER' | 'PREPAID_TO_PLATFORM';
        subtotal: number;
        deliveryFee: number;
        itemRows: Array<{
            productId: string;
            quantity: number;
            basePrice: number;
            finalAppliedPrice: number;
        }>;
        promoRows?: Array<{
            promotionId: string;
            appliesTo: 'PRICE' | 'DELIVERY';
            discountAmount: number;
        }>;
    }) {
        const now = new Date().toISOString();

        const [createdOrder] = await this.db
            .insert(orders)
            .values({
                id: params.orderId,
                displayId: params.displayId,
                userId: IDS.customerUserId,
                driverId: params.driverUserId,
                price: params.subtotal,
                deliveryPrice: params.deliveryFee,
                paymentCollection: params.paymentCollection,
                status: 'DELIVERED',
                dropoffLat: 42.463,
                dropoffLng: 21.469,
                dropoffAddress: 'Scenario Dropoff',
                deliveredAt: now,
                orderDate: now,
                createdAt: now,
                updatedAt: now,
            })
            .returning();

        await this.db.insert(orderItems).values(
            params.itemRows.map((item) => ({
                id: randomUUID(),
                orderId: params.orderId,
                productId: item.productId,
                quantity: item.quantity,
                basePrice: item.basePrice,
                salePrice: null,
                markupPrice: item.finalAppliedPrice,
                nightMarkedupPrice: null,
                finalAppliedPrice: item.finalAppliedPrice,
                createdAt: now,
                updatedAt: now,
            })),
        );

        if (params.promoRows?.length) {
            await this.db.insert(orderPromotions).values(
                params.promoRows.map((promo) => ({
                    id: randomUUID(),
                    orderId: params.orderId,
                    promotionId: promo.promotionId,
                    appliesTo: promo.appliesTo,
                    discountAmount: promo.discountAmount,
                    createdAt: now,
                    updatedAt: now,
                })),
            );
        }

        const insertedItems = await this.db
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, params.orderId));

        return {
            order: createdOrder!,
            items: insertedItems,
        };
    }

    private async evaluateScenario(
        scenarioId: string,
        name: string,
        orderId: string,
        expectedSettlements: ExpectedSettlement[],
    ): Promise<ScenarioRunResult> {
        const actualRows = await this.settlementRepo.getSettlements({ orderId });
        const actualSettlements = actualRows.map((s) => ({
            type: s.type,
            direction: s.direction,
            driverId: s.driverId,
            businessId: s.businessId,
            ruleId: s.ruleId,
            amount: Number(s.amount),
        }));

        const mismatches: string[] = [];
        const unmatchedActual = [...actualSettlements];

        for (const expected of expectedSettlements) {
            const index = unmatchedActual.findIndex((actual) =>
                actual.type === expected.type &&
                actual.direction === expected.direction &&
                (actual.driverId ?? null) === (expected.driverId ?? null) &&
                (actual.businessId ?? null) === (expected.businessId ?? null) &&
                (actual.ruleId ?? null) === (expected.ruleId ?? null) &&
                Math.abs(Number(actual.amount) - Number(expected.amount)) < 0.01,
            );

            if (index === -1) {
                mismatches.push(`Missing expected settlement: ${JSON.stringify(expected)}`);
            } else {
                unmatchedActual.splice(index, 1);
            }
        }

        for (const extra of unmatchedActual) {
            mismatches.push(`Unexpected settlement: ${JSON.stringify(extra)}`);
        }

        const passed = mismatches.length === 0;

        return {
            scenarioId,
            name,
            passed,
            expectedCount: expectedSettlements.length,
            actualCount: actualSettlements.length,
            mismatches,
            expectedSettlements,
            actualSettlements,
        };
    }
}
