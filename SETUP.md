# Database Setup Instructions

## Option 1: Install PostgreSQL Locally (macOS)

```bash
# Install PostgreSQL using Homebrew
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Create the database
createdb hangseng_db

# Run the setup script
./scripts/setup-db.sh
```

## Option 2: Use Docker for PostgreSQL

```bash
# Run PostgreSQL in Docker
docker run -d \
  --name hangseng-postgres \
  -e POSTGRES_DB=hangseng_db \
  -e POSTGRES_USER=tonyvoon \
  -e POSTGRES_PASSWORD= \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  -p 5432:5432 \
  postgres:15

# Wait a few seconds for PostgreSQL to start, then run the app
npm run dev
```

## Option 3: Use Docker Compose (Recommended)

```bash
# From the root hangseng directory
docker-compose up -d

# This will start both PostgreSQL and the API
```

## Option 4: Use SQLite Instead (No PostgreSQL Required)

If you want to avoid PostgreSQL setup entirely, we can modify the app to use SQLite instead, which requires no installation.

## Verify Database Connection

After setting up, you can test the connection:

```bash
# Set environment variables
export DB_USER=tonyvoon
export DB_NAME=hangseng_db

# Run the development server
npm run dev
```

## Troubleshooting

### If you get "role does not exist" error:
- Make sure PostgreSQL is running
- Check that the DB_USER in .env matches your system username
- Try using an empty password (DB_PASSWORD=)

### If you get "database does not exist" error:
```bash
createdb hangseng_db
```

### If PostgreSQL is not installed:
The easiest option is to use Docker (Option 2 or 3 above)