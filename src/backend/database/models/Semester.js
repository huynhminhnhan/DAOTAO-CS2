// Semester Model - Học kỳ
import { DataTypes } from 'sequelize';
import { sequelize } from '../config.js';
import Cohort from './Cohort.js';

const Semester = sequelize.define('Semester', {
  semesterId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'semester_id',
    comment: 'ID học kỳ'
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Tên học kỳ (VD: 2024-2025 HK1)'
  },
  academicYear: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Năm học (ví dụ: 2024-2025)'
  },
  cohortId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'cohort_id',
    references: {
      model: 'Cohorts',
      key: 'cohort_id'
    },
    comment: 'Khóa học liên kết'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Ngày bắt đầu học kỳ'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Ngày kết thúc học kỳ'
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Thứ tự học kỳ trong khóa'
  },
  displayName: {
    type: DataTypes.VIRTUAL,
    get() {
      if (this.cohort && this.cohort.name && this.name) {
        return `${this.cohort.name} - ${this.name}`;
      }
      return this.name || '';
    }
  }
}, {
  tableName: 'Semesters',
  timestamps: true
});

// Associations
Semester.associate = (models) => {
  Semester.belongsTo(models.Cohort, { foreignKey: 'cohortId', as: 'cohort' });
};

export default Semester;
