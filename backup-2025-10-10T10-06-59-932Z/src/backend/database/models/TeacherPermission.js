/**
 * TeacherPermission Model
 * Quản lý quyền nhập điểm của giảng viên
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config.js';

const TeacherPermission = sequelize.define('TeacherPermission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID quyền'
  },

  // User được gán quyền
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'ID người dùng'
  },

  // Phạm vi quyền - NULL = "Tất cả"
  classId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Classes',
      key: 'id'
    },
    comment: 'ID lớp (NULL = tất cả lớp)'
  },

  subjectId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Subjects',
      key: 'id'
    },
    comment: 'ID môn học (NULL = tất cả môn)'
  },

  cohortId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Cohorts',
      key: 'cohort_id'
    },
    comment: 'ID khóa học (NULL = tất cả khóa)'
  },

  semesterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Semesters',
      key: 'semester_id'
    },
    comment: 'ID học kỳ (bắt buộc)'
  },

  // Thời gian hiệu lực
  validFrom: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Ngày bắt đầu'
  },

  validTo: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Ngày kết thúc'
  },

  // Trạng thái
  status: {
    type: DataTypes.ENUM('active', 'expired', 'revoked'),
    defaultValue: 'active',
    comment: 'Trạng thái quyền'
  },

  // Ghi chú
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Ghi chú'
  },

  // Audit trail
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID người tạo'
  }
}, {
  tableName: 'teacher_permissions',
  timestamps: true,
  indexes: [
    {
      name: 'idx_user_semester',
      fields: ['userId', 'semesterId']
    },
    {
      name: 'idx_user_status',
      fields: ['userId', 'status']
    },
    {
      name: 'idx_valid_dates',
      fields: ['validFrom', 'validTo']
    },
    {
      name: 'idx_class_subject',
      fields: ['classId', 'subjectId']
    }
  ],
  hooks: {
    // Validate ngày tháng
    beforeValidate: (permission) => {
      if (permission.validFrom && permission.validTo) {
        const from = new Date(permission.validFrom);
        const to = new Date(permission.validTo);
        
        if (to <= from) {
          throw new Error('Ngày kết thúc phải sau ngày bắt đầu');
        }
      }
    },

    // Auto-update status khi tạo mới
    beforeCreate: (permission) => {
      const now = new Date();
      const validFrom = new Date(permission.validFrom);
      const validTo = new Date(permission.validTo);

      if (now < validFrom) {
        permission.status = 'active'; // Sẽ active trong tương lai
      } else if (now > validTo) {
        permission.status = 'expired';
      } else {
        permission.status = 'active';
      }
    }
  }
});

// Instance methods
TeacherPermission.prototype.isActive = function() {
  const now = new Date();
  const validFrom = new Date(this.validFrom);
  const validTo = new Date(this.validTo);

  return this.status === 'active' && 
         now >= validFrom && 
         now <= validTo;
};

TeacherPermission.prototype.isExpired = function() {
  const now = new Date();
  const validTo = new Date(this.validTo);
  
  return now > validTo || this.status === 'expired';
};

TeacherPermission.prototype.getScopeDescription = function() {
  const parts = [];
  
  if (this.Class) {
    parts.push(`Lớp: ${this.Class.className}`);
  } else {
    parts.push('Lớp: [Tất cả]');
  }
  
  if (this.Subject) {
    parts.push(`Môn: ${this.Subject.subjectName}`);
  } else {
    parts.push('Môn: [Tất cả]');
  }
  
  if (this.Cohort) {
    parts.push(`Khóa: ${this.Cohort.cohortName}`);
  } else {
    parts.push('Khóa: [Tất cả]');
  }
  
  if (this.Semester) {
    parts.push(`HK: ${this.Semester.semesterName}`);
  }
  
  return parts.join(' | ');
};

// Class methods
TeacherPermission.getActivePermissions = async function(userId) {
  return await this.findAll({
    where: {
      userId,
      status: 'active',
      validFrom: { [sequelize.Sequelize.Op.lte]: new Date() },
      validTo: { [sequelize.Sequelize.Op.gte]: new Date() }
    },
    include: [
      { model: sequelize.models.Class, as: 'Class' },
      { model: sequelize.models.Subject, as: 'Subject' },
      { model: sequelize.models.Cohort, as: 'Cohort' },
      { model: sequelize.models.Semester, as: 'Semester' }
    ],
    order: [['validTo', 'DESC']]
  });
};

TeacherPermission.checkPermission = async function(userId, enrollmentId) {
  const Enrollment = sequelize.models.Enrollment;
  
  // Lấy thông tin enrollment
  const enrollment = await Enrollment.findByPk(enrollmentId);
  if (!enrollment) return false;

  // Lấy tất cả quyền active của user
  const permissions = await this.getActivePermissions(userId);
  if (!permissions || permissions.length === 0) return false;

  // Kiểm tra từng quyền
  for (const perm of permissions) {
    const classMatch = !perm.classId || perm.classId === enrollment.classId;
    const subjectMatch = !perm.subjectId || perm.subjectId === enrollment.subjectId;
    const cohortMatch = !perm.cohortId || perm.cohortId === enrollment.cohortId;
    const semesterMatch = perm.semesterId === enrollment.semesterId;

    if (classMatch && subjectMatch && cohortMatch && semesterMatch) {
      return true; // Tìm thấy quyền phù hợp
    }
  }

  return false;
};

// Associations sẽ được định nghĩa trong index.js
TeacherPermission.associate = function(models) {
  TeacherPermission.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'User'
  });

  TeacherPermission.belongsTo(models.Class, {
    foreignKey: 'classId',
    as: 'Class'
  });

  TeacherPermission.belongsTo(models.Subject, {
    foreignKey: 'subjectId',
    as: 'Subject'
  });

  TeacherPermission.belongsTo(models.Cohort, {
    foreignKey: 'cohortId',
    as: 'Cohort'
  });

  TeacherPermission.belongsTo(models.Semester, {
    foreignKey: 'semesterId',
    as: 'Semester'
  });

  TeacherPermission.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'Creator'
  });
};

export default TeacherPermission;
