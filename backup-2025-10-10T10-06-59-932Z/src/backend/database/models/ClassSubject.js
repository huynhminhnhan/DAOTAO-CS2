import { DataTypes } from 'sequelize';
import { sequelize } from '../config.js';

const ClassSubject = sequelize.define('ClassSubject', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID lớp-môn học tự động tăng'
  },
  classId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID lớp học',
    references: {
      model: 'classes',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  subjectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID môn học',
    references: {
      model: 'subjects',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  teacherId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID giáo viên đứng lớp',
    references: {
      model: 'teachers',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  semester: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'Học kỳ (HK1, HK2, HK3)',
    validate: {
      isIn: [['HK1', 'HK2', 'HK3']]
    }
  },
  academicYear: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'Năm học (VD: 2023-24)',
    validate: {
      is: /^\d{4}-\d{2}$/
    }
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Ngày bắt đầu học'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Ngày kết thúc học'
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'active', 'completed', 'cancelled'),
    defaultValue: 'scheduled',
    comment: 'Trạng thái lớp-môn học'
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
  tableName: 'class_subjects',
  timestamps: true,
  paranoid: false,
  comment: 'Bảng lớp-môn học theo kỳ',
  indexes: [
    {
      unique: true,
      fields: ['classId', 'subjectId', 'semester', 'academicYear'],
      name: 'unique_class_subject_semester'
    }
  ]
});

export default ClassSubject;

// Associations
ClassSubject.associate = (models) => {
  ClassSubject.belongsTo(models.Class, { foreignKey: 'classId', as: 'class' });
  ClassSubject.belongsTo(models.Subject, { foreignKey: 'subjectId', as: 'subject' });
  ClassSubject.belongsTo(models.Teacher, { foreignKey: 'teacherId', as: 'teacher' });
};
