export type RuleGuidanceInput = {
    entityType: string;
    ruleType: string;
    appliesTo?: string;
    hasBusinessOverride: boolean;
    hasPromotionScope: boolean;
};

export type RuleGuidance = {
    title: string;
    summary: string;
    bullets: string[];
};

function buildScopeLine(hasBusinessOverride: boolean): string {
    return hasBusinessOverride
        ? 'Scope: applies only to the selected business override.'
        : 'Scope: applies as a default across all businesses in this entity context.';
}

function buildPromotionLine(hasPromotionScope: boolean): string {
    return hasPromotionScope
        ? 'Promotion scope: limited to the selected free-delivery promotion.'
        : 'Promotion scope: applies to any free-delivery promotion.';
}

export function getRuleGuidance(input: RuleGuidanceInput): RuleGuidance {
    const { entityType, ruleType, appliesTo, hasBusinessOverride, hasPromotionScope } = input;

    if (entityType === 'BUSINESS' && ruleType === 'PERCENTAGE') {
        const target = appliesTo === 'DELIVERY_FEE' ? 'delivery fee' : 'order subtotal';
        return {
            title: 'Business Percentage Rule',
            summary: `Platform takes a percentage from the business ${target} for matching orders.`,
            bullets: [
                buildScopeLine(hasBusinessOverride),
                'Direction: receivable to platform from business settlement.',
                'Use priority to control which percentage rule wins when multiple rules match.',
            ],
        };
    }

    if (entityType === 'BUSINESS' && ruleType === 'PRODUCT_MARKUP') {
        return {
            title: 'Business Product Markup Rule',
            summary: 'Platform collects product markup from business orders based on product pricing data.',
            bullets: [
                buildScopeLine(hasBusinessOverride),
                'Direction: receivable to platform from business settlement.',
                'Markup amount comes from product pricing (business price vs customer price), not from manual amount input here.',
            ],
        };
    }

    if (entityType === 'DRIVER' && ruleType === 'PERCENTAGE') {
        return {
            title: 'Driver Percentage Rule',
            summary: 'Platform commission percentage taken from the driver delivery fee.',
            bullets: [
                buildScopeLine(hasBusinessOverride),
                'Applies to: delivery fee (fixed for this rule type).',
                'Meaning: platform takes this %, driver keeps the remainder.',
            ],
        };
    }

    if (entityType === 'DRIVER' && ruleType === 'FIXED_PER_ORDER') {
        if (appliesTo === 'FREE_DELIVERY') {
            return {
                title: 'Driver Free-Delivery Fixed Compensation',
                summary:
                    'Platform pays a fixed amount to the driver for each matching free-delivery order.',
                bullets: [
                    buildScopeLine(hasBusinessOverride),
                    buildPromotionLine(hasPromotionScope),
                    'Direction: payable by platform to driver.',
                ],
            };
        }

        return {
            title: 'Driver Fixed Per Order Rule',
            summary: 'Platform pays a fixed amount to the driver for each matching order.',
            bullets: [
                buildScopeLine(hasBusinessOverride),
                'Direction: payable by platform to driver.',
                'Recommended use: free-delivery compensation scenarios.',
            ],
        };
    }

    if (entityType === 'DRIVER' && ruleType === 'DRIVER_VEHICLE_BONUS') {
        return {
            title: 'Driver Vehicle Bonus Rule',
            summary: 'Adds an extra payout when the selected vehicle condition is met.',
            bullets: [
                buildScopeLine(hasBusinessOverride),
                'Direction: payable by platform to driver.',
                'Common use: reward drivers with own vehicle or specific vehicle type.',
            ],
        };
    }

    return {
        title: 'Settlement Rule Guidance',
        summary: 'Review scope and priority before saving this rule.',
        bullets: [buildScopeLine(hasBusinessOverride)],
    };
}
