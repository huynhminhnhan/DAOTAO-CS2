import { DataTypes } from 'sequelize';
import { sequelize } from '../config.js';

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID thông báo tự động tăng'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Tiêu đề thông báo',
    validate: {
      notEmpty: true,
      len: [1, 200]
    }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Nội dung thông báo',
    validate: {
      notEmpty: true
    }
  },
  type: {
    type: DataTypes.ENUM('info', 'success', 'warning', 'error'),
    allowNull: false,
    defaultValue: 'info',
    comment: 'Loại thông báo'
  },
  targetUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID người dùng nhận thông báo (NULL = gửi cho tất cả)',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  targetRole: {
    type: DataTypes.ENUM('admin', 'teacher', 'student'),
    allowNull: true,
    comment: 'Vai trò người dùng nhận thông báo'
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Trạng thái đã đọc'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID người tạo thông báo',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  }
}, {
  tableName: 'notifications',
  indexes: [
    {
      fields: ['targetUserId']
    },
    {
      fields: ['targetRole']
    },
    {
      fields: ['isRead']
    },
    {
      fields: ['createdBy']
    },
    {
      fields: ['createdAt']
    }
  ]
});

export default Notification;

// Associations
Notification.associate = (models) => {
  Notification.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
};
