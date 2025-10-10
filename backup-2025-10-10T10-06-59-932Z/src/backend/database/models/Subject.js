import { DataTypes } from 'sequelize';
import { sequelize } from '../config.js';

const Subject = sequelize.define('Subject', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID môn học tự động tăng'
  },
  subjectCode: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'Mã môn học (VD: MATH001, PHYS001)',
    validate: {
      notEmpty: true,
      len: [3, 20]
    }
  },
  subjectName: {
  type: DataTypes.STRING(200),
  allowNull: true,
    comment: 'Tên môn học',
    validate: {
      len: [5, 200]
    }
  },
  credits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Số tín chỉ theo yêu cầu tài liệu',
    validate: {
      min: 1,
      max: 10
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Mô tả môn học'
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Danh mục môn học theo yêu cầu tài liệu'
  },
  isRequired: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Môn học bắt buộc hay không theo yêu cầu tài liệu'
  }
}, {
  tableName: 'subjects',
  indexes: [
    {
      unique: true,
      fields: ['subjectCode']
    },
    {
      fields: ['category']
    },
    {
      fields: ['isRequired']
    }
  ]
});

export default Subject;

// Associations
Subject.associate = (models) => {
  Subject.hasMany(models.ClassSubject, { foreignKey: 'subjectId', as: 'classSubjects', onDelete: 'CASCADE' });
  Subject.hasMany(models.Enrollment, { foreignKey: 'subjectId', as: 'enrollments' });
};
