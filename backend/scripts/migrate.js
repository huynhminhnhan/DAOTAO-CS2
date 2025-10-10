import dotenv from 'dotenv';
dotenv.config();

import { sequelize, syncDatabase } from '../src/database/index.js';

const main = async () => {
  const force = process.argv.includes('--force') || process.env.MYSQL_FORCE_SYNC === 'true';
  try {
    console.log('🔧 Starting migration (dialect=' + (process.env.DB_DIALECT || 'mysql') + ')');
    await sequelize.authenticate();
    if (force) {
      console.log('⚠️ Forcing sync({ force: true }) - destructive');
      await sequelize.sync({ force: true });
    } else {
      console.log('ℹ️ Running sequelize.sync({ alter: true })');
      await sequelize.sync({ alter: true });
    }
    console.log('✅ Migration completed');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

main();
