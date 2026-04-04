#!/usr/bin/env node
/**
 * k6 Results Analyzer
 *
 * Reads k6 JSON output files from results/ and prints a concise human-readable
 * report with colour-coded pass/fail thresholds and bottleneck diagnosis.
 *
 * Usage:
 *   node tests/k6/analyze.js                 # analyze all results/*.json files
 *   node tests/k6/analyze.js results/browse.json
 *
 * Requires Node 18+ (uses fs.readFileSync, no extra deps).
 */

const fs = require('fs');
const path = require('path');

const RESET  = '\x1b[0m';
const RED    = '\x1b[31m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE   = '\x1b[34m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

function color(text, c) { return `${c}${text}${RESET}`; }
function bold(text) { return `${BOLD}${text}${RESET}`; }
function ms(val) { return val == null ? 'N/A' : `${Math.round(val)}ms`; }
function pct(val) { return val == null ? 'N/A' : `${(val * 100).toFixed(2)}%`; }

// ── Parse k6 JSON output (newline-delimited JSON stream) ─────────────────────
function parseK6Json(filePath) {
    const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
    const metrics = {};

    for (const line of lines) {
        let entry;
        try { entry = JSON.parse(line); } catch { continue; }
        if (entry.type !== 'Point') continue;

        const name = entry.metric;
        const val = entry.data?.value;
        if (val == null) continue;

        if (!metrics[name]) metrics[name] = [];
        metrics[name].push(val);
    }

    return metrics;
}

// ── Compute percentiles ───────────────────────────────────────────────────────
function percentile(arr, p) {
    if (!arr || arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
}

function avg(arr) {
    if (!arr || arr.length === 0) return null;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sum(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0);
}

// ── Threshold checker ─────────────────────────────────────────────────────────
function checkThreshold(label, value, limit, lowerIsBetter = true) {
    const pass = lowerIsBetter ? value <= limit : value >= limit;
    const icon = pass ? color('✓', GREEN) : color('✗', RED);
    const valStr = typeof value === 'number' && value < 10 ? pct(value) : ms(value);
    const limitStr = typeof limit === 'number' && limit < 10 ? pct(limit) : ms(limit);
    return `  ${icon} ${label}: ${pass ? color(valStr, GREEN) : color(valStr, RED)} (threshold: ${limitStr})`;
}

// ── Diagnose bottlenecks ──────────────────────────────────────────────────────
function diagnose(metrics, testName) {
    const issues = [];
    const suggestions = [];

    const httpDurations = metrics['http_req_duration'] || [];
    const p99 = percentile(httpDurations, 99);
    const p95 = percentile(httpDurations, 95);
    const errorRateVals = metrics['error_rate'] || [];
    const errRate = avg(errorRateVals) || 0;

    // High latency diagnosis
    if (p99 > 3000) {
        issues.push(color('CRITICAL: p99 response time > 3s — server is overwhelmed', RED));
        suggestions.push('Check Postgres connection pool — likely saturated at this load');
        suggestions.push('Check Redis latency — slow pub/sub or cache misses cascade into slow GraphQL resolvers');
    } else if (p99 > 1500) {
        issues.push(color('WARNING: p99 response time > 1.5s', YELLOW));
        suggestions.push('Consider connection pooler (PgBouncer) if DB connections are the bottleneck');
    }

    if (p95 > 800 && testName.includes('browse')) {
        issues.push(color('Cache likely not warming fast enough for browse queries', YELLOW));
        suggestions.push('Check Redis cache TTL — browse queries should be sub-100ms on cache hit');
    }

    // High error rate
    if (errRate > 0.05) {
        issues.push(color(`CRITICAL: Error rate ${pct(errRate)} — many requests failing`, RED));
        suggestions.push('Check API logs for 4xx/5xx details');
        suggestions.push('Likely cause: rate limiter firing (in-memory per-process), or DB connections exhausted');
    } else if (errRate > 0.01) {
        issues.push(color(`WARNING: Error rate ${pct(errRate)} above 1%`, YELLOW));
    }

    // Order-flow specific
    if (testName.includes('order')) {
        const createDurations = metrics['create_order_duration'] || [];
        const createP95 = percentile(createDurations, 95);
        if (createP95 > 2000) {
            issues.push(color('createOrder p95 > 2s — OrderDispatchService or DB write path is slow', YELLOW));
            suggestions.push('Profile OrderDispatchService.dispatchOrder() — look for N+1 driver queries');
        }
    }

    // WebSocket specific
    if (testName.includes('websocket')) {
        const wsErrors = sum(metrics['ws_errors'] || []);
        if (wsErrors > 20) {
            issues.push(color(`${wsErrors} WebSocket errors — graphql-ws handler under pressure`, YELLOW));
            suggestions.push('Check wsSubscriptionCounts — may be hitting per-connection limits');
            suggestions.push('Redis pub/sub fan-out may be overwhelming the message loop at high WS concurrency');
        }
    }

    return { issues, suggestions };
}

// ── Render a single test report ───────────────────────────────────────────────
function renderReport(filePath) {
    const testName = path.basename(filePath, '.json');
    console.log(`\n${bold('═'.repeat(60))}`);
    console.log(bold(color(`  📊 ${testName.toUpperCase()}`, BLUE)));
    console.log(bold('═'.repeat(60)));

    let metrics;
    try {
        metrics = parseK6Json(filePath);
    } catch (err) {
        console.log(color(`  ✗ Failed to parse ${filePath}: ${err.message}`, RED));
        return;
    }

    const httpDurations = metrics['http_req_duration'] || [];
    const totalRequests = metrics['http_reqs'] ? sum(metrics['http_reqs']) : httpDurations.length;
    const failedRequests = metrics['http_req_failed'] ? sum(metrics['http_req_failed']) : 0;

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log(bold('\n  HTTP Summary'));
    console.log(`  Total requests : ${totalRequests.toLocaleString()}`);
    console.log(`  Failed         : ${failedRequests > 0 ? color(failedRequests.toLocaleString(), RED) : color(failedRequests.toLocaleString(), GREEN)}`);
    console.log(`  Avg duration   : ${ms(avg(httpDurations))}`);
    console.log(`  p50            : ${ms(percentile(httpDurations, 50))}`);
    console.log(`  p90            : ${ms(percentile(httpDurations, 90))}`);
    console.log(`  p95            : ${ms(percentile(httpDurations, 95))}`);
    console.log(`  p99            : ${ms(percentile(httpDurations, 99))}`);
    console.log(`  Max            : ${ms(httpDurations.reduce((a, b) => a > b ? a : b, 0))}`);

    // ── Per-operation breakdown ───────────────────────────────────────────────
    const customDurationMetrics = Object.keys(metrics).filter(
        (k) => k.endsWith('_duration') && k !== 'http_req_duration'
    );
    if (customDurationMetrics.length > 0) {
        console.log(bold('\n  Per-Operation Latency (p50 / p95 / p99)'));
        for (const metricName of customDurationMetrics) {
            const vals = metrics[metricName];
            const label = metricName.replace(/_duration$/, '').replace(/_/g, ' ');
            console.log(
                `  ${label.padEnd(28)} ${ms(percentile(vals, 50)).padStart(8)} / ${ms(percentile(vals, 95)).padStart(8)} / ${ms(percentile(vals, 99)).padStart(8)}`
            );
        }
    }

    // ── Counters ──────────────────────────────────────────────────────────────
    const counterMetrics = ['orders_created', 'login_failures', 'order_failures', 'ws_errors', 'cache_hit_responses'];
    const foundCounters = counterMetrics.filter((m) => metrics[m]);
    if (foundCounters.length > 0) {
        console.log(bold('\n  Counters'));
        for (const m of foundCounters) {
            const total = sum(metrics[m]);
            const label = m.replace(/_/g, ' ');
            const isError = m.includes('failure') || m.includes('error');
            const valStr = total.toLocaleString();
            console.log(`  ${label.padEnd(28)} ${isError && total > 0 ? color(valStr, RED) : color(valStr, GREEN)}`);
        }
    }

    // ── Thresholds ────────────────────────────────────────────────────────────
    console.log(bold('\n  Threshold Checks'));

    const p99 = percentile(httpDurations, 99);
    const p95 = percentile(httpDurations, 95);
    const errRate = avg(metrics['error_rate'] || []) || 0;

    if (p99 != null)  console.log(checkThreshold('http p99 < 2000ms', p99, 2000));
    if (p95 != null)  console.log(checkThreshold('http p95 < 800ms',  p95, 800));
    if (errRate != null) console.log(checkThreshold('error rate < 1%', errRate, 0.01));

    if (metrics['login_duration']) {
        const lp95 = percentile(metrics['login_duration'], 95);
        console.log(checkThreshold('login p95 < 500ms', lp95, 500));
    }
    if (metrics['create_order_duration']) {
        const cop95 = percentile(metrics['create_order_duration'], 95);
        console.log(checkThreshold('createOrder p95 < 2000ms', cop95, 2000));
    }
    if (metrics['ws_connect_duration']) {
        const wsp95 = percentile(metrics['ws_connect_duration'], 95);
        console.log(checkThreshold('ws connect p95 < 500ms', wsp95, 500));
    }

    // ── Bottleneck diagnosis ──────────────────────────────────────────────────
    const { issues, suggestions } = diagnose(metrics, testName);
    if (issues.length > 0) {
        console.log(bold('\n  ⚠  Diagnosis'));
        for (const issue of issues) console.log(`  ${issue}`);
        console.log(bold('\n  💡 Suggestions'));
        for (const s of suggestions) console.log(`  → ${s}`);
    } else {
        console.log(bold('\n  ') + color('✓ No bottlenecks detected at this load level', GREEN));
    }
}

// ── Entry point ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const resultsDir = path.resolve(__dirname, 'results');

let files;
if (args.length > 0) {
    files = args.map((f) => path.resolve(f));
} else {
    if (!fs.existsSync(resultsDir)) {
        console.log(color('\nNo results/ directory found. Run the tests first with run.ps1', YELLOW));
        process.exit(0);
    }
    files = fs.readdirSync(resultsDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => path.join(resultsDir, f));
}

if (files.length === 0) {
    console.log(color('\nNo result files found. Run: .\\tests\\k6\\run.ps1', YELLOW));
    process.exit(0);
}

console.log(bold(color('\n═══ STRESS TEST ANALYSIS REPORT ═══', BLUE)));
console.log(DIM + `Analysing ${files.length} result file(s)...` + RESET);

for (const f of files) {
    if (!fs.existsSync(f)) {
        console.log(color(`  File not found: ${f}`, RED));
        continue;
    }
    renderReport(f);
}

console.log(`\n${bold('═'.repeat(60))}\n`);
