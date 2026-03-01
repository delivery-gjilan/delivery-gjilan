import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { userWallet, walletTransactions } from '@/database/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';

export const addWalletCredit: NonNullable<MutationResolvers['addWalletCredit']> = async (
    _parent,
    { input },
    { userData }
) => {
    if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
        throw AppError.forbidden();
    }

    const db = await getDB();
    const amount = parseFloat(input.amount as any);

    // Get or create wallet
    let [wallet] = await db
        .select()
        .from(userWallet)
        .where(eq(userWallet.userId, input.userId));

    if (!wallet) {
        [wallet] = await db
            .insert(userWallet)
            .values({ userId: input.userId, balance: 0 })
            .returning();
    }

    const balanceBefore = parseFloat(wallet.balance as any);
    const balanceAfter = balanceBefore + amount;

    // Update wallet
    await db
        .update(userWallet)
        .set({ balance: balanceAfter })
        .where(eq(userWallet.id, wallet.id));

    // Record transaction
    const [transaction] = await db
        .insert(walletTransactions)
        .values({
            walletId: wallet.id,
            userId: input.userId,
            type: (input.type || 'CREDIT') as any,
            amount,
            balanceBefore,
            balanceAfter,
            description: input.description || null,
        })
        .returning();

    return {
        id: transaction.id,
        walletId: transaction.walletId,
        type: transaction.type,
        amount: transaction.amount,
        balanceBefore: transaction.balanceBefore,
        balanceAfter: transaction.balanceAfter,
        orderId: transaction.orderId,
        description: transaction.description,
        createdAt: transaction.createdAt,
        wallet: {
            id: wallet.id,
            userId: wallet.userId,
            balance: wallet.balance,
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt,
        },
    };
};