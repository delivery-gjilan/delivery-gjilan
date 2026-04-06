import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { ApiContextInterface } from '@/graphql/context';
import logger from '@/lib/logger';
import { users as usersTable } from '@/database/schema';

const log = logger.child({ service: 'DemoProgressionService' });

const DEFAULT_PREPARATION_MINUTES = 12;
const APPROVAL_DELAY_MS = 3_000;
const START_PREPARING_DELAY_MS = 8_000;
const READY_DELAY_MS = 20_000;
const OUT_FOR_DELIVERY_DELAY_MS = 30_000;
const DELIVERED_DELAY_MS = 60_000;

interface DemoActors {
    adminUserId?: string;
    businessUserId?: string;
    businessId?: string;
    demoDriverId?: string;
}

function impersonateContext(
    context: ApiContextInterface,
    userData: ApiContextInterface['userData'],
): ApiContextInterface {
    return {
        ...context,
        userData,
        userId: userData.userId,
        role: userData.role,
        businessId: userData.businessId,
    };
}

async function resolveAdminUserId(context: ApiContextInterface): Promise<string | undefined> {
    const [admin] = await context.db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(and(inArray(usersTable.role, ['SUPER_ADMIN', 'ADMIN']), isNull(usersTable.deletedAt)))
        .limit(1);

    return admin?.id;
}

async function resolveBusinessUserId(
    context: ApiContextInterface,
    businessId: string,
): Promise<string | undefined> {
    const [businessUser] = await context.db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(
            and(
                eq(usersTable.businessId, businessId),
                inArray(usersTable.role, ['BUSINESS_OWNER', 'BUSINESS_EMPLOYEE']),
                isNull(usersTable.deletedAt),
            ),
        )
        .limit(1);

    return businessUser?.id;
}

async function resolveDemoDriverId(context: ApiContextInterface): Promise<string | undefined> {
    const configuredDriverId = process.env.DEMO_DRIVER_ID?.trim();
    if (configuredDriverId) {
        const [configuredDriver] = await context.db
            .select({ id: usersTable.id })
            .from(usersTable)
            .where(
                and(
                    eq(usersTable.id, configuredDriverId),
                    eq(usersTable.role, 'DRIVER'),
                    isNull(usersTable.deletedAt),
                ),
            )
            .limit(1);

        if (configuredDriver) {
            return configuredDriver.id;
        }

        log.warn({ demoDriverId: configuredDriverId }, 'demoProgression:configuredDriverMissingOrInvalid');
    }

    const [demoDriver] = await context.db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(
            and(
                eq(usersTable.isDemoAccount, true),
                eq(usersTable.role, 'DRIVER'),
                isNull(usersTable.deletedAt),
            ),
        )
        .limit(1);

    return demoDriver?.id;
}

async function resolveDemoActors(
    context: ApiContextInterface,
    orderId: string,
): Promise<DemoActors | null> {
    const dbOrder = await context.orderService.orderRepository.findById(orderId);
    if (!dbOrder) {
        return null;
    }

    const [adminUserId, businessUserId, demoDriverId] = await Promise.all([
        resolveAdminUserId(context),
        resolveBusinessUserId(context, dbOrder.businessId),
        resolveDemoDriverId(context),
    ]);

    return {
        adminUserId,
        businessUserId,
        businessId: dbOrder.businessId,
        demoDriverId,
    };
}

function scheduleStep(delayMs: number, label: string, action: () => Promise<void>): void {
    setTimeout(() => {
        void action().catch((error) => {
            log.error({ err: error, delayMs, step: label }, 'demoProgression:stepFailed');
        });
    }, delayMs);
}

async function maybeApproveOrder(
    orderId: string,
    context: ApiContextInterface,
    actors: DemoActors,
): Promise<void> {
    const currentOrder = await context.orderService.getOrderById(orderId);
    if (!currentOrder || currentOrder.status !== 'AWAITING_APPROVAL') {
        return;
    }

    const adminContext = impersonateContext(context, {
        userId: actors.adminUserId,
        role: 'ADMIN',
    });

    await context.orderService.approveOrderWithSideEffects(orderId, adminContext);
}

