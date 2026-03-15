import type { OptionGroupResolvers } from './../../../generated/types.generated';

export const OptionGroup: OptionGroupResolvers = {
    options: async (parent, _args, { loaders }) => {
        const opts = await loaders.optionsByOptionGroupIdLoader.load(parent.id);
        return opts.map((o) => ({
            id: o.id,
            optionGroupId: o.optionGroupId,
            name: o.name,
            extraPrice: o.extraPrice,
            linkedProductId: o.linkedProductId ?? undefined,
            displayOrder: o.displayOrder,
        }));
    },
};
