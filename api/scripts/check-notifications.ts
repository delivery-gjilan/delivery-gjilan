/**
 * Debug script to check notification setup
 * Run: npx tsx scripts/check-notifications.ts <userId>
 */

import { getDB } from '@/database';
import { deviceTokens } from '@/database/schema';
import { eq } from 'drizzle-orm';

async function checkNotifications() {
    const userId = process.argv[2];
    
    if (!userId) {
        console.error('Usage: npx tsx scripts/check-notifications.ts <userId>');
        process.exit(1);
    }

    const db = await getDB();

    console.log('\n🔍 Checking notification setup for user:', userId);
    console.log('─'.repeat(60));

    // Check device tokens
    const tokens = await db
        .select()
        .from(deviceTokens)
        .where(eq(deviceTokens.userId, userId));

    console.log(`\n📱 Device Tokens: ${tokens.length} found`);
    tokens.forEach((token, i) => {
        console.log(`\n  Token ${i + 1}:`);
        console.log(`    Platform: ${token.platform}`);
        console.log(`    App Type: ${token.appType}`);
        console.log(`    Device ID: ${token.deviceId}`);
        console.log(`    Token: ${token.token.substring(0, 50)}...`);
        console.log(`    Created: ${token.createdAt}`);
    });

    if (tokens.length === 0) {
        console.log('\n❌ No device tokens found!');
        console.log('\n💡 Possible issues:');
        console.log('   1. User hasn\'t opened the app after installing from TestFlight');
        console.log('   2. Token registration failed (check app logs)');
        console.log('   3. User denied notification permissions');
    } else {
        console.log('\n✅ Device tokens are registered correctly');
    }

    console.log('\n─'.repeat(60));
    console.log('\n📝 Next steps:');
    console.log('   1. Check app logs for: [Notifications] Device token registered successfully');
    console.log('   2. Check backend logs: grep "Multicast push result" logs/*.log');
    console.log('   3. Test notification from admin panel');
    console.log('');

    process.exit(0);
}

checkNotifications().catch(console.error);
