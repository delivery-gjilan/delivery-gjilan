import 'dotenv/config';
import { getDB } from '../database';
import { SettlementScenarioHarnessService } from '../src/services/SettlementScenarioHarnessService';

const COLORS = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
} as const;

const SYMBOLS = {
    pass: '✓',
    fail: '✗',
};

function paint(text: string, color: keyof typeof COLORS) {
    return `${COLORS[color]}${text}${COLORS.reset}`;
}

function printSummary(total: number, passed: number, failed: number) {
    const passText = paint(`${SYMBOLS.pass} ${passed} passed`, 'green');
    const failText = failed > 0
        ? paint(`${SYMBOLS.fail} ${failed} failed`, 'red')
        : paint(`${SYMBOLS.fail} ${failed} failed`, 'dim');

    console.log(`${paint('Settlement Harness Summary', 'bold')}`);
    console.log(`${paint(`Total: ${total}`, 'cyan')} | ${passText} | ${failText}`);
}

async function main() {
    const db = await getDB();
    const service = new SettlementScenarioHarnessService(db as any);
    const result = await service.runHarness(null);

    console.log();
    printSummary(result.total, result.passedCount, result.failedCount);
    console.log();

    for (const scenario of result.results) {
        const symbol = scenario.passed ? paint(SYMBOLS.pass, 'green') : paint(SYMBOLS.fail, 'red');
        const label = scenario.passed ? paint('PASS', 'green') : paint('FAIL', 'red');
        console.log(
            `${symbol} ${label} ${scenario.scenarioId} ${paint('-', 'dim')} ${scenario.name} ${paint(`(expected ${scenario.expectedCount}, actual ${scenario.actualCount})`, 'dim')}`,
        );

        if (!scenario.passed) {
            for (const mismatch of scenario.mismatches) {
                console.log(`   ${paint('-', 'yellow')} ${paint(mismatch, 'yellow')}`);
            }

            console.log(`   ${paint('Look here:', 'cyan')} src/services/SettlementScenarioHarnessService.ts (scenarioId: ${scenario.scenarioId})`);
            console.log('');
        }
    }

    console.log();

    if (!result.passed) {
        const failedScenarioIds = result.results
            .filter((r) => !r.passed)
            .map((r) => r.scenarioId);

        console.error(paint('Harness failed. Fix the failing scenarios and re-run `npm run test:api:preflight`.', 'red'));
        console.error(paint(`Failed scenario IDs: ${failedScenarioIds.join(', ')}`, 'red'));
        process.exit(1);
    }

    console.log(paint('All settlement scenarios passed.', 'green'));
}

main().catch((error) => {
    console.error('[settlement-harness] error', error);
    process.exit(1);
});
