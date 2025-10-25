// Script để fix foreign key constraints trên Railway
import { sequelize } from './backend/src/database/index.js';

async function fixForeignKeys() {
  try {
    console.log('🔧 Fixing foreign key constraints...');

    // Disable foreign key checks temporarily
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log('✅ Disabled foreign key checks');

    // Get current constraints
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
    `);

    console.log('📋 Current FK constraints on Enrollments:');
    constraints.forEach(constraint => {
      console.log(`  ${constraint.CONSTRAINT_NAME}: ${constraint.TABLE_NAME}.${constraint.COLUMN_NAME} -> ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`);
    });

    // Drop all existing FK constraints on Enrollments table
    console.log('🗑️ Dropping existing FK constraints...');
    const fkConstraints = ['enrollments_ibfk_1', 'enrollments_ibfk_2', 'enrollments_ibfk_3'];
    
    for (const constraintName of fkConstraints) {
      try {
        await sequelize.query(`ALTER TABLE Enrollments DROP FOREIGN KEY \`${constraintName}\``);
        console.log(`✅ Dropped FK: ${constraintName}`);
      } catch (error) {
        // Constraint might not exist, continue
        console.log(`ℹ️ FK ${constraintName} not found or already dropped`);
      }
    }

    // Add correct foreign key constraints
    console.log('🔗 Adding correct FK constraints...');

    // Add student_id FK
    await sequelize.query(`
      ALTER TABLE Enrollments
      ADD CONSTRAINT enrollments_ibfk_1
      FOREIGN KEY (student_id) REFERENCES students(id)
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
    console.log('✅ Added FK: enrollments_ibfk_1 (student_id -> students.id)');

    // Add class_id FK
    await sequelize.query(`
      ALTER TABLE Enrollments
      ADD CONSTRAINT enrollments_ibfk_2
      FOREIGN KEY (class_id) REFERENCES Classes(id)
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
    console.log('✅ Added FK: enrollments_ibfk_2 (class_id -> Classes.id)');

    // Add subject_id FK
    await sequelize.query(`
      ALTER TABLE Enrollments
      ADD CONSTRAINT enrollments_ibfk_3
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
    console.log('✅ Added FK: enrollments_ibfk_3 (subject_id -> subjects.id)');

    // Re-enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Re-enabled foreign key checks');

    console.log('🎉 Foreign key constraints fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing FK constraints:', error.message);
    // Try to re-enable FK checks even if error occurred
    try {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (e) {
      console.error('❌ Could not re-enable FK checks:', e.message);
    }
  } finally {
    await sequelize.close();
  }
}

fixForeignKeys();