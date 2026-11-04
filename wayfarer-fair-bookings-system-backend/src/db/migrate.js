const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

async function runMigrations() {
  console.log('--- Running Wayfarer Schema Migrations ---');
  const client = await pool.connect();

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await client.query('BEGIN');
    await client.query(schemaSql);
    await client.query('COMMIT');

    console.log('✓ Tables created / verified successfully:');
    console.log('  - users');
    console.log('  - places');
    console.log('  - reviews (with UNIQUE constraint on place_id, user_id)');
    console.log('  - tour_slots');
    console.log('  - bookings');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();

