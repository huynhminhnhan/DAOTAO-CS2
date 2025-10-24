// Cohort Model - Khóa học
import { DataTypes } from 'sequelize';
import { sequelize } from '../config.js';

const Cohort = sequelize.define('Cohort', {
  cohortId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'cohort_id',
    comment: 'ID khóa học'
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Tên khóa học (VD: K22CNTT)'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Ngày bắt đầu khóa'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Ngày kết thúc khóa'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Mô tả khóa học'
  }
}, {
  tableName: 'Cohorts',
  timestamps: true
});

export default Cohort;

// Associations
Cohort.associate = (models) => {
  Cohort.hasMany(models.Class, { foreignKey: 'cohortId', as: 'classes', onDelete: 'RESTRICT' });
  Cohort.hasMany(models.Semester, { foreignKey: 'cohortId', as: 'semesters' });
};
