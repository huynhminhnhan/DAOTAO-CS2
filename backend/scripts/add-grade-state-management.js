/**
 * Migration Script: Add Grade State Management
 * Thêm các column và table để quản lý trạng thái nhập điểm
 */

import { sequelize } from '../src/backend/database/config.js';

// Helper function to check if column exists
const columnExists = async (tableName, columnName) => {
  const [results] = await sequelize.query(`
    SELECT COUNT(*) as count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = '${tableName}'
    AND COLUMN_NAME = '${columnName}'
  `);
  return results[0].count > 0;
};

const addGradeStateManagement = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🚀 Starting Grade State Management migration...');
    
    // 1. Add grade_status column
    console.log('📝 Checking grade_status column...');
    if (!(await columnExists('Grades', 'grade_status'))) {
      console.log('   Adding grade_status column...');
      await sequelize.query(`
        ALTER TABLE Grades 
        ADD COLUMN grade_status 
        ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED_TX_DK', 'FINAL_ENTERED', 'FINALIZED') 
        DEFAULT 'DRAFT'
        AFTER notes
      `, { transaction });
    } else {
      console.log('   ✓ grade_status column already exists');
    }
    
    // 2. Add lock_status column (JSON)
    console.log('📝 Checking lock_status column...');
    if (!(await columnExists('Grades', 'lock_status'))) {
      console.log('   Adding lock_status column...');
      await sequelize.query(`
        ALTER TABLE Grades 
        ADD COLUMN lock_status JSON
        DEFAULT NULL
        AFTER grade_status
      `, { transaction });
    } else {
      console.log('   ✓ lock_status column already exists');
    }
    
    // 3. Add locked_by column
    console.log('📝 Checking locked_by column...');
    if (!(await columnExists('Grades', 'locked_by'))) {
      console.log('   Adding locked_by column...');
      await sequelize.query(`
        ALTER TABLE Grades 
        ADD COLUMN locked_by INT NULL
        AFTER lock_status,
        ADD FOREIGN KEY (locked_by) REFERENCES Users(id) ON DELETE SET NULL
      `, { transaction });
    } else {
      console.log('   ✓ locked_by column already exists');
    }
    
    // 4. Add locked_at column
    console.log('📝 Checking locked_at column...');
    if (!(await columnExists('Grades', 'locked_at'))) {
      console.log('   Adding locked_at column...');
      await sequelize.query(`
        ALTER TABLE Grades 
        ADD COLUMN locked_at DATETIME NULL
        AFTER locked_by
      `, { transaction });
    } else {
      console.log('   ✓ locked_at column already exists');
    }
    
    // 5. Add submitted_for_review_at column
    console.log('📝 Checking submitted_for_review_at column...');
    if (!(await columnExists('Grades', 'submitted_for_review_at'))) {
      console.log('   Adding submitted_for_review_at column...');
      await sequelize.query(`
        ALTER TABLE Grades 
        ADD COLUMN submitted_for_review_at DATETIME NULL
        AFTER locked_at
      `, { transaction });
    } else {
      console.log('   ✓ submitted_for_review_at column already exists');
    }
    
    // 6. Add approved_by column
    console.log('📝 Checking approved_by column...');
    if (!(await columnExists('Grades', 'approved_by'))) {
      console.log('   Adding approved_by column...');
      await sequelize.query(`
        ALTER TABLE Grades 
        ADD COLUMN approved_by INT NULL
        AFTER submitted_for_review_at,
        ADD FOREIGN KEY (approved_by) REFERENCES Users(id) ON DELETE SET NULL
      `, { transaction });
    } else {
      console.log('   ✓ approved_by column already exists');
    }
    
    // 7. Add approved_at column
    console.log('📝 Checking approved_at column...');
    if (!(await columnExists('Grades', 'approved_at'))) {
      console.log('   Adding approved_at column...');
      await sequelize.query(`
        ALTER TABLE Grades 
        ADD COLUMN approved_at DATETIME NULL
        AFTER approved_by
      `, { transaction });
    } else {
      console.log('   ✓ approved_at column already exists');
    }
    
    // 8. Add finalized_by column
    console.log('📝 Checking finalized_by column...');
    if (!(await columnExists('Grades', 'finalized_by'))) {
      console.log('   Adding finalized_by column...');
      await sequelize.query(`
        ALTER TABLE Grades 
        ADD COLUMN finalized_by INT NULL
        AFTER approved_at,
        ADD FOREIGN KEY (finalized_by) REFERENCES Users(id) ON DELETE SET NULL
      `, { transaction });
    } else {
      console.log('   ✓ finalized_by column already exists');
    }
    
    // 9. Add finalized_at column
    console.log('📝 Checking finalized_at column...');
    if (!(await columnExists('Grades', 'finalized_at'))) {
      console.log('   Adding finalized_at column...');
      await sequelize.query(`
        ALTER TABLE Grades 
        ADD COLUMN finalized_at DATETIME NULL
        AFTER finalized_by
      `, { transaction });
    } else {
      console.log('   ✓ finalized_at column already exists');
    }
    
    // 10. Add version column
    console.log('📝 Checking version column...');
    if (!(await columnExists('Grades', 'version'))) {
      console.log('   Adding version column...');
      await sequelize.query(`
        ALTER TABLE Grades 
        ADD COLUMN version INT DEFAULT 1
        AFTER finalized_at
      `, { transaction });
    } else {
      console.log('   ✓ version column already exists');
    }
    
    // 11. Create GradeStateTransitions table
    console.log('📝 Creating GradeStateTransitions table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS GradeStateTransitions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        gradeId INT NOT NULL,
        fromState VARCHAR(50),
        toState VARCHAR(50) NOT NULL,
        triggeredBy INT NOT NULL,
        triggeredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        reason TEXT,
        metadata JSON,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_grade (gradeId),
        INDEX idx_triggered_by (triggeredBy),
        FOREIGN KEY (gradeId) REFERENCES Grades(id) ON DELETE CASCADE,
        FOREIGN KEY (triggeredBy) REFERENCES Users(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `, { transaction });
    console.log('   ✓ GradeStateTransitions table created');
    
    // 12. Add indexes for performance
    console.log('📝 Adding indexes...');
    try {
      await sequelize.query(`
        CREATE INDEX idx_grade_status ON Grades(grade_status)
      `, { transaction });
      console.log('   ✓ Index on grade_status created');
    } catch (err) {
      if (err.original?.code === 'ER_DUP_KEYNAME') {
        console.log('   ✓ Index on grade_status already exists');
      } else {
        throw err;
      }
    }
    
    try {
      await sequelize.query(`
        CREATE INDEX idx_locked_by ON Grades(locked_by)
      `, { transaction });
      console.log('   ✓ Index on locked_by created');
    } catch (err) {
      if (err.original?.code === 'ER_DUP_KEYNAME') {
        console.log('   ✓ Index on locked_by already exists');
      } else {
        throw err;
      }
    }
    
    // 13. Initialize lock_status for existing grades
    console.log('📝 Initializing lock_status for existing grades...');
    await sequelize.query(`
      UPDATE Grades 
      SET lock_status = JSON_OBJECT(
        'txLocked', false,
        'dkLocked', false,
        'finalLocked', false
      )
      WHERE lock_status IS NULL
    `, { transaction });
    console.log('   ✓ lock_status initialized');
    
    await transaction.commit();
    console.log('✅ Migration completed successfully!');
    
    // Summary
    console.log('\n📊 Summary:');
    console.log('✓ Added grade_status column (DRAFT, PENDING_REVIEW, APPROVED_TX_DK, FINAL_ENTERED, FINALIZED)');
    console.log('✓ Added lock_status column (JSON)');
    console.log('✓ Added state tracking columns (locked_by, locked_at, submitted_for_review_at)');
    console.log('✓ Added approval columns (approved_by, approved_at)');
    console.log('✓ Added finalization columns (finalized_by, finalized_at)');
    console.log('✓ Added version column for optimistic locking');
    console.log('✓ Created GradeStateTransitions table for audit trail');
    console.log('✓ Added indexes for performance');
    console.log('✓ Initialized lock_status for existing grades');
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Run migration
addGradeStateManagement()
  .then(() => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
