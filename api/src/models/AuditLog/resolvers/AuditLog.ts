import { AuditLogResolvers } from '@/generated/types.generated';
import { AppContext } from '@/index';
import { users } from '@/database/schema';
import { eq } from 'drizzle-orm';

export const AuditLog: AuditLogResolvers = {
    actor: async (parent, _, { db }) => {
        if (!parent.actorId) return null;
        
        const result = await db.select().from(users).where(eq(users.id, parent.actorId));
        return result[0] || null;
    },
};
