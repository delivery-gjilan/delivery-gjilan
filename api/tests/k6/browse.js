/**
 * k6 Browse Test — read-heavy cache paths
 *
 * Simulates customers browsing the app:
 *   1. List all businesses
 *   2. Fetch a specific business's products
 *   3. Fetch featured businesses
 *
 * Stages: ramp 10→50→200→500 VUs to find where latency degrades.
 *
 * Run individually:
 *   k6 run --out json=results/browse.json tests/k6/browse.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ── Load fixtures ─────────────────────────────────────────────────────────────
const fixtures = JSON.parse(open('./fixtures.json'));
const API_URL = fixtures.apiUrl;
const BUSINESSES = fixtures.businesses;

// ── Custom metrics ────────────────────────────────────────────────────────────
const errorRate = new Rate('error_rate');
const businessListDuration = new Trend('business_list_duration', true);
const productsDuration = new Trend('products_duration', true);
const cacheHits = new Counter('cache_hit_responses');

// ── Stages ────────────────────────────────────────────────────────────────────
export const options = {
    stages: [
        { duration: '30s', target: 10 },   // warm-up
        { duration: '1m',  target: 50 },   // light load
        { duration: '2m',  target: 200 },  // medium load
        { duration: '2m',  target: 500 },  // stress
        { duration: '30s', target: 0 },    // ramp-down
    ],
    thresholds: {
        // p95 of business list should be under 800ms
        business_list_duration: ['p(95)<800'],
        // p95 of products query should be under 600ms
        products_duration: ['p(95)<600'],
        // Overall error rate under 1%
        error_rate: ['rate<0.01'],
        // k6 built-in: p99 of all HTTP calls under 2s
        http_req_duration: ['p(99)<2000'],
    },
};

const STRESS_SECRET = fixtures.stressSecret || '';
const HEADERS = { 'Content-Type': 'application/json', 'x-stress-secret': STRESS_SECRET };

function gql(query, variables = {}) {
    return JSON.stringify({ query, variables });
}

// ── Main VU loop ──────────────────────────────────────────────────────────────
export default function () {
    // 1. List all businesses
    const bizRes = http.post(
        `${API_URL}/graphql`,
        gql(`query {
            businesses {
                id
                name
                businessType
                isActive
                isOpen
                avgPrepTimeMinutes
                minOrderAmount
                isFeatured
            }
        }`),
        { headers: HEADERS, tags: { name: 'businesses' } }
    );

    const bizOk = check(bizRes, {
        'businesses status 200': (r) => r.status === 200,
        'businesses has data': (r) => {
            try { return JSON.parse(r.body).data?.businesses != null; } catch { return false; }
        },
    });
    errorRate.add(!bizOk);
    businessListDuration.add(bizRes.timings.duration);

    // Check for cache header (api sets x-cache or similar — we track via fast response)
    if (bizRes.timings.duration < 20) cacheHits.add(1);

    sleep(0.2);

    // 2. Fetch products for a random stress business
    const biz = BUSINESSES[Math.floor(Math.random() * BUSINESSES.length)];
    const prodRes = http.post(
        `${API_URL}/graphql`,
        gql('query Products($businessId: ID!) { products(businessId: $businessId) { id name basePrice } }',
            { businessId: biz.id }),
        { headers: HEADERS, tags: { name: 'products' } }
    );

    const prodOk = check(prodRes, {
        'products status 200': (r) => r.status === 200,
        'products has data': (r) => {
            try { return JSON.parse(r.body).data?.products != null; } catch { return false; }
        },
    });
    errorRate.add(!prodOk);
    productsDuration.add(prodRes.timings.duration);

    sleep(0.3);

    // 3. Fetch featured businesses (tests a different resolver/cache key)
    const featRes = http.post(
        `${API_URL}/graphql`,
        gql(`query { featuredBusinesses { id name isFeatured } }`),
        { headers: HEADERS, tags: { name: 'featured' } }
    );

    const featOk = check(featRes, { 'featured status 200': (r) => r.status === 200 });
    errorRate.add(!featOk);

    sleep(0.5 + Math.random() * 0.5);
}
