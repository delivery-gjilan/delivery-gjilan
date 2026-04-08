/**
 * Unit tests for AuthRepository.
 *
 * Covers:
 *  - createUser: inserts with correct initial fields
 *  - findByEmail / findById: return user or undefined
 *  - verifyEmailCode: returns undefined on user-not-found, code mismatch, or succeeds
 *  - verifyPhoneCode: same branching logic
 *  - deleteUser: soft-delete behaviour
 *
 * All DB interactions are replaced with a chainable vi.fn() mock so no database
 * connection is required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthRepository } from '../AuthRepository';

// ── Stub user shape ─────────────────────────────────────────────────────────

const STUB_USER = {
    id: 'user-1',
    firstName: 'Besnik',
    lastName: 'Krasniqi',
    email: 'besnik@test.com',
    password: 'hashed-pw',
    role: 'CUSTOMER' as const,
    signupStep: 'COMPLETED',
    emailVerified: true,
    emailVerificationCode: null as string | null,
    phoneVerified: false,
    phoneVerificationCode: null as string | null,
    businessId: null,
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
};

// ── DB mock helpers ──────────────────────────────────────────────────────────
// Mirrors the pattern used in BusinessRepository.test.ts.

/** For mutations (.insert/.update … .returning()) */
function makeMutationDb(rows: any[]) {
    const chain: any = {
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
        values: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue(rows),
    };
    return chain;
}

/** For selects (.select().from().where() → thenable) */
function makeSelectDb(rows: any[]) {
    const whenWhere: any = {
        then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject),
    };
    whenWhere.where = vi.fn().mockReturnValue(whenWhere);
    return {
        select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue(whenWhere),
            }),
        }),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue(rows),
        delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    };
}

// ── createUser ───────────────────────────────────────────────────────────────

describe('AuthRepository.createUser', () => {
    it('inserts with INITIAL signup step and returns the new user', async () => {
        const db = makeMutationDb([STUB_USER]);
        const repo = new AuthRepository(db as any);

        const result = await repo.createUser('Besnik', 'Krasniqi', 'besnik@test.com', 'hashed-pw');

        expect(result).toBe(STUB_USER);
        expect(db.insert).toHaveBeenCalled();
        expect(db.values).toHaveBeenCalledWith(
            expect.objectContaining({
                firstName: 'Besnik',
                lastName: 'Krasniqi',
                email: 'besnik@test.com',
                password: 'hashed-pw',
                signupStep: 'INITIAL',
                emailVerified: false,
                phoneVerified: false,
            }),
        );
    });
});

// ── findByEmail ──────────────────────────────────────────────────────────────

describe('AuthRepository.findByEmail', () => {
    it('returns the user when a matching non-deleted row exists', async () => {
        const db = makeSelectDb([STUB_USER]);
        const repo = new AuthRepository(db as any);
        const result = await repo.findByEmail('besnik@test.com');
        expect(result).toEqual(STUB_USER);
    });

    it('returns undefined when no rows are returned', async () => {
        const db = makeSelectDb([]);
        const repo = new AuthRepository(db as any);
        const result = await repo.findByEmail('ghost@test.com');
        expect(result).toBeUndefined();
    });
});

// ── findById ─────────────────────────────────────────────────────────────────

describe('AuthRepository.findById', () => {
    it('returns the user when found', async () => {
        const db = makeSelectDb([STUB_USER]);
        const repo = new AuthRepository(db as any);
        expect(await repo.findById('user-1')).toEqual(STUB_USER);
    });

    it('returns undefined for an unknown id', async () => {
        const db = makeSelectDb([]);
        const repo = new AuthRepository(db as any);
        expect(await repo.findById('nonexistent')).toBeUndefined();
    });
});

// ── verifyEmailCode ──────────────────────────────────────────────────────────

