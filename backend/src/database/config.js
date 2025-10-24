import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env if present
dotenv.config();

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project now uses MySQL only. Provide required env vars or reasonable defaults.
// Required / typical env vars:
// DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
const DIALECT = 'mysql';
// Support multiple possible env var names (DATABASE_URL, DB_*, or MYSQL_* from Railway plugin)
// Priority: DATABASE_URL -> DB_* -> MYSQL_* -> defaults
const parseDatabaseUrl = (urlString) => {
  try {
    const url = new URL(urlString);
    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      database: url.pathname ? url.pathname.replace(/^\//, '') : undefined,
      username: url.username || undefined,
      password: url.password || undefined
    };
  } catch (err) {
    return {};
  }
};

const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || '';
let host, port, database, username, password;

if (databaseUrl) {
  const parsed = parseDatabaseUrl(databaseUrl);
  host = parsed.host;
  port = parsed.port || (process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306);
  database = parsed.database || process.env.DB_NAME || process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'student_management';
  username = parsed.username || process.env.DB_USER || process.env.MYSQLUSER || process.env.MYSQL_USER || 'root';
  password = parsed.password || process.env.DB_PASS || process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || '';
} else {
  host = process.env.DB_HOST || process.env.MYSQLHOST || process.env.MYSQL_HOST || '127.0.0.1';
  port = process.env.DB_PORT ? Number(process.env.DB_PORT) : (process.env.MYSQLPORT ? Number(process.env.MYSQLPORT) : 3306);
  database = process.env.DB_NAME || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'student_management';
  username = process.env.DB_USER || process.env.MYSQLUSER || process.env.MYSQL_USER || 'root';
  password = process.env.DB_PASS || process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || '';
}

// Log which host is being used (avoid printing passwords)
console.log('DB config: host=' + host + ' port=' + port + ' db=' + database + ' user=' + (username ? username : '[none]'));

const sequelize = new Sequelize(database, username, password, {
  host,
  port,
  dialect: 'mysql',
  logging: false,
  define: {
    timestamps: true,
    underscored: false
  },
  pool: {
    max: Number(process.env.DB_POOL_MAX) || 10,
    min: Number(process.env.DB_POOL_MIN) || 0,
    acquire: Number(process.env.DB_POOL_ACQUIRE) || 30000,
    idle: Number(process.env.DB_POOL_IDLE) || 10000
  }
});

// Test kết nối helper
const testConnection = async () => {
  try {
    await sequelize.authenticate();
  console.log('\u2705 Kết nối database thành công! (dialect=' + DIALECT + ')');
  } catch (error) {
  console.error('\u274c Không thể kết nối database (dialect=' + DIALECT + '):', error);
  }
};

export { sequelize, testConnection };
