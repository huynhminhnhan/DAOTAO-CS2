#!/usr/bin/env node
/**
 * Reset teacher passwords to a known value ('123456')
 * This script updates each teacher user via instance.update so Sequelize
 * beforeUpdate hooks will hash the password consistently.
 *
 * Usage:
 *   node scripts/reset-teacher-passwords.js
 */

import { sequelize, User } from '../src/database/index.js';

const NEW_PASSWORD = '123456';

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connected');

    const teachers = await User.findAll({ where: { role: 'teacher' } });
    if (!teachers || teachers.length === 0) {
      console.log('ℹ️ No teacher users found');
      process.exit(0);
    }

    console.log(`ℹ️ Found ${teachers.length} teacher user(s). Resetting passwords...`);
    for (const t of teachers) {
      try {
        await t.update({ password: NEW_PASSWORD });
        console.log(`✅ Updated password for ${t.email}`);
      } catch (err) {
        console.error(`❌ Failed to update ${t.email}:`, err.message);
      }
    }

    console.log('✅ Done. Teachers can now log in with password:', NEW_PASSWORD);
    process.exit(0);
  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  }
}

main();
