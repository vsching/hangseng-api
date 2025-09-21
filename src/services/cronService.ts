import cron from 'node-cron';
import { HangSengService } from './hangsengService';
import { ChineseCalendarService } from './chineseCalendarService';

export class CronService {
  private hangSengService: HangSengService;
  private calendarService: ChineseCalendarService;

  constructor() {
    this.hangSengService = new HangSengService();
    this.calendarService = new ChineseCalendarService();
  }

  startScheduledTasks(): void {
    // Update Hang Seng data every weekday at 5:00 PM HKT (after market close)
    cron.schedule('0 17 * * 1-5', async () => {
      console.log('Running scheduled Hang Seng data update...');
      try {
        await this.hangSengService.updateDailyData();
        console.log('Hang Seng data update completed');
      } catch (error) {
        console.error('Error in scheduled Hang Seng update:', error);
      }
    }, {
      timezone: 'Asia/Hong_Kong'
    });

    // Update Chinese calendar data daily at midnight
    cron.schedule('0 0 * * *', async () => {
      console.log('Running scheduled Chinese calendar update...');
      try {
        await this.calendarService.updateDailyCalendar();
      } catch (error) {
        console.error('Error in scheduled calendar update:', error);
      }
    }, {
      timezone: 'Asia/Hong_Kong'
    });

    console.log('Scheduled tasks started');
  }

  async runInitialDataLoad(): Promise<void> {
    try {
      console.log('Running initial data load...');

      // Load current week's Chinese calendar data
      await this.calendarService.updateDailyCalendar();
      console.log('Populated Chinese calendar for current week');

      // Load initial Hang Seng data
      await this.hangSengService.updateDailyData();
      console.log('Initial Hang Seng data loaded');

      console.log('Initial data load completed');
    } catch (error) {
      console.error('Error in initial data load:', error);
    }
  }
}