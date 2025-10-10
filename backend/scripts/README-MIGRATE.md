Migration steps (SQLite -> MySQL)

1. Install dependencies (already added mysql2):

   npm install

2. Generate export from current SQLite DB:

   npm run export:sqlite

   This writes `tmp/sqlite-export.json`.

3. Configure MySQL connection:

   - Copy `.env.example` to `.env` and fill DB credentials.

4. Import to MySQL:

   - Safe mode (attempt to alter schema without dropping existing data):

     npm run import:mysql

   - Force recreate schema on target (will DROP existing tables on target DB):

     MYSQL_FORCE_SYNC=true npm run import:mysql

   - Alternatively use the CLI flag:

     npm run import:mysql -- --force

Notes:
- The import script uses `bulkCreate(..., { ignoreDuplicates: true })` where supported; unique constraint errors may still occur for non-trivial schema differences.
- For production, prefer running migrations (Sequelize migrations or Prisma) rather than bulk import.
- After import, verify referential integrity and run a smoke test of the application.
