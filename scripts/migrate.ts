import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// max: 1 so the advisory lock drizzle takes and the DDL that follows are
// guaranteed to run on the same connection.
const client = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });

try {
	await migrate(drizzle(client), { migrationsFolder: 'drizzle' });
	console.log('migrations up to date');
} finally {
	await client.end();
}
