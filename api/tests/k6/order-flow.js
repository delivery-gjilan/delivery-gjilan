/**
 * k6 Order Flow Test — the most critical write path
 *
 * Simulates the full customer order journey:
 *   1. Login
 *   2. Browse businesses
 *   3. Create an order
 *   4. Poll order status (3 times, like the app does)
 *
 * This hammers: auth, createOrder mutation, OrderDispatchService,
 * DB writes, and pub/sub fan-out.
 *
 * Run individually:
 *   k6 run --out json=results/order-flow.json tests/k6/order-flow.js
 */

import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const fixtures = JSON.parse(open('./fixtures.json'));
const API_URL = fixtures.apiUrl;
const CUSTOMERS = fixtures.customers;
const SAMPLE_ORDERS = fixtures.sampleOrders;

// ── Custom metrics ────────────────────────────────────────────────────────────
const errorRate = new Rate('error_rate');
const loginDuration = new Trend('login_duration', true);
const createOrderDuration = new Trend('create_order_duration', true);
const orderStatusDuration = new Trend('order_status_duration', true);
const ordersCreated = new Counter('orders_created');
const loginFailures = new Counter('login_failures');
const orderFailures = new Counter('order_failures');

// ── Stages ────────────────────────────────────────────────────────────────────
export const options = {
    stages: [
        { duration: '30s', target: 5 },    // warm-up — few orders
        { duration: '1m',  target: 20 },   // light: ~20 concurrent customers
        { duration: '2m',  target: 60 },   // medium
        { duration: '2m',  target: 120 },  // stress — concurrent order creation
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        login_duration: ['p(95)<500'],
        create_order_duration: ['p(95)<2000'],     // order creation can be up to 2s
        order_status_duration: ['p(95)<300'],
        error_rate: ['rate<0.02'],                 // tolerate up to 2% errors
        http_req_duration: ['p(99)<3000'],
    },
};

const STRESS_SECRET = fixtures.stressSecret || '';
const HEADERS = { 'Content-Type': 'application/json', 'x-stress-secret': STRESS_SECRET };

function gql(query, variables = {}) {
    return JSON.stringify({ query, variables });
}

// ── Login and return JWT ──────────────────────────────────────────────────────
function login(email, password) {
    const res = http.post(
        `${API_URL}/graphql`,
        gql('mutation Login($input: LoginInput!) { login(input: $input) { token user { id role } } }', { input: { email, password } }),
        { headers: HEADERS, tags: { name: 'login' } }
    );

    loginDuration.add(res.timings.duration);

    const ok = check(res, {
        'login 200': (r) => r.status === 200,
        'login has token': (r) => {
            try { return !!JSON.parse(r.body).data?.login?.token; } catch { return false; }
        },
    });

    if (!ok) {
        loginFailures.add(1);
        errorRate.add(1);
        return null;
    }

    try {
        return JSON.parse(res.body).data.login.token;
    } catch {
        return null;
    }
}

// ── Main VU loop ──────────────────────────────────────────────────────────────
export default function () {
    // Pick a random customer from the fixture pool
    const customer = CUSTOMERS[__VU % CUSTOMERS.length];
    const orderFixture = SAMPLE_ORDERS[Math.floor(Math.random() * SAMPLE_ORDERS.length)];

    // Step 1: Login
    const token = login(customer.email, customer.password);
    if (!token) {
        sleep(1);
        return;
    }

    const authHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-stress-secret': STRESS_SECRET,
    };

    sleep(0.3);

    // Step 2: Browse businesses (authenticated — mirrors real app flow)
    const bizRes = http.post(
        `${API_URL}/graphql`,
        gql(`query { businesses { id name isOpen avgPrepTimeMinutes } }`),
        { headers: authHeaders, tags: { name: 'auth_businesses' } }
    );
    check(bizRes, { 'authed businesses 200': (r) => r.status === 200 });

    sleep(0.5 + Math.random() * 1);

    // Step 3: Create order
    const createRes = http.post(
        `${API_URL}/graphql`,
        gql('mutation CreateOrder($input: CreateOrderInput!) { createOrder(input: $input) { id displayId status totalPrice } }',
            { input: orderFixture.payload }),
        { headers: authHeaders, tags: { name: 'create_order' } }
    );

    createOrderDuration.add(createRes.timings.duration);

    const orderOk = check(createRes, {
        'createOrder 200': (r) => r.status === 200,
        'createOrder has id': (r) => {
            try { return !!JSON.parse(r.body).data?.createOrder?.id; } catch { return false; }
        },
    });

    if (!orderOk) {
        orderFailures.add(1);
        errorRate.add(1);
        // Log body for debugging (captured in json output)
        console.error(`createOrder failed: ${createRes.status} ${createRes.body?.slice(0, 200)}`);
        sleep(1);
        return;
    }

    ordersCreated.add(1);
    const orderId = JSON.parse(createRes.body).data.createOrder.id;

    sleep(1);

    // Step 4: Poll order status 3 times (simulates app polling after creation)
    for (let poll = 0; poll < 3; poll++) {
        const statusRes = http.post(
            `${API_URL}/graphql`,
            gql('query Order($id: ID!) { order(id: $id) { id status displayId } }', { id: orderId }),
            { headers: authHeaders, tags: { name: 'order_status' } }
        );

        orderStatusDuration.add(statusRes.timings.duration);
        check(statusRes, {
            'order status 200': (r) => r.status === 200,
            'order status has data': (r) => {
                try { return !!JSON.parse(r.body).data?.order; } catch { return false; }
            },
        });

        sleep(2);
    }

    errorRate.add(0);  // successful iteration — keeps rate denominator accurate
    sleep(1 + Math.random() * 2);
}
