import type { MutationResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { productCategories as categoryTable } from '../../../../../database/schema/productCategories';

export const createProductCategory: NonNullable<MutationResolvers['createProductCategory']> =
  async (_parent, { input }, _ctx) => {

    console.log("🚀 CREATE PRODUCT CATEGORY INPUT:", input);

    try {
      const [created] = await db
        .insert(categoryTable)
        .values({
          businessId: Number(input.businessId),
          name: input.name,
          isActive: true,
        })
        .returning({
          id: categoryTable.id,
          businessId: categoryTable.businessId,
          name: categoryTable.name,
          createdAt: categoryTable.createdAt,
          updatedAt: categoryTable.updatedAt,
        });

      console.log("✅ CREATED CATEGORY:", created);

      // SAFETY: updatedAt may return null on insert, so fallback to createdAt
      const createdAt = created.createdAt ?? new Date().toISOString();
      const updatedAt = created.updatedAt ?? createdAt;

      return {
        id: created.id,
        businessId: created.businessId,
        name: created.name,
        createdAt,
        updatedAt,
      };

    } catch (err) {
      console.error("❌ CATEGORY CREATE ERROR:", err);
      throw err;
    }
  };
