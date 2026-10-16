import { Pool } from 'pg';

// The pool is created on first use and cached on globalThis, so Next.js hot reloading
// in development does not open a new set of connections every time a file changes.
function getPool() {
  if (!globalThis.__returnDeskPool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
    }
    globalThis.__returnDeskPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    });
  }
  return globalThis.__returnDeskPool;
}

// Run one parameterized query. Always pass user input in `params`, never inside `text`.
export function query(text, params = []) {
  return getPool().query(text, params);
}

// Run several queries as one all-or-nothing unit: if anything throws, everything is rolled back.
export async function withTransaction(work) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
