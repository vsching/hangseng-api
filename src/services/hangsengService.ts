import yahooFinance from 'yahoo-finance2';
import pool from '../config/database';

interface HangSengData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose: number;
}

export class HangSengService {
  private readonly HANG_SENG_SYMBOL = '^HSI';

  async fetchLatestData(): Promise<HangSengData[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      return await this.fetchDataForRange(startDate, endDate);
    } catch (error) {
      console.error('Error fetching Hang Seng data:', error);
      throw error;
    }
  }

  async fetchDataForRange(startDate: Date, endDate: Date): Promise<HangSengData[]> {
    try {
      const queryOptions = {
        period1: startDate,
        period2: endDate,
        interval: '1d' as const
      };

      const result = await yahooFinance.chart(this.HANG_SENG_SYMBOL, queryOptions);

      if (!result.quotes || result.quotes.length === 0) {
        console.log('No data available for the specified date range');
        return [];
      }

      return result.quotes.map(quote => ({
        date: quote.date,
        open: quote.open || 0,
        high: quote.high || 0,
        low: quote.low || 0,
        close: quote.close || 0,
        volume: quote.volume || 0,
        adjustedClose: quote.adjclose || quote.close || 0
      }));
    } catch (error) {
      console.error('Error fetching Hang Seng data:', error);
      throw error;
    }
  }

  async saveHangSengData(data: HangSengData): Promise<void> {
    const query = `
      INSERT INTO hangseng_index (
        date, open, high, low, close, volume, adjusted_close
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (date)
      DO UPDATE SET
        open = EXCLUDED.open,
        high = EXCLUDED.high,
        low = EXCLUDED.low,
        close = EXCLUDED.close,
        volume = EXCLUDED.volume,
        adjusted_close = EXCLUDED.adjusted_close,
        updated_at = CURRENT_TIMESTAMP;
    `;

    await pool.query(query, [
      data.date,
      data.open,
      data.high,
      data.low,
      data.close,
      data.volume,
      data.adjustedClose
    ]);
  }

  async updateDailyData(): Promise<void> {
    try {
      const latestData = await this.fetchLatestData();

      for (const data of latestData) {
        await this.saveHangSengData(data);
      }

      console.log(`Updated ${latestData.length} Hang Seng index records`);
    } catch (error) {
      console.error('Error updating daily Hang Seng data:', error);
      throw error;
    }
  }

  async getHistoricalData(startDate: Date, endDate: Date): Promise<any[]> {
    const query = `
      SELECT * FROM hangseng_index
      WHERE date >= $1 AND date <= $2
      ORDER BY date DESC;
    `;

    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  async getLatestIndexValue(): Promise<any> {
    const query = `
      SELECT * FROM hangseng_index
      ORDER BY date DESC
      LIMIT 1;
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }

  async getIndexStats(days: number = 30): Promise<any> {
    const query = `
      SELECT
        COUNT(*) as count,
        AVG(close) as avg_close,
        MIN(low) as period_low,
        MAX(high) as period_high,
        MIN(date) as start_date,
        MAX(date) as end_date
      FROM hangseng_index
      WHERE date >= CURRENT_DATE - INTERVAL '${days} days';
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }
}