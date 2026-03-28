import { getDB } from '@/database';
import { deviceTokens } from '@/database/schema/deviceTokens';

async function clearDeviceTokens() {
    const db = await getDB();
    
    console.log('🗑️  Deleting all device tokens...');
    
    try {
        const result = await db.delete(deviceTokens);
        console.log('✅ Successfully deleted all device tokens from the database');
        console.log('   Users will need to re-register their devices on next login');
    } catch (error) {
        console.error('❌ Failed to delete device tokens:', error);
        process.exit(1);
    }
    
    process.exit(0);
}

clearDeviceTokens();
