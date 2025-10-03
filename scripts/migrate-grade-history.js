#!/usr/bin/env node
/**
 * Migration helper: ensure grade_history schema updated and seed sample history rows
 * - Backup sqlite file
 * - Run sequelize.sync({ alter: true }) to add new columns
 * - For existing Grade rows, create initial GradeHistory snapshot if none exists
 */
import fs from 'fs';
import path from 'path';
import { sequelize, Grade, GradeHistory } from '../src/backend/database/index.js';

const REQUIRED_COLUMNS = [
  { name: 'studentId', sql: 'INTEGER' },
  { name: 'subjectId', sql: 'INTEGER' },
  { name: 'classId', sql: 'INTEGER' },
  { name: 'previousValue', sql: 'TEXT' },
  { name: 'newValue', sql: 'TEXT' },
  { name: 'changeType', sql: "VARCHAR(32) DEFAULT 'update'" },
  { name: 'changedBy', sql: 'INTEGER' },
  { name: 'changedByRole', sql: "VARCHAR(32)" },
  { name: 'reason', sql: 'TEXT' },
  { name: 'ipAddress', sql: "VARCHAR(64)" },
  { name: 'userAgent', sql: 'TEXT' },
  { name: 'transactionId', sql: "VARCHAR(64)" }
];

(async function main(){
  try {
    const dbFile = path.join(process.cwd(), 'src', 'backend', 'database', 'student_management.sqlite');
    const backup = dbFile + '.bak.' + Date.now();
    if (fs.existsSync(dbFile)) {
      console.log('Backing up DB to', backup);
      fs.copyFileSync(dbFile, backup);
    }

    console.log('Checking existing columns on grade_history...');
    const existing = await sequelize.query("PRAGMA table_info('grade_history');");
    const existingCols = (existing && existing[0]) ? existing[0].map(c => c.name) : [];

    for (const col of REQUIRED_COLUMNS) {
      if (!existingCols.includes(col.name)) {
        console.log(`Adding missing column ${col.name} ${col.sql}`);
        await sequelize.query(`ALTER TABLE grade_history ADD COLUMN ${col.name} ${col.sql};`);
      } else {
        console.log(`Column ${col.name} already exists`);
      }
    }

    // Create indexes if missing
    const indexes = [
      { name: 'grade_history_student_id', sql: 'CREATE INDEX IF NOT EXISTS grade_history_student_id ON grade_history (studentId);' },
      { name: 'grade_history_grade_id', sql: 'CREATE INDEX IF NOT EXISTS grade_history_grade_id ON grade_history (gradeId);' },
      { name: 'grade_history_class_id', sql: 'CREATE INDEX IF NOT EXISTS grade_history_class_id ON grade_history (classId);' }
    ];
    for (const idx of indexes) {
      console.log('Ensuring index', idx.name);
      await sequelize.query(idx.sql);
    }

    // Seed history for grades that don't have history yet
    console.log('Seeding grade_history records for existing grades (if missing)...');
    const grades = await Grade.findAll();
    for (const g of grades) {
      const count = await GradeHistory.count({ where: { gradeId: g.id } });
      if (count === 0) {
        await GradeHistory.create({
          gradeId: g.id,
          studentId: g.studentId,
          subjectId: g.subjectId,
          classId: g.classId,
          previousValue: null,
          newValue: g.toJSON(),
          changeType: 'migrate_seed',
          changedBy: null,
          changedByRole: 'system',
          reason: 'Initial seed from existing Grade during migration'
        });
        console.log('Seeded history for grade', g.id);
      }
    }

    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();
