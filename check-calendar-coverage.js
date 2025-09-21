const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'hangseng_db',
  user: process.env.DB_USER || 'tonyvoon',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost'
    ? { rejectUnauthorized: false }
    : undefined,
});

async function checkCalendarCoverage() {
  try {
    // Check year-by-year coverage for calendar data
    const yearResult = await pool.query(`
      SELECT
        EXTRACT(YEAR FROM date) as year,
        COUNT(*) as total_days,
        MIN(date) as first_date,
        MAX(date) as last_date
      FROM calendar_dates
      WHERE date >= '1990-01-01' AND date <= '2030-12-31'
      GROUP BY year
      ORDER BY year
    `);

    console.log('\n📅 Chinese Calendar Data Coverage (1990 - 2030):');
    console.log('================================================');

    const missingYears = [];
    const incompleteYears = [];
    const expectedYears = [];

    // Generate list of expected years
    for (let year = 1990; year <= 2030; year++) {
      expectedYears.push(year);
    }

    // Check each year
    for (const year of expectedYears) {
      const yearData = yearResult.rows.find(r => r.year == year);
      const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
      const expectedDays = isLeapYear ? 366 : 365;

      if (!yearData) {
        missingYears.push(year);
        console.log(`❌ ${year}: NO DATA`);
      } else {
        const percentage = ((yearData.total_days / expectedDays) * 100).toFixed(1);
        const status = yearData.total_days >= expectedDays ? '✅' : '⚠️';

        console.log(`${status} ${year}: ${yearData.total_days}/${expectedDays} days (${percentage}%) | ${yearData.first_date.toISOString().split('T')[0]} to ${yearData.last_date.toISOString().split('T')[0]}`);

        if (yearData.total_days < expectedDays) {
          incompleteYears.push({
            year,
            days: yearData.total_days,
            expected: expectedDays,
            missing: expectedDays - yearData.total_days
          });
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log('============');

    if (missingYears.length > 0) {
      console.log(`\n🔴 Missing Years (${missingYears.length}):`);
      console.log(`   ${missingYears.join(', ')}`);
    }

    if (incompleteYears.length > 0) {
      console.log(`\n🟡 Incomplete Years (${incompleteYears.length}):`);
      incompleteYears.forEach(y => {
        console.log(`   ${y.year}: ${y.days}/${y.expected} days (missing ${y.missing} days)`);
      });
    }

    const completeYears = expectedYears.length - missingYears.length - incompleteYears.length;
    console.log(`\n✅ Complete Years: ${completeYears}/${expectedYears.length}`);

    // Check for specific date gaps in recent years
    console.log('\n🔍 Checking for date gaps in recent years (2020-2025)...');

    for (let year = 2020; year <= 2025; year++) {
      const gapResult = await pool.query(`
        WITH date_series AS (
          SELECT generate_series(
            $1::date,
            $2::date,
            '1 day'::interval
          )::date AS date
        )
        SELECT d.date
        FROM date_series d
        LEFT JOIN calendar_dates c ON d.date = c.date
        WHERE c.date IS NULL
        ORDER BY d.date
      `, [`${year}-01-01`, `${year}-12-31`]);

      if (gapResult.rows.length > 0) {
        console.log(`\n⚠️  Missing dates in ${year}:`);
        gapResult.rows.forEach(row => {
          console.log(`   ${row.date.toISOString().split('T')[0]}`);
        });
      } else {
        console.log(`✅ ${year}: No gaps found`);
      }
    }

    // Overall statistics
    const totalResult = await pool.query(`
      SELECT
        COUNT(*) as total_records,
        MIN(date) as earliest_date,
        MAX(date) as latest_date
      FROM calendar_dates
    `);

    const total = totalResult.rows[0];
    console.log('\n📈 Overall Statistics:');
    console.log('======================');
    console.log(`Total Calendar Records: ${total.total_records}`);
    console.log(`Earliest Date: ${total.earliest_date ? total.earliest_date.toISOString().split('T')[0] : 'None'}`);
    console.log(`Latest Date: ${total.latest_date ? total.latest_date.toISOString().split('T')[0] : 'None'}`);

  } catch (error) {
    console.error('Error checking calendar coverage:', error);
  } finally {
    await pool.end();
  }
}

checkCalendarCoverage();