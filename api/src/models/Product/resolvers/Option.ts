import type { OptionResolvers } from './../../../generated/types.generated';

export const Option: OptionResolvers = {
    linkedProduct: async (parent, _args, { productService }) => {
        if (!parent.linkedProductId) return null;
        return productService.getProduct(parent.linkedProductId as string) as any;
    },
};
