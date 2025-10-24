import { DataTypes } from 'sequelize';
import { sequelize } from '../config.js';

const Class = sequelize.define('Class', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID lớp học tự động tăng'
  },
  classCode: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'Mã lớp học duy nhất (VD: K22CNTT1)',
    validate: {
      notEmpty: true,
      len: [3, 20]
    }
  },
  className: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Tên lớp học',
    validate: {
      notEmpty: true,
      len: [5, 200]
    }
  },
  homeroomTeacherId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID giáo viên chủ nhiệm',
    references: {
      model: 'teachers',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  },
  trainingTeacherId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID giáo viên đào tạo',
    references: {
      model: 'teachers',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  },
  examTeacherId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID giáo viên khảo thí',
    references: {
      model: 'teachers',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  },
  cohortId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'cohort_id',
    comment: 'ID khóa học (liên kết với bảng Cohorts)',
    references: {
      model: 'Cohorts',
      key: 'cohort_id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  },
  startYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Năm bắt đầu khóa học (VD: 2023)',
    validate: {
      min: 2020,
      max: 2050
    }
  },
  endYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Năm kết thúc khóa học (VD: 2027)',
    validate: {
      min: 2020,
      max: 2050
    }
  },
  maxStudents: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 40,
    comment: 'Số sinh viên tối đa'
  },
  currentStudents: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    comment: 'Số sinh viên hiện tại'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'graduated'),
    defaultValue: 'active',
    comment: 'Trạng thái lớp học'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Ngày tạo'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Ngày cập nhật'
  }
}, {
  tableName: 'Classes',
  timestamps: true,
  paranoid: false,
  comment: 'Bảng lớp học cố định suốt khóa'
});

export default Class;
// Associations
Class.associate = (models) => {
  Class.hasMany(models.Student, {
    foreignKey: 'classId',
    as: 'students',
    onDelete: 'RESTRICT'
  });

  Class.belongsTo(models.Teacher, {
    foreignKey: 'homeroomTeacherId',
    as: 'homeroomTeacher'
  });

  Class.belongsTo(models.Teacher, {
    foreignKey: 'trainingTeacherId',
    as: 'trainingTeacher'
  });

  Class.belongsTo(models.Teacher, {
    foreignKey: 'examTeacherId',
    as: 'examTeacher'
  });

  // Link class -> cohort for eager loading (Cohort.hasMany(classes) exists)
  Class.belongsTo(models.Cohort, {
    foreignKey: 'cohortId',
    as: 'cohort'
  });

  Class.hasMany(models.ClassSubject, {
    foreignKey: 'classId',
    as: 'classSubjects',
    onDelete: 'CASCADE'
  });
};
