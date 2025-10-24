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
const host = process.env.DB_HOST || '127.0.0.1';
const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
const database = process.env.DB_NAME || 'student_management';
const username = process.env.DB_USER || 'root';
const password = process.env.DB_PASS || '';

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
