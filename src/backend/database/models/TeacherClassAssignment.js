import { DataTypes } from 'sequelize';
import { sequelize } from '../config.js';

const TeacherClassAssignment = sequelize.define('TeacherClassAssignment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  teacherId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'teachers', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  classId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'classes', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Vai trò của giáo viên trong lớp (ví dụ: chủ nhiệm, giảng dạy, coi thi)'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'teacher_class_assignments',
  timestamps: true,
  comment: 'Bảng ánh xạ giữa giáo viên và lớp để phân quyền nhập điểm'
});

export default TeacherClassAssignment;

// Associations
TeacherClassAssignment.associate = (models) => {
  TeacherClassAssignment.belongsTo(models.Teacher, { foreignKey: 'teacherId', as: 'teacher' });
  TeacherClassAssignment.belongsTo(models.Class, { foreignKey: 'classId', as: 'class' });
};
