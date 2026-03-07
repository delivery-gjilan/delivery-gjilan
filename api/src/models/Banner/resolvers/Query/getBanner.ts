import type { QueryResolvers } from './../../../../generated/types.generated';
import { db } from '../../../../../database';
import { banners } from '../../../../../database/schema';
import { eq } from 'drizzle-orm';

export const getBanner: NonNullable<QueryResolvers['getBanner']> = async (_parent, args, _ctx) => {
  const { id } = args;

  const [banner] = await db.select().from(banners).where(eq(banners.id, id)).limit(1);

  return banner || null;
};