async function maybeStartPreparing(
    orderId: string,
    context: ApiContextInterface,
    actors: DemoActors,
): Promise<void> {
    const currentOrder = await context.orderService.getOrderById(orderId);
    if (!currentOrder || currentOrder.status !== 'PENDING' || !actors.businessId) {
        return;
    }

    const businessContext = impersonateContext(context, {
        userId: actors.businessUserId,
        role: 'BUSINESS_OWNER',
        businessId: actors.businessId,
    });

    await context.orderService.startPreparingWithSideEffects(orderId, DEFAULT_PREPARATION_MINUTES, businessContext);
}

async function maybeMarkReady(
    orderId: string,
    context: ApiContextInterface,
    actors: DemoActors,
): Promise<void> {
    const currentOrder = await context.orderService.getOrderById(orderId);
    if (!currentOrder || currentOrder.status !== 'PREPARING' || !actors.businessId) {
        return;
    }

    const businessContext = impersonateContext(context, {
        userId: actors.businessUserId,
        role: 'BUSINESS_OWNER',
        businessId: actors.businessId,
    });

    await context.orderService.updateStatusWithSideEffects(orderId, 'READY', businessContext as any);
}

async function maybePickUpOrder(
    orderId: string,
    context: ApiContextInterface,
    actors: DemoActors,
): Promise<void> {
    const currentOrder = await context.orderService.getOrderById(orderId);
    if (!currentOrder) {
        return;
    }

    if (currentOrder.status !== 'READY' && currentOrder.status !== 'PREPARING') {
        return;
    }

    const pickupContext = actors.demoDriverId
        ? impersonateContext(context, { userId: actors.demoDriverId, role: 'DRIVER' })
        : impersonateContext(context, { userId: actors.adminUserId, role: 'SUPER_ADMIN' });

    await context.orderService.updateStatusWithSideEffects(orderId, 'OUT_FOR_DELIVERY', pickupContext as any);
}

async function maybeDeliverOrder(
    orderId: string,
    context: ApiContextInterface,
    actors: DemoActors,
): Promise<void> {
    const currentOrder = await context.orderService.getOrderById(orderId);
    if (!currentOrder || currentOrder.status !== 'OUT_FOR_DELIVERY') {
        return;
    }

    const deliverContext = actors.demoDriverId
        ? impersonateContext(context, { userId: actors.demoDriverId, role: 'DRIVER' })
        : impersonateContext(context, { userId: actors.adminUserId, role: 'SUPER_ADMIN' });

    await context.orderService.updateStatusWithSideEffects(orderId, 'DELIVERED', deliverContext as any);
}

export async function scheduleDemoOrderProgression(
    orderId: string,
    context: ApiContextInterface,
): Promise<void> {
    const actors = await resolveDemoActors(context, orderId);
    if (!actors) {
        log.warn({ orderId }, 'demoProgression:orderNotFound');
        return;
    }

    log.info(
        {
            orderId,
            hasAdminUser: Boolean(actors.adminUserId),
            hasBusinessUser: Boolean(actors.businessUserId),
            hasDemoDriver: Boolean(actors.demoDriverId),
        },
        'demoProgression:scheduled',
    );

    scheduleStep(APPROVAL_DELAY_MS, 'approve', () => maybeApproveOrder(orderId, context, actors));
    scheduleStep(START_PREPARING_DELAY_MS, 'startPreparing', () => maybeStartPreparing(orderId, context, actors));
    scheduleStep(READY_DELAY_MS, 'ready', () => maybeMarkReady(orderId, context, actors));
    scheduleStep(OUT_FOR_DELIVERY_DELAY_MS, 'outForDelivery', () => maybePickUpOrder(orderId, context, actors));
    scheduleStep(DELIVERED_DELAY_MS, 'delivered', () => maybeDeliverOrder(orderId, context, actors));
}