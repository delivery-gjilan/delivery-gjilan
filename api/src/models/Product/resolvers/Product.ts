import type { ProductResolvers } from './../../../generated/types.generated';

export const Product: ProductResolvers = {
    variantGroupId: (parent) => {
        return (parent as any).groupId ?? (parent as any).variantGroupId ?? null;
    },

    effectivePrice: async (parent, _args, { loaders }) => {
        return loaders.effectivePriceByProductIdLoader.load(parent.id as string);
    },

    optionGroups: async (parent, _args, { loaders }) => {
        const groups = await loaders.optionGroupsByProductIdLoader.load(parent.id as string);
        return groups.map((g) => ({
            id: g.id,
            productId: g.productId,
            name: g.name,
            minSelections: g.minSelections,
            maxSelections: g.maxSelections,
            displayOrder: g.displayOrder,
            options: [], // resolved by OptionGroup.options field resolver
        })) as any;
    },

    variants: async (parent, _args, { loaders }) => {
        const groupId = (parent as any).groupId ?? (parent as any).variantGroupId;
        if (!groupId) return [];
        const allVariants = await loaders.variantsByGroupIdLoader.load(groupId);
        // Filter out self and map to Product shape
        return allVariants
            .filter((v) => v.id !== parent.id)
            .map((v) => ({
                ...v,
                variantGroupId: v.groupId ?? undefined,
                price: Number(v.basePrice),
                markupPrice: v.markupPrice ?? null,
                nightMarkedupPrice: v.nightMarkedupPrice ?? null,
                saleDiscountPercentage: v.saleDiscountPercentage ?? null,
                isOffer: v.isOffer ?? false,
                optionGroups: [],
                variants: [],
                createdAt: v.createdAt ?? new Date().toISOString(),
                updatedAt: v.updatedAt ?? new Date().toISOString(),
                isOnSale: v.isOnSale ?? false,
                isAvailable: v.isAvailable ?? true,
            })) as any;
    },

    variantGroup: async (parent, _args, { loaders }) => {
        const groupId = (parent as any).groupId ?? (parent as any).variantGroupId;
        if (!groupId) return null;
        return loaders.variantGroupByIdLoader.load(groupId) as any;
    },
};
