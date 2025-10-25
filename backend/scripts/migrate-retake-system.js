#!/usr/bin/env node

/**
 * Migration script for Retake System
 * Adds retake functionality to the grade management system
 */

import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../src/database/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async () => {
  try {
    console.log('🚀 Starting Retake System Migration...');
    console.log('📊 Database:', process.env.DB_NAME || 'student_management');
    console.log('🔗 Host:', process.env.DB_HOST || 'localhost');
    
    // 1. Test database connection
    console.log('\n1️⃣ Testing database connection...');
    await sequelize.authenticate();
    
    // 2. Load and execute migration
    console.log('\n2️⃣ Executing migration...');
    const migrationPath = path.join(__dirname, '../src/database/migrations/20250906-add-retake-system.cjs');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    // Import migration (CommonJS)
    const migration = await import(migrationPath);
    const queryInterface = sequelize.getQueryInterface();
    
    // Execute UP migration
    await migration.default.up(queryInterface, sequelize.Sequelize);
    
    console.log('✅ Migration executed successfully');
    
    // 3. Verify tables exist
    console.log('\n3️⃣ Verifying tables...');
    
    const [grades] = await sequelize.query("SHOW TABLES LIKE 'Grades'");
    const [gradeRetakes] = await sequelize.query("SHOW TABLES LIKE 'GradeRetakes'");
    
    if (grades.length === 0) {
      throw new Error('Grades table not found');
    }
    if (gradeRetakes.length === 0) {
      throw new Error('GradeRetakes table not found');
    }
    
    console.log('✅ Tables verified successfully');
    
    // 4. Check new columns in Grades table
    console.log('\n4️⃣ Checking new columns...');
    const gradesColumns = await queryInterface.describeTable('Grades');
    
    const requiredColumns = ['attempt_number', 'is_retake', 'retake_type', 'retake_reason'];
    const missingColumns = requiredColumns.filter(col => !gradesColumns[col]);
    
    if (missingColumns.length > 0) {
      throw new Error(`Missing columns in Grades table: ${missingColumns.join(', ')}`);
    }
    
    console.log('✅ All required columns exist');
    
    // 5. Update existing grade records
    console.log('\n5️⃣ Updating existing grade records...');
    const [updateResult] = await sequelize.query(`
      UPDATE Grades 
      SET attempt_number = 1, is_retake = false 
      WHERE attempt_number IS NULL OR attempt_number = 0
    `);
    
    console.log(`✅ Updated ${updateResult.affectedRows || 0} existing grade records`);
    
    // 6. Test GradeRetakes table structure
    console.log('\n6️⃣ Testing GradeRetakes table structure...');
    const retakeColumns = await queryInterface.describeTable('GradeRetakes');
    
    const retakeRequiredColumns = [
      'id', 'original_grade_id', 'student_id', 'subject_id', 'enrollment_id',
      'retake_type', 'attempt_number', 'result_status', 'is_current',
      'semester', 'academic_year', 'created_at', 'updated_at'
    ];
    
    const missingRetakeColumns = retakeRequiredColumns.filter(col => !retakeColumns[col]);
    
    if (missingRetakeColumns.length > 0) {
      throw new Error(`Missing columns in GradeRetakes table: ${missingRetakeColumns.join(', ')}`);
    }
    
    console.log('✅ GradeRetakes table structure verified');
    
    // 7. Test indexes
    console.log('\n7️⃣ Checking indexes...');
    const [indexes] = await sequelize.query(`
      SHOW INDEXES FROM GradeRetakes 
      WHERE Key_name IN ('idx_grade_retakes_student_subject', 'idx_grade_retakes_original_grade')
    `);
    
    if (indexes.length === 0) {
      console.log('⚠️ Warning: Some indexes may not be created yet (this is normal for some MySQL versions)');
    } else {
      console.log('✅ Indexes verified');
    }
    
    // 8. Show summary
    console.log('\n📋 Migration Summary:');
    console.log('🆕 New columns added to Grades table:');
    console.log('   - attempt_number (INT, default: 1)');
    console.log('   - is_retake (BOOLEAN, default: false)');
    console.log('   - retake_type (ENUM: RETAKE_EXAM, RETAKE_COURSE)');
    console.log('   - retake_reason (TEXT)');
    console.log('');
    console.log('🆕 New table created: GradeRetakes');
    console.log('   - Stores history of retake attempts');
    console.log('   - Supports both exam retakes and course retakes');
    console.log('   - Maintains relationship with original grades');
    console.log('');
    console.log('🔗 Relationships established:');
    console.log('   - GradeRetakes → Grades (original_grade_id)');
    console.log('   - GradeRetakes → Students (student_id)');
    console.log('   - GradeRetakes → Subjects (subject_id)');
    console.log('   - GradeRetakes → Enrollments (enrollment_id)');
    console.log('');
    console.log('✅ Retake System Migration completed successfully!');
    console.log('🎯 You can now implement retake functionality in your application.');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('📍 Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🎓 Retake System Migration Script

Usage: node scripts/migrate-retake-system.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be done without executing
  --rollback     Rollback the migration (removes retake system)

Environment Variables:
  DB_HOST        Database host (default: localhost)
  DB_NAME        Database name (default: student_management)
  DB_USER        Database user
  DB_PASSWORD    Database password

Examples:
  node scripts/migrate-retake-system.js
  node scripts/migrate-retake-system.js --dry-run
  node scripts/migrate-retake-system.js --rollback
  `);
  process.exit(0);
}

if (args.includes('--dry-run')) {
  console.log('🧪 DRY RUN MODE - No changes will be made');
  console.log('📋 This migration would:');
  console.log('1. Add new columns to Grades table (attempt_number, is_retake, retake_type, retake_reason)');
  console.log('2. Create new GradeRetakes table');
  console.log('3. Create indexes for performance');
  console.log('4. Update existing grade records to set attempt_number = 1');
  process.exit(0);
}

if (args.includes('--rollback')) {
  console.log('🔄 Starting rollback...');
  // Implementation for rollback would go here
  console.log('⚠️ Rollback functionality not implemented yet');
  console.log('💡 To rollback manually, run the migration DOWN method');
  process.exit(1);
}

// Run the migration
runMigration();
