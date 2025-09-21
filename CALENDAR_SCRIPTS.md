# Chinese Calendar Data Management

## Manual Script Usage

### Update Calendar Data

The calendar update script fetches data from the tiax.cn API and stores it in the PostgreSQL database with JSONB format.

#### Basic Usage

```bash
# Update today and next 7 days (default)
npm run update-calendar

# Update a specific date
npm run update-calendar -- --date 2024-03-15

# Update a date range
npm run update-calendar -- --from 2024-03-01 --to 2024-03-31

# Update an entire year
npm run update-calendar -- --year 2024
```

#### Examples

```bash
# Update March 2024
npm run update-calendar -- --from 2024-03-01 --to 2024-03-31

# Update Q1 2024
npm run update-calendar -- --from 2024-01-01 --to 2024-03-31

# Update current week
npm run update-calendar

# Update single date
npm run update-calendar -- --date 2024-12-25
```

### Update Hang Seng Index

```bash
# Update latest Hang Seng data (last 30 days)
npm run update-hangseng
```

## Automated Cron Jobs

### Option 1: Using Node.js Built-in Scheduler

The API server includes built-in cron jobs that run automatically:
- **Calendar Update**: Daily at midnight HKT (updates next 7 days)
- **Hang Seng Update**: Weekdays at 5 PM HKT (after market close)

These start automatically when you run:
```bash
npm run dev  # or npm start
```

### Option 2: Using System Crontab

For production environments, use system crontab for better reliability:

```bash
# Copy and edit the crontab example
cp crontab.example crontab.local

# Edit the file to adjust paths
nano crontab.local

# Install the crontab
crontab crontab.local

# Verify installation
crontab -l
```

Example crontab entries:
```cron
# Daily calendar update at midnight
0 0 * * * cd /path/to/hangseng-api && npm run update-calendar >> logs/calendar.log 2>&1

# Hang Seng update weekdays at 5 PM
0 17 * * 1-5 cd /path/to/hangseng-api && npm run update-hangseng >> logs/hangseng.log 2>&1

# Weekly full month sync (Sundays at 2 AM)
0 2 * * 0 cd /path/to/hangseng-api && npm run update-calendar -- --from $(date +\%Y-\%m-01) --to $(date -d "+1 month -1 day" +\%Y-\%m-\%d) >> logs/calendar-weekly.log 2>&1
```

## Database Structure

Calendar data is stored in JSONB format:

```sql
CREATE TABLE calendar_dates (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

The `data` column contains the complete JSON response from the API, allowing flexible querying:

```sql
-- Example: Find all dates with specific festivals
SELECT date, data->>'festival' as festival
FROM calendar_dates
WHERE data->>'festival' IS NOT NULL;

-- Example: Get lunar date information
SELECT date,
       data->>'lunarYear' as lunar_year,
       data->>'lunarMonth' as lunar_month,
       data->>'lunarDay' as lunar_day
FROM calendar_dates
WHERE date = '2024-03-15';
```

## API Response Format

The tiax.cn API returns data in this format (stored in JSONB):

```json
{
  "date": "2023-03-02",
  "lunarYear": 2023,
  "lunarMonth": 2,
  "lunarDay": 11,
  "zodiac": "兔",
  "yearGanZhi": "癸卯",
  "monthGanZhi": "甲寅",
  "dayGanZhi": "己巳",
  "solarTerm": "",
  "festival": "",
  // ... additional fields
}
```

## Monitoring & Logs

Check logs for script execution:

```bash
# View calendar update logs
tail -f logs/calendar-cron.log

# View Hang Seng update logs
tail -f logs/hangseng-cron.log

# Check for errors
grep "Error" logs/*.log
```

## Rate Limiting

The script includes a 500ms delay between API requests to avoid rate limiting. When updating large date ranges:
- Year update (365 days): ~3 minutes
- Month update (30 days): ~15 seconds
- Week update (7 days): ~4 seconds

## Troubleshooting

### API Connection Issues
```bash
# Test API connectivity
curl "https://api.tiax.cn/almanac/?year=2024&month=3&day=15"
```

### Database Connection Issues
```bash
# Check database connection
psql hangseng_db -c "SELECT COUNT(*) FROM calendar_dates;"
```

### Clear and Repopulate Data
```sql
-- Clear all calendar data
TRUNCATE TABLE calendar_dates;

-- Then repopulate
npm run update-calendar -- --year 2024
```