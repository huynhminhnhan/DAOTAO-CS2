// GradeStateTransition Model
import { DataTypes } from 'sequelize';
import { sequelize } from '../config.js';

const GradeStateTransition = sequelize.define('GradeStateTransition', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  gradeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID của grade record',
    references: {
      // reference the grades table primary key `id`
      model: 'grades',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  fromState: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Trạng thái trước khi chuyển'
  },
  toState: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Trạng thái sau khi chuyển'
  },
  triggeredBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'NO ACTION',
    comment: 'User thực hiện chuyển trạng thái'
  },
  triggeredAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Thời điểm chuyển trạng thái'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Lý do chuyển trạng thái'
  }
}, {
  tableName: 'GradeStateTransitions',
  timestamps: false,
  indexes: [
    { fields: ['gradeId'] },
    { fields: ['triggeredBy'] },
    { fields: ['triggeredAt'] }
  ]
});

export default GradeStateTransition;

// Associations
GradeStateTransition.associate = (models) => {
  GradeStateTransition.belongsTo(models.Grade, { 
    foreignKey: 'gradeId', 
    as: 'grade' 
  });
  GradeStateTransition.belongsTo(models.User, { 
    foreignKey: 'triggeredBy', 
    as: 'user' 
  });
};
