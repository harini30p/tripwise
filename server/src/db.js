import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

// Determine SSL requirements:
// Hosted cloud databases like Neon PostgreSQL require SSL.
// If connecting to local postgres (localhost / 127.0.0.1) without SSL, ssl can be disabled.
const isHostedDatabase = Boolean(
  connectionString &&
  !connectionString.includes('localhost') &&
  !connectionString.includes('127.0.0.1')
);

export const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: isHostedDatabase ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : null;

/**
 * Initializes the database schema automatically if pool is configured.
 * Creates the itinerary_items table with a composite primary key (client_id, place_id).
 */
export async function initializeDatabase() {
  if (!pool) {
    console.warn('[TripWise DB] DATABASE_URL is not set. Database features are currently disabled.');
    return false;
  }

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS itinerary_items (
      client_id VARCHAR(128) NOT NULL,
      place_id VARCHAR(255) NOT NULL,
      destination JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (client_id, place_id)
    );
    CREATE INDEX IF NOT EXISTS idx_itinerary_client_created 
      ON itinerary_items (client_id, created_at ASC);
  `;

  try {
    const client = await pool.connect();
    try {
      await client.query(createTableQuery);
      console.log('[TripWise DB] Connected to PostgreSQL. Table "itinerary_items" is ready.');
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[TripWise DB] Failed to initialize database schema:', err.message);
    return false;
  }
}

/**
 * Checks database connectivity for health checks without exposing credentials or internal errors.
 */
export async function checkDatabaseHealth() {
  if (!pool) {
    return { status: 'unconfigured', message: 'DATABASE_URL is not set' };
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return { status: 'connected' };
    } finally {
      client.release();
    }
  } catch (err) {
    return { status: 'disconnected', message: 'Unable to reach PostgreSQL instance' };
  }
}
