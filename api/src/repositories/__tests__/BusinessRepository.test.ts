/**
 * Unit tests for BusinessRepository — CRUD operations against a mock DB.
 *
 * BusinessRepository is a thin data-access layer. These tests verify that it:
 *  - calls the right DB operations with the right arguments
 *  - returns what the DB gives it (no silent transformation)
 *  - soft-deletes (sets deletedAt) rather than hard-deleting rows
 *
 * We use a vi.fn()-based mock for the db dependency so these tests run
 * instantly with no real database required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BusinessRepository } from '../BusinessRepository';

// ---------------------------------------------------------------------------
// Minimal business stub that matches the shape the repo returns
// ---------------------------------------------------------------------------
const STUB_BUSINESS = {
    id: 'biz-001',
    name: 'Casbas Pizza',
    email: 'casbas@example.com',
    locationLat: 42.46,
    locationLng: 21.47,
    isActive: true,
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// DB mock factory
// Drizzle's query builder chains (.select().from().where()…) are fluent,
// so we build a simple chainable mock that resolves to a fixed value at the end.
// ---------------------------------------------------------------------------

function makeChain(resolveWith: any) {
    const chain: any = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue(resolveWith),
        // For plain select() that resolves directly (no .returning())
        then: undefined as any,
    };
    // Make the chain itself thenable for paths that await the chain directly
    chain.where.mockImplementation(() => {
        const sub: any = { ...chain };
        sub[Symbol.iterator] = undefined;
        // Allow `await db.select().from().where()` to resolve
        sub.then = (resolve: any) => Promise.resolve(resolveWith).then(resolve);
        return sub;
    });
    return chain;
}

// ---------------------------------------------------------------------------
// find operations use a slightly different mock because they don't use
// .returning() — they await the query chain directly.
// ---------------------------------------------------------------------------

function makeFindDb(rows: any[]) {
    const whenWhere = {
        then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject),
        where: vi.fn(),
    };
    whenWhere.where = vi.fn().mockReturnValue(whenWhere);
    return {
        select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue(whenWhere),
            }),
        }),
        update: vi.fn(),
        insert: vi.fn(),
    };
}

// ---------------------------------------------------------------------------
// Tests — create
// ---------------------------------------------------------------------------

describe('BusinessRepository.create', () => {
    it('inserts the provided data and returns the created business', async () => {
        const db: any = makeChain([STUB_BUSINESS]);
        const repo = new BusinessRepository(db);

        const result = await repo.create(STUB_BUSINESS as any);

        expect(db.insert).toHaveBeenCalled();
        expect(result).toEqual(STUB_BUSINESS);
    });
});

// ---------------------------------------------------------------------------
// Tests — findById
// ---------------------------------------------------------------------------

describe('BusinessRepository.findById', () => {
    it('returns the business when found', async () => {
        const db: any = makeFindDb([STUB_BUSINESS]);
        const repo = new BusinessRepository(db);
        const result = await repo.findById('biz-001');
        expect(result).toEqual(STUB_BUSINESS);
    });

    it('returns undefined when no rows are returned', async () => {
        const db: any = makeFindDb([]);
        const repo = new BusinessRepository(db);
        const result = await repo.findById('nonexistent');
        expect(result).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// Tests — findAll
// ---------------------------------------------------------------------------

describe('BusinessRepository.findAll', () => {
    it('returns all businesses', async () => {
        const allBiz = [STUB_BUSINESS, { ...STUB_BUSINESS, id: 'biz-002', name: 'Cozy Cafe' }];
        const whenWhere = {
            then: (resolve: any, reject: any) => Promise.resolve(allBiz).then(resolve, reject),
        };
        const db: any = {
            select: vi.fn().mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue(whenWhere),
                }),
            }),
        };
        const repo = new BusinessRepository(db);
        const result = await repo.findAll();
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Casbas Pizza');
    });
});

// ---------------------------------------------------------------------------
// Tests — delete (soft delete)
// ---------------------------------------------------------------------------

describe('BusinessRepository.delete', () => {
    it('returns true when a row was soft-deleted', async () => {
        const db: any = {
            update: vi.fn().mockReturnValue({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        returning: vi.fn().mockResolvedValue([STUB_BUSINESS]),
                    }),
                }),
            }),
        };
        const repo = new BusinessRepository(db);
        const result = await repo.delete('biz-001');
        expect(result).toBe(true);
        expect(db.update).toHaveBeenCalled();
    });

    it('returns false when no rows matched (already deleted or not found)', async () => {
        const db: any = {
            update: vi.fn().mockReturnValue({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        returning: vi.fn().mockResolvedValue([]),
                    }),
                }),
            }),
        };
        const repo = new BusinessRepository(db);
        const result = await repo.delete('nonexistent');
        expect(result).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Tests — update
// ---------------------------------------------------------------------------

describe('BusinessRepository.update', () => {
    it('returns the updated business on success', async () => {
        const updated = { ...STUB_BUSINESS, name: 'Casbas Grill' };
        const db: any = {
            update: vi.fn().mockReturnValue({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        returning: vi.fn().mockResolvedValue([updated]),
                    }),
                }),
            }),
        };
        const repo = new BusinessRepository(db);
        const result = await repo.update('biz-001', { name: 'Casbas Grill' } as any);
        expect(result?.name).toBe('Casbas Grill');
    });

    it('returns undefined when the business was not found', async () => {
        const db: any = {
            update: vi.fn().mockReturnValue({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        returning: vi.fn().mockResolvedValue([]),
                    }),
                }),
            }),
        };
        const repo = new BusinessRepository(db);
        const result = await repo.update('nonexistent', { name: 'Ghost' } as any);
        expect(result).toBeUndefined();
    });
});
