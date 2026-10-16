// Creates the tables, indexes and constraints. Usage:
//   npm run db:setup            (safe to repeat)
//   node scripts/setup-db.js --reset   (DELETES all ReturnDesk tables first)
const fs = require('fs');
const path = require('path');
const { connect } = require('./db-client');

async function main() {
  const reset = process.argv.includes('--reset');
  const client = await connect();
  try {
    if (reset) {
      console.log('Dropping existing ReturnDesk tables...');
      await client.query('DROP TABLE IF EXISTS return_notes, return_requests CASCADE');
      await client.query('DROP SEQUENCE IF EXISTS return_ref_seq');
    }
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(sql);
    console.log('Database schema is ready.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Database setup failed:', error.message);
  process.exit(1);
});
