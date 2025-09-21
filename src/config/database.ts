import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'hangseng_db',
  user: process.env.DB_USER || 'tonyvoon',
  password: process.env.DB_PASSWORD || '',
});

export const initDatabase = async (): Promise<void> => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendar_dates (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS hangseng_index (
        id SERIAL PRIMARY KEY,
        date TIMESTAMP NOT NULL,
        open DECIMAL(10, 2),
        high DECIMAL(10, 2),
        low DECIMAL(10, 2),
        close DECIMAL(10, 2),
        volume BIGINT,
        adjusted_close DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_calendar_dates_date ON calendar_dates(date);
      CREATE INDEX IF NOT EXISTS idx_hangseng_index_date ON hangseng_index(date);
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

export default pool;