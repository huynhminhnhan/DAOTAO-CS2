import { DataTypes } from 'sequelize';
import { sequelize } from '../config.js';

const GradeHistory = sequelize.define('GradeHistory', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID lịch sử thay đổi điểm tự động tăng'
  },
  gradeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID điểm số bị thay đổi (có thể null nếu grade đã bị xóa)',
    references: {
      model: 'grades',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID sinh viên liên quan'
  },
  subjectId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID môn học liên quan'
  },
  classId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID lớp liên quan'
  },
  previousValue: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Snapshot giá trị trước khi thay đổi (JSON)'
  },
  newValue: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Snapshot giá trị sau khi thay đổi (JSON)'
  },
  changeType: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'update',
    comment: 'Loại thay đổi: create|update|delete|recalculate|import|revert'
  },
  changedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID người thực hiện thay đổi (nullable for system)'
  },
  changedByRole: {
    type: DataTypes.STRING(32),
    allowNull: true,
    comment: 'Role của người thay đổi (admin|teacher|system|import)'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Lý do/ghi chú cho thay đổi'
  },
  ipAddress: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  transactionId: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: 'ID giao dịch để gom nhiều thay đổi trong 1 thao tác'
  }
}, {
  tableName: 'grade_history',
  indexes: [
    { fields: ['gradeId'] },
    { fields: ['studentId'] },
    { fields: ['classId'] },
    { fields: ['subjectId'] },
    { fields: ['changedBy'] },
    { fields: ['createdAt'] }
  ]
});

export default GradeHistory;

// Associations
GradeHistory.associate = (models) => {
  GradeHistory.belongsTo(models.Grade, {
    foreignKey: 'gradeId',
    as: 'grade'
  });

  GradeHistory.belongsTo(models.User, {
    foreignKey: 'changedBy',
    as: 'changedByUser'
  });
};
