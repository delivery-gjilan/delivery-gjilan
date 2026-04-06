import type { BannerResolvers } from './../../../generated/types.generated';
import { db } from '../../../../database';
import { businesses } from '../../../../database/schema/businesses';
import { products } from '../../../../database/schema/products';
import { promotions } from '../../../../database/schema/promotions';
import { eq } from 'drizzle-orm';

export const Banner: BannerResolvers = {
  business: async (parent, _args, _ctx) => {
    if (!parent.businessId) return null;
    
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, parent.businessId as string))
      .limit(1);
    
    return (business || null) as any;
  },
  
  product: async (parent, _args, _ctx) => {
    if (!parent.productId) return null;
    
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, parent.productId as string))
      .limit(1);
    
    return (product || null) as any;
  },
  
  promotion: async (parent, _args, _ctx) => {
    if (!parent.promotionId) return null;
    
    const [promotion] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.id, parent.promotionId as string))
      .limit(1);
    
    return (promotion || null) as any;
  },
};