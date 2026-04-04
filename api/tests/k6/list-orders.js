/**
 * k6 List-Orders Test — read-path performance for the batched order mapper
 *
 * Simulates concurrent reads of order lists, targeting the code paths inside
 * OrderService that used to call mapToOrder() once per order and now batch
 * the supporting reads across the full collection.
 *
 * Each VU performs:
 *   1. Login (customer or driver role, rotated round-robin)
 *   2. `orders` query  — customer sees own history; driver sees their orders
 *   3. `uncompletedOrders` — hot path for active-order polling
 *
 * Thresholds are deliberately tighter than the create-order thresholds
 * because pure read queries have no write or dispatch side-effects.
 *
 * Run individually:
 *   k6 run --out json=results/list-orders.json tests/k6/list-orders.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const fixtures = JSON.parse(open('./fixtures.json'));
const API_URL = fixtures.apiUrl;
const CUSTOMERS = fixtures.customers;
const DRIVERS = fixtures.drivers;

// ── Custom metrics ────────────────────────────────────────────────────────────
const errorRate = new Rate('error_rate');
const loginDuration = new Trend('login_duration', true);
const ordersListDuration = new Trend('orders_list_duration', true);
const uncompletedDuration = new Trend('uncompleted_orders_duration', true);
const listFailures = new Counter('list_failures');

// ── Stages: similar ramp to order-flow but emphasising concurrent readers ─────
export const options = {
    stages: [
        { duration: '30s', target: 5   },   // warm-up
        { duration: '1m',  target: 30  },   // light
        { duration: '2m',  target: 80  },   // medium — comparable to browse
        { duration: '2m',  target: 150 },   // stress — many concurrent list calls
        { duration: '30s', target: 0   },
    ],
    thresholds: {
        login_duration:             ['p(95)<500'],
        orders_list_duration:       ['p(95)<500'],   // list should be faster than create
        uncompleted_orders_duration:['p(95)<300'],
        error_rate:                 ['rate<0.02'],
        http_req_duration:          ['p(99)<2000'],
    },
};

const STRESS_SECRET = fixtures.stressSecret || '';
const HEADERS = { 'Content-Type': 'application/json', 'x-stress-secret': STRESS_SECRET };

function gql(query, variables = {}) {
    return JSON.stringify({ query, variables });
}

function login(email, password) {
    const res = http.post(
        `${API_URL}/graphql`,
        gql('mutation Login($input: LoginInput!) { login(input: $input) { token } }', { input: { email, password } }),
        { headers: HEADERS, tags: { name: 'login' } }
    );

    loginDuration.add(res.timings.duration);

    const ok = check(res, {
        'login 200':       (r) => r.status === 200,
        'login has token': (r) => {
            try { return !!JSON.parse(r.body).data?.login?.token; } catch { return false; }
        },
    });

    if (!ok) { errorRate.add(1); return null; }
    errorRate.add(0);
    try { return JSON.parse(res.body).data.login.token; } catch { return null; }
}

// ── Main VU loop ──────────────────────────────────────────────────────────────
export default function () {
    // Alternate between customer and driver perspectives to exercise both code paths
    const useDriver = __VU % 4 === 0 && DRIVERS.length > 0;
    const actor = useDriver
        ? DRIVERS[__VU % DRIVERS.length]
        : CUSTOMERS[__VU % CUSTOMERS.length];

    const token = login(actor.email, actor.password);
    if (!token) { sleep(1); return; }

    const authHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-stress-secret': STRESS_SECRET,
    };

    sleep(0.2);

    // ── Query 1: paginated order list ─────────────────────────────────────────
    const listRes = http.post(
        `${API_URL}/graphql`,
        gql(`query OrderList($limit: Int, $offset: Int) {
            orders(limit: $limit, offset: $offset) {
                id
                status
                totalPrice
                deliveryPrice
                createdAt
                businesses {
                    business { id name }
                    items {
                        id
                        productName
                        basePrice
                        quantity
                    }
                }
            }
        }`, { limit: 20, offset: 0 }),
        { headers: authHeaders, tags: { name: 'orders_list' } }
    );

    const listOk = check(listRes, {
        'orders list 200':      (r) => r.status === 200,
        'orders list has data': (r) => {
            try { return Array.isArray(JSON.parse(r.body).data?.orders); } catch { return false; }
        },
    });

    ordersListDuration.add(listRes.timings.duration);
    if (!listOk) { listFailures.add(1); errorRate.add(1); } else { errorRate.add(0); }

    sleep(0.3);

    // ── Query 2: uncompleted orders (active-order polling hot path) ───────────
    const uncompRes = http.post(
        `${API_URL}/graphql`,
        gql(`query {
            uncompletedOrders {
                id
                status
                totalPrice
                businesses {
                    business { id name }
                    items { id productName quantity }
                }
            }
        }`),
        { headers: authHeaders, tags: { name: 'uncompleted_orders' } }
    );

    const uncompOk = check(uncompRes, {
        'uncompleted 200':      (r) => r.status === 200,
        'uncompleted has data': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.data?.uncompletedOrders != null;
            } catch { return false; }
        },
    });

    uncompletedDuration.add(uncompRes.timings.duration);
    if (!uncompOk) { listFailures.add(1); errorRate.add(1); } else { errorRate.add(0); }

    sleep(0.5 + Math.random() * 0.5);
}
