import axios from 'axios';
import pool from '../config/database';

interface AlmanacResponse {
  [key: string]: any;
}

export class ChineseCalendarService {
  private readonly API_BASE_URL = 'https://api.tiax.cn/almanac/';

  async fetchCalendarData(date: Date): Promise<AlmanacResponse> {
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // JavaScript months are 0-based
      const day = date.getDate();

      const url = `${this.API_BASE_URL}?year=${year}&month=${month}&day=${day}`;

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
        }
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching calendar data for ${date}:`, error);
      throw new Error(`Failed to fetch calendar data: ${error}`);
    }
  }

  async saveCalendarDate(date: Date, data: AlmanacResponse): Promise<void> {
    const query = `
      INSERT INTO calendar_dates (date, data)
      VALUES ($1, $2)
      ON CONFLICT (date)
      DO UPDATE SET
        data = EXCLUDED.data,
        updated_at = CURRENT_TIMESTAMP;
    `;

    try {
      await pool.query(query, [date, JSON.stringify(data)]);
      console.log(`Saved calendar data for ${date.toISOString().split('T')[0]}`);
    } catch (error) {
      console.error(`Error saving calendar data for ${date}:`, error);
      throw error;
    }
  }

  async getCalendarForDate(date: Date): Promise<AlmanacResponse | null> {
    // First check if we have the data in database
    const query = `
      SELECT data FROM calendar_dates
      WHERE date = $1;
    `;

    try {
      const result = await pool.query(query, [date]);

      if (result.rows.length > 0) {
        return result.rows[0].data;
      }

      // If not in database, fetch from API and save
      const apiData = await this.fetchCalendarData(date);
      await this.saveCalendarDate(date, apiData);
      return apiData;
    } catch (error) {
      console.error(`Error getting calendar for date ${date}:`, error);
      throw error;
    }
  }

  async populateCalendarForDateRange(startDate: Date, endDate: Date): Promise<void> {
    const currentDate = new Date(startDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    let processedDays = 0;
    let successCount = 0;
    let failCount = 0;

    while (currentDate <= endDate) {
      try {
        const dateStr = currentDate.toISOString().split('T')[0];
        process.stdout.write(`\r⏳ Processing ${dateStr} (${processedDays + 1}/${totalDays})...`);

        const data = await this.fetchCalendarData(currentDate);
        await this.saveCalendarDate(new Date(currentDate), data);
        successCount++;

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        failCount++;
        console.error(`\n❌ Failed to populate data for ${currentDate.toISOString().split('T')[0]}:`, error);
      }

      currentDate.setDate(currentDate.getDate() + 1);
      processedDays++;
    }

    console.log(`\n📊 Summary: ${successCount} successful, ${failCount} failed out of ${totalDays} days`);
  }

  async populateCalendarForYear(year: number): Promise<void> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    console.log(`Populating calendar data for year ${year}...`);
    await this.populateCalendarForDateRange(startDate, endDate);
    console.log(`Completed populating calendar data for year ${year}`);
  }

  async getCalendarByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    const query = `
      SELECT date, data FROM calendar_dates
      WHERE date >= $1 AND date <= $2
      ORDER BY date;
    `;

    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  async updateDailyCalendar(): Promise<void> {
    try {
      // Get today and next 7 days
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      console.log('Updating calendar data for the next week...');
      await this.populateCalendarForDateRange(today, nextWeek);
      console.log('Calendar update completed');
    } catch (error) {
      console.error('Error in daily calendar update:', error);
      throw error;
    }
  }
}