describe('AuthRepository.verifyEmailCode', () => {
    it('returns undefined when the user does not exist', async () => {
        const db = makeSelectDb([]);
        const repo = new AuthRepository(db as any);
        const result = await repo.verifyEmailCode('user-x', '123456');
        expect(result).toBeUndefined();
    });

    it('returns undefined when the code does not match', async () => {
        const unverifiedUser = { ...STUB_USER, emailVerificationCode: '111111' };
        const db = makeSelectDb([unverifiedUser]);
        const repo = new AuthRepository(db as any);
        const result = await repo.verifyEmailCode('user-1', '999999');
        expect(result).toBeUndefined();
    });

    it('updates the user and returns the updated record when the code matches', async () => {
        const unverifiedUser = { ...STUB_USER, emailVerified: false, emailVerificationCode: '654321' };
        const verifiedUser = { ...STUB_USER, emailVerified: true, emailVerificationCode: null };

        // findById uses select; the update path uses a mutation chain
        const selectDb = makeSelectDb([unverifiedUser]);
        const mutationDb = makeMutationDb([verifiedUser]);

        // Combine: select methods from selectDb, mutation methods from mutationDb
        const db: any = {
            ...selectDb,
            update: mutationDb.update.bind(mutationDb),
            set: mutationDb.set.bind(mutationDb),
            returning: mutationDb.returning.bind(mutationDb),
        };
        // Wire the mutation chain for the update call
        mutationDb.update.mockReturnValue(mutationDb);

        const repo = new AuthRepository(db);
        // Spy on findById so control of the select path is straightforward
        vi.spyOn(repo, 'findById').mockResolvedValue(unverifiedUser as any);

        const result = await repo.verifyEmailCode('user-1', '654321');

        expect(result).toEqual(verifiedUser);
        expect(mutationDb.update).toHaveBeenCalled();
        expect(mutationDb.set).toHaveBeenCalledWith(
            expect.objectContaining({ emailVerified: true, emailVerificationCode: null }),
        );
    });
});

// ── verifyPhoneCode ──────────────────────────────────────────────────────────

describe('AuthRepository.verifyPhoneCode', () => {
    it('returns undefined when user not found', async () => {
        const db = makeSelectDb([]);
        const repo = new AuthRepository(db as any);
        expect(await repo.verifyPhoneCode('user-x', '000000')).toBeUndefined();
    });

    it('returns undefined when the code does not match', async () => {
        const user = { ...STUB_USER, phoneVerificationCode: '112233' };
        const db = makeSelectDb([user]);
        const repo = new AuthRepository(db as any);
        vi.spyOn(repo, 'findById').mockResolvedValue(user as any);
        expect(await repo.verifyPhoneCode('user-1', '998877')).toBeUndefined();
    });

    it('marks the phone verified and returns COMPLETED step on correct code', async () => {
        const user = { ...STUB_USER, phoneVerified: false, phoneVerificationCode: '445566' };
        const updated = { ...STUB_USER, phoneVerified: true, phoneVerificationCode: null, signupStep: 'COMPLETED' };
        const mutationDb = makeMutationDb([updated]);
        mutationDb.update.mockReturnValue(mutationDb);

        const repo = new AuthRepository(mutationDb as any);
        vi.spyOn(repo, 'findById').mockResolvedValue(user as any);

        const result = await repo.verifyPhoneCode('user-1', '445566');

        expect(result).toEqual(updated);
        expect(mutationDb.set).toHaveBeenCalledWith(
            expect.objectContaining({ phoneVerified: true, signupStep: 'COMPLETED', phoneVerificationCode: null }),
        );
    });
});

// ── deleteUser (soft-delete) ─────────────────────────────────────────────────

describe('AuthRepository.deleteUser', () => {
    it('returns true when a row is soft-deleted', async () => {
        const db = makeMutationDb([{ id: 'user-1' }]);
        db.update.mockReturnValue(db);
        const repo = new AuthRepository(db as any);
        const result = await repo.deleteUser('user-1');
        expect(result).toBe(true);
        expect(db.update).toHaveBeenCalled();
    });

    it('returns false when no rows were affected (already deleted)', async () => {
        const db = makeMutationDb([]);
        db.update.mockReturnValue(db);
        const repo = new AuthRepository(db as any);
        const result = await repo.deleteUser('ghost-user');
        expect(result).toBe(false);
    });
});
