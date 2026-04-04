/**
 * k6 WebSocket Test — real-time connection stress
 *
 * Tests two WebSocket scenarios:
 *   A) Driver location update loop (graphql-ws: updateDriverLocation mutation over WS)
 *   B) Customer order subscription (graphql-ws: orderStatusChanged subscription)
 *
 * This directly stresses:
 *   - graphql-ws connection handling (wsSubscriptionCounts, wsOperations)
 *   - Redis pub/sub fan-out (pubsub.ts bridge)
 *   - RealtimeMonitor tracking
 *
 * Run individually:
 *   k6 run --out json=results/websocket.json tests/k6/websocket.js
 */

import ws from 'k6/ws';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

const fixtures = JSON.parse(open('./fixtures.json'));
const API_URL = fixtures.apiUrl;
const WS_URL = API_URL.replace('http://', 'ws://') + '/graphql';
const DRIVERS = fixtures.drivers;
const CUSTOMERS = fixtures.customers;

// ── Custom metrics ────────────────────────────────────────────────────────────
const wsConnectDuration = new Trend('ws_connect_duration', true);
const wsMessageDuration = new Trend('ws_message_duration', true);
const wsErrors = new Counter('ws_errors');
const wsConnections = new Gauge('ws_active_connections');
const errorRate = new Rate('error_rate');

// ── Stages — more conservative than HTTP since WS is stateful ─────────────────
export const options = {
    scenarios: {
        // Scenario A: Drivers sending location updates
        driver_location: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 10 },
                { duration: '2m',  target: 50 },   // 50 concurrent drivers
                { duration: '1m',  target: 50 },
                { duration: '30s', target: 0 },
            ],
            exec: 'driverScenario',
        },
        // Scenario B: Customers holding subscriptions open
        customer_subscription: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 20 },
                { duration: '2m',  target: 100 },  // 100 concurrent subscriber connections
                { duration: '1m',  target: 200 },
                { duration: '30s', target: 0 },
            ],
            exec: 'customerScenario',
            startTime: '30s',
        },
    },
    thresholds: {
        ws_connect_duration: ['p(95)<500'],    // WS handshake under 500ms
        ws_errors: ['count<50'],               // tolerate <50 WS errors total
        error_rate: ['rate<0.05'],
    },
};

const STRESS_SECRET = fixtures.stressSecret || '';
const HTTP_HEADERS = { 'Content-Type': 'application/json', 'x-stress-secret': STRESS_SECRET };

function gql(query, variables = {}) {
    return JSON.stringify({ query, variables });
}

function getToken(email, password) {
    const res = http.post(
        `${API_URL}/graphql`,
        gql('mutation Login($input: LoginInput!) { login(input: $input) { token } }', { input: { email, password } }),
        { headers: HTTP_HEADERS }
    );
    try {
        return JSON.parse(res.body).data?.login?.token ?? null;
    } catch {
        return null;
    }
}

// graphql-ws protocol helpers
function makeInitMsg(token) {
    return JSON.stringify({
        type: 'connection_init',
        payload: token ? { Authorization: `Bearer ${token}` } : {},
    });
}

function makeSubscribeMsg(id, query, variables = {}) {
    return JSON.stringify({ id, type: 'subscribe', payload: { query, variables } });
}

function makeCompleteMsg(id) {
    return JSON.stringify({ id, type: 'complete' });
}

// ── Scenario A: Driver sends location updates every 3s ───────────────────────
export function driverScenario() {
    const driver = DRIVERS[__VU % DRIVERS.length];
    const token = getToken(driver.email, driver.password);
    if (!token) {
        errorRate.add(1);
        sleep(2);
        return;
    }

    const startTime = Date.now();

    const res = ws.connect(WS_URL, { headers: { 'Sec-WebSocket-Protocol': 'graphql-transport-ws' } }, (socket) => {
        wsConnections.add(1);

        socket.on('open', () => {
            wsConnectDuration.add(Date.now() - startTime);
            socket.send(makeInitMsg(token));
        });

        let initialized = false;
        let updateCount = 0;
        const MAX_UPDATES = 10; // send 10 location updates then close

        socket.on('message', (data) => {
            let msg;
            try { msg = JSON.parse(data); } catch { return; }

            if (msg.type === 'connection_ack') {
                initialized = true;
                // Send first mutation
                sendLocationUpdate(socket, updateCount++);
            }

            if (msg.type === 'next') {
                wsMessageDuration.add(Date.now() - startTime);
                // server will send 'complete' after 'next' for a mutation — wait for it
            }

            if (msg.type === 'complete') {
                // mutation finished, send next update with new ID
                if (updateCount < MAX_UPDATES) {
                    sleep(3);
                    sendLocationUpdate(socket, updateCount++);
                } else {
                    socket.close();
                }
            }

            if (msg.type === 'error') {
                wsErrors.add(1);
                console.log('WS error:', JSON.stringify(msg.payload));
                // still advance to avoid hanging
                if (updateCount < MAX_UPDATES) {
                    sleep(3);
                    sendLocationUpdate(socket, updateCount++);
                } else {
                    socket.close();
                }
            }
        });

        socket.on('error', () => {
            wsErrors.add(1);
            errorRate.add(1);
        });

        socket.setTimeout(() => { socket.close(); }, 60000);
    });

    check(res, { 'ws driver connected': (r) => r && r.status === 101 });

    if (!res || res.status !== 101) errorRate.add(1);
    sleep(1);
}

function sendLocationUpdate(socket, seq) {
    // Update driver location by a small random delta (simulates movement)
    const latitude = parseFloat((42.4604 + seq * 0.0001).toFixed(6));
    const longitude = parseFloat((21.4694 + seq * 0.0001).toFixed(6));
    const id = 'loc-' + seq;  // unique ID per mutation to avoid graphql-ws duplicate-ID error

    socket.send(makeSubscribeMsg(
        id,
        'mutation UpdateLocation($latitude: Float!, $longitude: Float!) { updateDriverLocation(latitude: $latitude, longitude: $longitude) { id } }',
        { latitude, longitude }
    ));
}

// ── Scenario B: Customer holds an order subscription open ────────────────────
export function customerScenario() {
    const customer = CUSTOMERS[__VU % CUSTOMERS.length];
    const token = getToken(customer.email, customer.password);
    if (!token) {
        errorRate.add(1);
        sleep(2);
        return;
    }

    const startTime = Date.now();

    const res = ws.connect(WS_URL, { headers: { 'Sec-WebSocket-Protocol': 'graphql-transport-ws' } }, (socket) => {
        wsConnections.add(1);

        socket.on('open', () => {
            wsConnectDuration.add(Date.now() - startTime);
            socket.send(makeInitMsg(token));
        });

        socket.on('message', (data) => {
            let msg;
            try { msg = JSON.parse(data); } catch { return; }

            if (msg.type === 'connection_ack') {
                // Subscribe to this customer's order updates
                socket.send(makeSubscribeMsg(
                    'sub-1',
                    'subscription { userOrdersUpdated { id status } }'
                ));
            }

            if (msg.type === 'error') {
                wsErrors.add(1);
            }
        });

        socket.on('error', () => {
            wsErrors.add(1);
            errorRate.add(1);
        });

        // Hold connection open for 30s to simulate a customer watching for drivers
        socket.setTimeout(() => {
            socket.send(makeCompleteMsg('sub-1'));
            socket.close();
        }, 30000);
    });

    check(res, { 'ws customer connected': (r) => r && r.status === 101 });
    if (!res || res.status !== 101) errorRate.add(1);

    sleep(1);
}
