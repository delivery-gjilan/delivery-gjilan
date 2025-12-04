import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './database/schema/*',
    out: './database/migrations',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DB_URL as string,
    },
    verbose: true,
    strict: true,
});
