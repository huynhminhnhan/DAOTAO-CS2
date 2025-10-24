/**
 * Migration: Add retake scoring fields to support grade history workflow
 * Thêm các fields để hỗ trợ workflow nhập điểm thi lại/học lại
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../src/database/index.js';

const migrate = {
  async up() {
    console.log('🔄 Starting retake scoring migration...');
    
    try {
      // 1. Add fields to grades table for tracking retake status
      await sequelize.getQueryInterface().addColumn('grades', 'current_attempt', {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        comment: 'Lần học hiện tại (1=lần đầu, 2=lần 2, etc.)'
      });

      await sequelize.getQueryInterface().addColumn('grades', 'is_retake_result', {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'TRUE nếu điểm này là kết quả từ thi lại/học lại'
      });

      await sequelize.getQueryInterface().addColumn('grades', 'last_retake_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Reference đến retake record cuối cùng'
      });

      // 2. Add scoring fields to grade_retakes table
      await sequelize.getQueryInterface().addColumn('GradeRetakes', 'retake_tx_score', {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Điểm TX của lần thi lại này (JSON format)'
      });

      await sequelize.getQueryInterface().addColumn('GradeRetakes', 'retake_dk_score', {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Điểm DK của lần thi lại này (JSON format)'
      });

      await sequelize.getQueryInterface().addColumn('GradeRetakes', 'retake_final_score', {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Điểm thi cuối của lần thi lại này'
      });

      await sequelize.getQueryInterface().addColumn('GradeRetakes', 'retake_tbkt_score', {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'TBKT của lần thi lại này'
      });

      await sequelize.getQueryInterface().addColumn('GradeRetakes', 'retake_tbmh_score', {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'TBMH của lần thi lại này'
      });

      await sequelize.getQueryInterface().addColumn('GradeRetakes', 'is_passed', {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        comment: 'TRUE nếu lần thi lại này đạt điều kiện'
      });

      await sequelize.getQueryInterface().addColumn('GradeRetakes', 'completed_at', {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Thời điểm hoàn thành lần thi lại'
      });

      console.log('✅ Retake scoring migration completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  async down() {
    console.log('🔄 Rolling back retake scoring migration...');
    
    try {
      // Remove columns from grades
      await sequelize.getQueryInterface().removeColumn('grades', 'current_attempt');
      await sequelize.getQueryInterface().removeColumn('grades', 'is_retake_result');
      await sequelize.getQueryInterface().removeColumn('grades', 'last_retake_id');

      // Remove columns from grade_retakes
      await sequelize.getQueryInterface().removeColumn('GradeRetakes', 'retake_tx_score');
      await sequelize.getQueryInterface().removeColumn('GradeRetakes', 'retake_dk_score');
      await sequelize.getQueryInterface().removeColumn('GradeRetakes', 'retake_final_score');
      await sequelize.getQueryInterface().removeColumn('GradeRetakes', 'retake_tbkt_score');
      await sequelize.getQueryInterface().removeColumn('GradeRetakes', 'retake_tbmh_score');
      await sequelize.getQueryInterface().removeColumn('GradeRetakes', 'is_passed');
      await sequelize.getQueryInterface().removeColumn('GradeRetakes', 'completed_at');

      console.log('✅ Rollback completed successfully!');
      
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};

// Run migration
async function runMigration() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    await migrate.up();
    
    console.log('🎉 Migration completed! You can now use the enhanced retake scoring system.');
    process.exit(0);
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
