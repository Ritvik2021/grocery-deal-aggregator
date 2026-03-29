import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Supabase
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err);
});
