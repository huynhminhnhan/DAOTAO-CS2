/**
 * Enrollment Model - Bảng Đăng ký học
 * Liên kết sinh viên - lớp - môn - học kỳ
 */
import { DataTypes } from 'sequelize';
import { sequelize } from '../config.js';

const Enrollment = sequelize.define('Enrollment', {
  enrollmentId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'enrollment_id',
    comment: 'ID đăng ký học'
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'student_id',
    comment: 'ID sinh viên',
    references: {
      model: 'Students',
      key: 'id'
    }
  },
  classId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'class_id',
    comment: 'ID lớp học',
    references: {
      model: 'classes', // ✅ Sửa từ 'Classes' thành 'classes'
      key: 'id'
    }
  },
  subjectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'subject_id',
    comment: 'ID môn học',
    references: {
      model: 'subjects', // ✅ Sửa từ 'Subjects' thành 'subjects'
      key: 'id'
    }
  },
  cohortId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'cohort_id',
    references: {
      model: 'Cohorts',
      key: 'cohort_id'
    },
    comment: 'ID Khóa học (liên kết bảng Cohorts)'
  },
  semesterId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'semester_id',
    references: {
      model: 'Semesters',
      key: 'semester_id'
    },
    comment: 'ID học kỳ (liên kết bảng Semesters)'
  },
  attempt: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: false,
    comment: 'Lần học (1: lần đầu, 2: học lại, 3: học cải thiện)',
    validate: {
      min: 1,
      max: 10
    }
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Ghi chú thêm về đăng ký'
  },
  enrollmentDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    field: 'enrollment_date',
    comment: 'Ngày đăng ký'
  },
  status: {
    type: DataTypes.ENUM('active', 'withdrawn', 'completed', 'failed'),
    defaultValue: 'active',
    allowNull: false,
    comment: 'Trạng thái đăng ký: active (đang học), withdrawn (rút khỏi), completed (hoàn thành), failed (trượt)'
  }
}, {
  tableName: 'Enrollments',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'class_id', 'subject_id', 'attempt'],
      name: 'unique_enrollment'
    },
    {
      fields: ['student_id']
    },
    {
      fields: ['class_id']
    },
    {
      fields: ['subject_id']
    },
    {
      fields: ['status']
    }
  ],
  hooks: {
    beforeValidate: (enrollment) => {
     
    }
  }
});

// Instance methods
Enrollment.prototype.isActive = function() {
  return this.status === 'active';
};

Enrollment.prototype.canRetake = function() {
  return this.status === 'failed' && this.attempt < 3;
};

Enrollment.prototype.getDisplayInfo = function() {
  return {
    enrollmentId: this.enrollmentId,
    semester: this.semester,
    attempt: this.attempt,
    status: this.status,
    enrollmentDate: this.enrollmentDate,
    note: this.note
  };
};

// Static methods
Enrollment.getActiveEnrollments = async function(studentId, semester = null) {
  const whereClause = {
    studentId,
    status: 'active'
  };
  
  if (semester) {
    whereClause.semester = semester;
  }
  
  return await this.findAll({
    where: whereClause,
    include: ['Student', 'Class', 'Subject'],
    order: [['enrollmentDate', 'DESC']]
  });
};

Enrollment.getClassEnrollments = async function(classId, subjectId, semester) {
  return await this.findAll({
    where: {
      classId,
      subjectId,
      semester,
      status: 'active'
    },
    include: ['Student'],
    order: [['Student', 'studentCode', 'ASC']]
  });
};

export default Enrollment;

// Associations
Enrollment.associate = (models) => {
  Enrollment.belongsTo(models.Student, { foreignKey: 'studentId', as: 'student' });
  Enrollment.belongsTo(models.Class, { foreignKey: 'classId', as: 'class' });
  Enrollment.belongsTo(models.Subject, { foreignKey: 'subjectId', as: 'subject' });
  Enrollment.belongsTo(models.Cohort, { foreignKey: 'cohortId', as: 'cohort' });
  Enrollment.belongsTo(models.Semester, { foreignKey: 'semesterId', as: 'semesterInfo' });
  Enrollment.hasMany(models.Grade, { foreignKey: 'enrollmentId', as: 'grades', onDelete: 'CASCADE' });
};
