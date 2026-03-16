import type { ProductResolvers } from './../../../generated/types.generated';

export const Product: ProductResolvers = {
    variantGroupId: (parent) => {
        return (parent as any).groupId ?? (parent as any).variantGroupId ?? null;
    },

    optionGroups: async (parent, _args, { loaders }) => {
        const groups = await loaders.optionGroupsByProductIdLoader.load(parent.id);
        return groups.map((g) => ({
            id: g.id,
            productId: g.productId,
            name: g.name,
            minSelections: g.minSelections,
            maxSelections: g.maxSelections,
            displayOrder: g.displayOrder,
            options: [], // resolved by OptionGroup.options field resolver
        }));
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
                isOffer: v.isOffer ?? false,
                optionGroups: [],
                variants: [],
                createdAt: v.createdAt ?? new Date().toISOString(),
                updatedAt: v.updatedAt ?? new Date().toISOString(),
                isOnSale: v.isOnSale ?? false,
                isAvailable: v.isAvailable ?? true,
            }));
    },

    variantGroup: async (parent, _args, { db }) => {
        const groupId = (parent as any).groupId ?? (parent as any).variantGroupId;
        if (!groupId) return null;
        const { productVariantGroups } = await import('@/database/schema/productVariantGroups');
        const { eq } = await import('drizzle-orm');
        const [group] = await db.select().from(productVariantGroups).where(eq(productVariantGroups.id, groupId));
        return group ?? null;
    },
};
