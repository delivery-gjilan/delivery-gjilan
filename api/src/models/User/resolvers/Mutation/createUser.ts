import type { MutationResolvers } from './../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { users } from '../../../../../database/schema/users';

export const createUser: NonNullable<MutationResolvers['createUser']> = async (_parent, { name, address }, _ctx) => {
    const [newUser] = await db
        .insert(users)
        .values({
            name,
            email: `${name.replace(/\s+/g, '').toLowerCase()}-${Date.now()}@example.com`,
            address,
        })
        .returning();

    return {
        id: newUser.id.toString(),
        name: newUser.name,
        address,
    };
};
