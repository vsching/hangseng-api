#!/bin/bash

# Setup PostgreSQL Database for Hang Seng API

echo "Setting up PostgreSQL database..."

# Create database if it doesn't exist
createdb hangseng_db 2>/dev/null || echo "Database might already exist"

# Run psql to create tables
psql hangseng_db << EOF
-- Create calendar_dates table
CREATE TABLE IF NOT EXISTS calendar_dates (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    chinese_date VARCHAR(50),
    chinese_month VARCHAR(50),
    chinese_year VARCHAR(50),
    zodiac VARCHAR(50),
    lunar_day INTEGER,
    lunar_month INTEGER,
    lunar_year INTEGER,
    is_leap_month BOOLEAN DEFAULT FALSE,
    solar_term VARCHAR(50),
    festival VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create hangseng_index table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_calendar_dates_date ON calendar_dates(date);
CREATE INDEX IF NOT EXISTS idx_hangseng_index_date ON hangseng_index(date);

-- Show tables
\dt

EOF

echo "Database setup complete!"