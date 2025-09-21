#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import { ChineseCalendarService } from '../services/chineseCalendarService';

/**
 * Standalone script to update calendar data
 * Can be run manually or via system cron
 *
 * Usage:
 *   npm run update-calendar                                     # Update today and next 7 days
 *   npm run update-calendar -- --date 2024-03-15               # Specific date
 *   npm run update-calendar -- --year 2024                     # Entire year
 *   npm run update-calendar -- --from 2024-03-01 --to 2024-03-31  # Date range
 */

async function main() {
  const calendarService = new ChineseCalendarService();
  const args = process.argv.slice(2);

  try {
    console.log('🗓️ Starting Calendar Update...');

    if (args.includes('--date')) {
      // Update specific date
      const dateIndex = args.indexOf('--date') + 1;
      const dateStr = args[dateIndex];
      const date = new Date(dateStr);

      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${dateStr}`);
      }

      console.log(`Fetching calendar data for ${date.toISOString().split('T')[0]}...`);
      const data = await calendarService.fetchCalendarData(date);
      await calendarService.saveCalendarDate(date, data);
      console.log(`✅ Successfully updated calendar for ${date.toISOString().split('T')[0]}`);

    } else if (args.includes('--year')) {
      // Update entire year
      const yearIndex = args.indexOf('--year') + 1;
      const year = parseInt(args[yearIndex]);

      if (isNaN(year) || year < 1900 || year > 2100) {
        throw new Error(`Invalid year: ${args[yearIndex]}`);
      }

      await calendarService.populateCalendarForYear(year);
      console.log(`✅ Successfully updated calendar for year ${year}`);

    } else if (args.includes('--from') && args.includes('--to')) {
      // Update date range
      const fromIndex = args.indexOf('--from') + 1;
      const toIndex = args.indexOf('--to') + 1;
      const startDateStr = args[fromIndex];
      const endDateStr = args[toIndex];

      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error(`Invalid date range: ${startDateStr} to ${endDateStr}`);
      }

      if (startDate > endDate) {
        throw new Error(`Start date (${startDateStr}) must be before end date (${endDateStr})`);
      }

      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      console.log(`📅 Updating calendar from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
      console.log(`📊 Total days to fetch: ${totalDays}`);

      await calendarService.populateCalendarForDateRange(startDate, endDate);
      console.log(`✅ Successfully updated calendar for ${totalDays} days`);

    } else {
      // Default: Update today and next 7 days
      await calendarService.updateDailyCalendar();
      console.log('✅ Successfully updated calendar for current week');
    }

    console.log('📊 Calendar update completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating calendar:', error);
    process.exit(1);
  }
}

// Run the script
main();