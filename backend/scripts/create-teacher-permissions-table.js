/**
 * Migration script: Tạo bảng teacher_permissions
 * Chạy: node scripts/create-teacher-permissions-table.js
 */

import { sequelize } from '../src/backend/database/config.js';

async function createTeacherPermissionsTable() {
  try {
    console.log('🔄 Bắt đầu tạo bảng teacher_permissions...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS teacher_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        
        -- User được gán quyền
        userId INT NOT NULL,
        
        -- Phạm vi quyền nhập điểm
        classId INT NULL COMMENT 'NULL = tất cả các lớp',
        subjectId INT NULL COMMENT 'NULL = tất cả các môn',
        cohortId INT NULL COMMENT 'NULL = tất cả các khóa',
        semesterId INT NOT NULL COMMENT 'Bắt buộc chọn học kỳ',
        
        -- Thời gian có hiệu lực
        validFrom DATE NOT NULL,
        validTo DATE NOT NULL,
        
        -- Trạng thái
        status ENUM('active', 'expired', 'revoked') DEFAULT 'active',
        
        -- Ghi chú
        notes TEXT NULL,
        
        -- Audit trail
        createdBy INT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Foreign Keys
        CONSTRAINT fk_tp_user FOREIGN KEY (userId) 
          REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_tp_class FOREIGN KEY (classId) 
          REFERENCES Classes(id) ON DELETE CASCADE,
        CONSTRAINT fk_tp_subject FOREIGN KEY (subjectId) 
          REFERENCES Subjects(id) ON DELETE CASCADE,
        CONSTRAINT fk_tp_cohort FOREIGN KEY (cohortId) 
          REFERENCES Cohorts(cohort_id) ON DELETE CASCADE,
        CONSTRAINT fk_tp_semester FOREIGN KEY (semesterId) 
          REFERENCES Semesters(semester_id) ON DELETE CASCADE,
        
        -- Indexes để tối ưu query
        INDEX idx_user_semester (userId, semesterId),
        INDEX idx_user_status (userId, status),
        INDEX idx_valid_dates (validFrom, validTo),
        INDEX idx_class_subject (classId, subjectId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Quản lý quyền nhập điểm của giảng viên';
    `);

    console.log('✅ Tạo bảng teacher_permissions thành công!');

    // Tạo bảng audit logs (tùy chọn)
    console.log('🔄 Tạo bảng permission_audit_logs...');
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS permission_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        permissionId INT NOT NULL,
        action ENUM('created', 'updated', 'revoked', 'expired') NOT NULL,
        changedBy INT NULL,
        changeDetails JSON NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_pal_permission FOREIGN KEY (permissionId) 
          REFERENCES teacher_permissions(id) ON DELETE CASCADE,
        
        INDEX idx_permission (permissionId),
        INDEX idx_action (action),
        INDEX idx_created (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Lịch sử thay đổi quyền nhập điểm';
    `);

    console.log('✅ Tạo bảng permission_audit_logs thành công!');
    console.log('🎉 Migration hoàn tất!');

  } catch (error) {
    console.error('❌ Lỗi khi tạo bảng:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Chạy migration
createTeacherPermissionsTable();
