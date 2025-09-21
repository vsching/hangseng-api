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

async function checkDataCoverage() {
  try {
    // Check year-by-year coverage
    const yearResult = await pool.query(`
      SELECT
        EXTRACT(YEAR FROM date) as year,
        COUNT(*) as trading_days,
        MIN(date) as first_date,
        MAX(date) as last_date
      FROM hangseng_index
      WHERE date >= '1990-01-01' AND date <= CURRENT_DATE
      GROUP BY year
      ORDER BY year
    `);

    console.log('\n📊 Hang Seng Data Coverage by Year (1990 - Today):');
    console.log('================================================');

    const expectedTradingDays = {
      1990: 259, 1991: 259, 1992: 260, 1993: 259, 1994: 260,
      1995: 259, 1996: 260, 1997: 259, 1998: 259, 1999: 260,
      2000: 260, 2001: 259, 2002: 260, 2003: 259, 2004: 260,
      2005: 260, 2006: 259, 2007: 260, 2008: 260, 2009: 259,
      2010: 248, 2011: 247, 2012: 245, 2013: 244, 2014: 246,
      2015: 246, 2016: 247, 2017: 247, 2018: 245, 2019: 245,
      2020: 247, 2021: 246, 2022: 246, 2023: 246, 2024: 180,
      2025: 180 // approximate
    };

    const missingYears = [];
    const incompleteYears = [];

    for (let year = 1990; year <= new Date().getFullYear(); year++) {
      const yearData = yearResult.rows.find(r => r.year == year);
      if (!yearData) {
        missingYears.push(year);
        console.log(`❌ ${year}: NO DATA`);
      } else {
        const expected = expectedTradingDays[year] || 250;
        const percentage = ((yearData.trading_days / expected) * 100).toFixed(1);
        const status = yearData.trading_days >= expected * 0.95 ? '✅' : '⚠️';

        console.log(`${status} ${year}: ${yearData.trading_days} days (${percentage}% complete) | ${yearData.first_date.toISOString().split('T')[0]} to ${yearData.last_date.toISOString().split('T')[0]}`);

        if (yearData.trading_days < expected * 0.95 && year < 2025) {
          incompleteYears.push({
            year,
            days: yearData.trading_days,
            expected,
            missing: expected - yearData.trading_days
          });
        }
      }
    }

    console.log('\n📈 Summary:');
    console.log('============');
    if (missingYears.length > 0) {
      console.log(`\n🔴 Missing Years: ${missingYears.join(', ')}`);
    }

    if (incompleteYears.length > 0) {
      console.log(`\n🟡 Incomplete Years:`);
      incompleteYears.forEach(y => {
        console.log(`   ${y.year}: ${y.days}/${y.expected} days (missing ~${y.missing} days)`);
      });
    }

    if (missingYears.length === 0 && incompleteYears.length === 0) {
      console.log('✅ All years have complete data!');
    }

    // Check for gaps in recent data
    const gapResult = await pool.query(`
      WITH date_series AS (
        SELECT generate_series(
          '2020-01-01'::date,
          CURRENT_DATE,
          '1 day'::interval
        )::date AS date
      ),
      trading_days AS (
        SELECT date_series.date
        FROM date_series
        WHERE EXTRACT(DOW FROM date_series.date) NOT IN (0, 6) -- Exclude weekends
      )
      SELECT t.date
      FROM trading_days t
      LEFT JOIN hangseng_index h ON t.date = h.date::date
      WHERE h.date IS NULL
      ORDER BY t.date
      LIMIT 50
    `);

    if (gapResult.rows.length > 0) {
      console.log('\n⚠️  Recent Missing Weekdays (first 50):');
      gapResult.rows.forEach(row => {
        console.log(`   ${row.date.toISOString().split('T')[0]}`);
      });
    }

  } catch (error) {
    console.error('Error checking data coverage:', error);
  } finally {
    await pool.end();
  }
}

checkDataCoverage();