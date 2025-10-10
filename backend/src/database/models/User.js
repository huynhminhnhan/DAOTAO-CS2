import { DataTypes } from 'sequelize';
import { sequelize } from '../config.js';
import bcrypt from 'bcryptjs';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID người dùng tự động tăng'
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Tên đăng nhập duy nhất',
    validate: {
      notEmpty: true,
      len: [3, 50]
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Email người dùng',
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Mật khẩu đã được mã hóa',
    validate: {
      notEmpty: true,
      len: [6, 255]
    }
  },
  fullName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Họ và tên đầy đủ',
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'teacher', 'student'),
    allowNull: false,
    defaultValue: 'student',
    comment: 'Vai trò người dùng'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    allowNull: false,
    defaultValue: 'active',
    comment: 'Trạng thái tài khoản'
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Refresh token để làm mới access token'
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Thời gian đăng nhập cuối cùng'
  }
}, {
  tableName: 'users',
  indexes: [
    {
      unique: true,
      fields: ['username']
    },
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['role']
    },
    {
      fields: ['status']
    }
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Instance methods
User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

User.prototype.toJSON = function() {
  const user = this.get();
  delete user.password;
  delete user.refreshToken;
  return user;
};

// Associations
User.associate = (models) => {
  User.hasOne(models.Student, {
    foreignKey: 'userId',
    as: 'studentProfile',
    onDelete: 'SET NULL'
  });

  User.hasMany(models.GradeHistory, {
    foreignKey: 'changedBy',
    as: 'gradeChanges',
    onDelete: 'SET NULL'
  });
};

export default User;
