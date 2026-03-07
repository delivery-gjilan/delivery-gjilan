import type { MutationResolvers } from './../../../../generated/types.generated';
import { db } from '../../../../../database';
import { banners } from '../../../../../database/schema';
import { eq } from 'drizzle-orm';

export const deleteBanner: NonNullable<MutationResolvers['deleteBanner']> = async (_parent, args, _ctx) => {
  const { id } = args;

  await db.delete(banners).where(eq(banners.id, id));

  return true;
};