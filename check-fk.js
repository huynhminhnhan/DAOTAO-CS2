// Script kiểm tra FK constraints hiện tại
import { sequelize } from './backend/src/database/index.js';

async function checkFKConstraints() {
  try {
    console.log('🔍 Checking current FK constraints...');

    // Get current constraints on Enrollments table
    const [constraints] = await sequelize.query(`
      SELECT
        TABLE_NAME,
        COLUMN_NAME,
        CONSTRAINT_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE
        REFERENCED_TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'Enrollments'
      ORDER BY CONSTRAINT_NAME
    `);

    console.log('📋 Current FK constraints on Enrollments:');
    constraints.forEach(constraint => {
      console.log(`  ${constraint.CONSTRAINT_NAME}: ${constraint.TABLE_NAME}.${constraint.COLUMN_NAME} -> ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`);
    });

    // Check if student ID 1 exists
    console.log('\n👤 Checking student ID 1:');
    try {
      const [students] = await sequelize.query("SELECT id, studentCode, fullName, classId FROM students WHERE id = 1");
      if (students.length > 0) {
        console.log('✅ Student exists:', students[0]);
      } else {
        console.log('❌ Student ID 1 not found');
      }
    } catch (error) {
      console.log('❌ Error checking student:', error.message);
    }

    // Check if class exists (if student has classId)
    const [students] = await sequelize.query("SELECT id, classId FROM students WHERE id = 1");
    if (students.length > 0 && students[0].classId) {
      console.log(`\n🏫 Checking class ID ${students[0].classId}:`);
      try {
        const [classes] = await sequelize.query(`SELECT id, classCode, className FROM classes WHERE id = ${students[0].classId}`);
        if (classes.length > 0) {
          console.log('✅ Class exists:', classes[0]);
        } else {
          console.log('❌ Class not found');
        }
      } catch (error) {
        console.log('❌ Error checking class:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkFKConstraints();