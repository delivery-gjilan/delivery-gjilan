import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { userWallet, walletTransactions } from '@/database/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';

export const deductWalletCredit: NonNullable<MutationResolvers['deductWalletCredit']> = async (
    _parent,
    { userId, amount, orderId },
    { userData }
) => {
    if (!userData.userId || userData.userId !== userId) {
        throw AppError.unauthorized();
    }

    const db = await getDB();
    const deductAmount = parseFloat(amount as any);

    // Get wallet
    const [wallet] = await db
        .select()
        .from(userWallet)
        .where(eq(userWallet.userId, userId));

    if (!wallet) {
        throw AppError.notFound('Wallet');
    }

    const balanceBefore = parseFloat(wallet.balance as any);
    if (balanceBefore < deductAmount) {
        throw AppError.businessRule('Insufficient wallet balance');
    }

    const balanceAfter = balanceBefore - deductAmount;

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
            userId,
            type: 'DEBIT',
            amount: deductAmount,
            balanceBefore,
            balanceAfter,
            orderId: orderId || null,
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
    };
};