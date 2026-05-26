import pg from 'pg';
import { env } from '../config/env.js';

export const pool = new pg.Pool({
  connectionString: env.databaseUrl
});

export async function query(text, params = []) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (env.nodeEnv !== 'test') {
    console.log('db query', { text: text.split('\n')[0], duration, rows: result.rowCount });
  }
  return result;
}
