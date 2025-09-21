#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import { HangSengService } from '../services/hangsengService';

/**
 * Standalone script to update Hang Seng index data
 * Can be run manually or via system cron
 *
 * Usage:
 *   npm run update-hangseng                                     # Update latest data (last 30 days)
 *   npm run update-hangseng -- --from 2024-01-01 --to 2024-03-31  # Date range
 *   npm run update-hangseng -- --days 60                        # Last N days
 *   npm run update-hangseng -- --year 2024                      # Entire year
 */

async function main() {
  const hangSengService = new HangSengService();
  const args = process.argv.slice(2);

  try {
    console.log('📈 Starting Hang Seng Index Update...');

    let startDate: Date;
    let endDate: Date = new Date();

    if (args.includes('--from') && args.includes('--to')) {
      // Date range specified
      const fromIndex = args.indexOf('--from') + 1;
      const toIndex = args.indexOf('--to') + 1;

      startDate = new Date(args[fromIndex]);
      endDate = new Date(args[toIndex]);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error(`Invalid date range: ${args[fromIndex]} to ${args[toIndex]}`);
      }

      console.log(`📅 Fetching Hang Seng data from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    } else if (args.includes('--days')) {
      // Last N days
      const daysIndex = args.indexOf('--days') + 1;
      const days = parseInt(args[daysIndex]);

      if (isNaN(days) || days < 1) {
        throw new Error(`Invalid days parameter: ${args[daysIndex]}`);
      }

      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      console.log(`📅 Fetching last ${days} days of Hang Seng data`);

    } else if (args.includes('--year')) {
      // Entire year
      const yearIndex = args.indexOf('--year') + 1;
      const year = parseInt(args[yearIndex]);

      if (isNaN(year) || year < 1990 || year > new Date().getFullYear()) {
        throw new Error(`Invalid year: ${args[yearIndex]}`);
      }

      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);

      // If it's current year, don't go beyond today
      const today = new Date();
      if (year === today.getFullYear() && endDate > today) {
        endDate = today;
      }

      console.log(`📅 Fetching Hang Seng data for year ${year}`);

    } else {
      // Default: last 30 days
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      console.log('📅 Fetching last 30 days of Hang Seng data (default)');
    }

    // Fetch data from Yahoo Finance
    const data = await hangSengService.fetchDataForRange(startDate, endDate);

    if (data.length === 0) {
      console.log('⚠️ No data available for the specified period');
      process.exit(0);
    }

    // Save to database
    let successCount = 0;
    let failCount = 0;

    for (const record of data) {
      try {
        await hangSengService.saveHangSengData(record);
        successCount++;
      } catch (error: any) {
        if (error.code === '23505') {
          // Duplicate key error - data already exists
          console.log(`⏭️ Skipping ${record.date.toISOString().split('T')[0]} (already exists)`);
        } else {
          console.error(`❌ Failed to save data for ${record.date.toISOString().split('T')[0]}:`, error.message);
          failCount++;
        }
      }
    }

    console.log(`\n📊 Summary: ${successCount} new records, ${failCount} failed, ${data.length - successCount - failCount} skipped`);

    // Get and display latest data
    const latestData = await hangSengService.getLatestIndexValue();

    if (latestData) {
      console.log('\n✅ Latest Hang Seng Index Data:');
      console.log(`   Date: ${new Date(latestData.date).toLocaleDateString()}`);
      console.log(`   Open: ${latestData.open}`);
      console.log(`   High: ${latestData.high}`);
      console.log(`   Low: ${latestData.low}`);
      console.log(`   Close: ${latestData.close}`);
      console.log(`   Volume: ${(latestData.volume / 1000000).toFixed(1)}M`);

      const change = latestData.close - latestData.open;
      const changePercent = (change / latestData.open) * 100;
      console.log(`   Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
    }

    console.log('\n📊 Hang Seng update completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating Hang Seng data:', error);
    process.exit(1);
  }
}

// Run the script
main();