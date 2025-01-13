import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * PostgreSQL connection configuration
 */
const poolConfig: PoolConfig = {
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  
  // Pool configuration
  max: 20,                        // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,      // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000,  // Connection timeout
  
  // SSL configuration (if needed)
  ssl: process.env.POSTGRES_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined
};

/**
 * Create and configure the database pool
 */
const pool = new Pool(poolConfig);

// Handle pool events
pool.on('connect', () => {
  console.log('📦 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('🔥 Unexpected error on idle client:', err);
  console.log('⚡ Attempting to recover...');
});

// Single instance of pool to be used throughout the application
export default pool;