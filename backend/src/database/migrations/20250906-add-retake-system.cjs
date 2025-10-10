'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Starting retake system migration...');
      
      // 1. Thêm các trường mới vào bảng grades
      console.log('📝 Adding new columns to grades table...');
      
      // Kiểm tra xem cột đã tồn tại chưa trước khi thêm
      const gradesTableInfo = await queryInterface.describeTable('Grades');
      
      if (!gradesTableInfo.attempt_number) {
        await queryInterface.addColumn('Grades', 'attempt_number', {
          type: Sequelize.INTEGER,
          defaultValue: 1,
          allowNull: false,
          comment: 'Lần thứ mấy (1=lần đầu, 2=thi lại, 3=học lại lần 1...)'
        }, { transaction });
      }
      
      if (!gradesTableInfo.is_retake) {
        await queryInterface.addColumn('Grades', 'is_retake', {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false,
          comment: 'Có phải là điểm từ thi lại/học lại không'
        }, { transaction });
      }
      
      if (!gradesTableInfo.retake_type) {
        await queryInterface.addColumn('Grades', 'retake_type', {
          type: Sequelize.ENUM('RETAKE_EXAM', 'RETAKE_COURSE'),
          allowNull: true,
          comment: 'Loại thi lại: RETAKE_EXAM (thi lại), RETAKE_COURSE (học lại)'
        }, { transaction });
      }
      
      if (!gradesTableInfo.retake_reason) {
        await queryInterface.addColumn('Grades', 'retake_reason', {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Lý do phải thi lại/học lại'
        }, { transaction });
      }

      // 2. Tạo bảng grade_retakes
      console.log('📋 Creating grade_retakes table...');
      
      await queryInterface.createTable('GradeRetakes', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          comment: 'ID tự động tăng'
        },
        original_grade_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: 'Tham chiếu đến grades.id gốc',
          references: {
            model: 'Grades',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        student_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: 'ID sinh viên',
          references: {
            model: 'Students',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        subject_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: 'ID môn học',
          references: {
            model: 'Subjects',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        enrollment_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: 'ID đăng ký học',
          references: {
            model: 'Enrollments',
            key: 'enrollment_id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        
        // Thông tin lần thi lại/học lại
        retake_type: {
          type: Sequelize.ENUM('RETAKE_EXAM', 'RETAKE_COURSE'),
          allowNull: false,
          comment: 'Loại: RETAKE_EXAM (thi lại điểm thi), RETAKE_COURSE (học lại toàn bộ)'
        },
        attempt_number: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: 'Lần thứ mấy (2, 3, 4...)'
        },
        
        // Điểm của lần thi lại/học lại này
        txScore: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Điểm TX (chỉ có khi học lại - RETAKE_COURSE)'
        },
        dkScore: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Điểm DK (chỉ có khi học lại - RETAKE_COURSE)'
        },
        finalScore: {
          type: Sequelize.DECIMAL(4, 2),
          allowNull: true,
          comment: 'Điểm thi lại',
          validate: {
            min: 0,
            max: 10
          }
        },
        tbktScore: {
          type: Sequelize.DECIMAL(4, 2),
          allowNull: true,
          comment: 'TBKT (copy từ lần trước nếu RETAKE_EXAM)',
          validate: {
            min: 0,
            max: 10
          }
        },
        tbmhScore: {
          type: Sequelize.DECIMAL(4, 2),
          allowNull: true,
          comment: 'TBMH mới tính',
          validate: {
            min: 0,
            max: 10
          }
        },
        
        // Kết quả và metadata
        result_status: {
          type: Sequelize.ENUM('PASS', 'FAIL_EXAM', 'FAIL_TBKT', 'PENDING'),
          allowNull: false,
          defaultValue: 'PENDING',
          comment: 'Kết quả lần thi lại/học lại này'
        },
        is_current: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          comment: 'Có phải điểm hiện tại có hiệu lực không'
        },
        retake_reason: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Lý do thi lại: "Điểm thi = 4.5 < 5", "TBKT = 4.2 < 5"'
        },
        
        // Thông tin học kỳ
        semester: {
          type: Sequelize.STRING(10),
          allowNull: false,
          comment: 'Học kỳ thi lại (HK1, HK2, HK3)'
        },
        academic_year: {
          type: Sequelize.STRING(10),
          allowNull: false,
          comment: 'Năm học thi lại (VD: 2024-25)'
        },
        
        // Timestamps
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          comment: 'Thời gian tạo record thi lại'
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
          comment: 'Thời gian cập nhật cuối'
        }
      }, { 
        transaction,
        comment: 'Bảng lưu lịch sử thi lại và học lại của sinh viên'
      });

      // 3. Tạo các index để tối ưu performance
      console.log('🔍 Creating indexes...');
      
      await queryInterface.addIndex('GradeRetakes', {
        fields: ['student_id', 'subject_id'],
        name: 'idx_grade_retakes_student_subject',
        transaction
      });
      
      await queryInterface.addIndex('GradeRetakes', {
        fields: ['original_grade_id'],
        name: 'idx_grade_retakes_original_grade',
        transaction
      });
      
      await queryInterface.addIndex('GradeRetakes', {
        fields: ['retake_type', 'result_status'],
        name: 'idx_grade_retakes_type_status',
        transaction
      });
      
      await queryInterface.addIndex('GradeRetakes', {
        fields: ['is_current'],
        name: 'idx_grade_retakes_is_current',
        transaction
      });

      // 4. Cập nhật dữ liệu hiện tại (set attempt_number = 1 cho tất cả records hiện có)
      console.log('🔄 Updating existing grade records...');
      
      await queryInterface.sequelize.query(
        `UPDATE Grades SET 
         attempt_number = 1, 
         is_retake = false, 
         retake_type = NULL 
         WHERE attempt_number IS NULL OR attempt_number = 0`,
        { transaction }
      );

      await transaction.commit();
      console.log('✅ Retake system migration completed successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Reverting retake system migration...');
      
      // 1. Xóa bảng grade_retakes
      console.log('🗑️ Dropping GradeRetakes table...');
      await queryInterface.dropTable('GradeRetakes', { transaction });
      
      // 2. Xóa các cột đã thêm vào bảng grades
      console.log('🗑️ Removing columns from Grades table...');
      
      const gradesTableInfo = await queryInterface.describeTable('Grades');
      
      if (gradesTableInfo.retake_reason) {
        await queryInterface.removeColumn('Grades', 'retake_reason', { transaction });
      }
      
      if (gradesTableInfo.retake_type) {
        await queryInterface.removeColumn('Grades', 'retake_type', { transaction });
      }
      
      if (gradesTableInfo.is_retake) {
        await queryInterface.removeColumn('Grades', 'is_retake', { transaction });
      }
      
      if (gradesTableInfo.attempt_number) {
        await queryInterface.removeColumn('Grades', 'attempt_number', { transaction });
      }

      await transaction.commit();
      console.log('✅ Migration rollback completed successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration rollback failed:', error);
      throw error;
    }
  }
};
