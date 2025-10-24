import { DataTypes } from 'sequelize';
import { sequelize } from('../config.js');

const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID sinh viên tự động tăng'
  },
  studentCode: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'Mã sinh viên (VD: SV001, SV002)',
    validate: {
      notEmpty: true,
      len: [3, 20]
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
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Email sinh viên',
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: true,
    comment: 'Số điện thoại',
    validate: {
      is: /^[0-9+\-\s()]*$/
    }
  },
  classId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID lớp cố định suốt khóa học',
    references: {
      model: 'classes',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Địa chỉ sinh viên'
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Ngày sinh (YYYY-MM-DD)',
    validate: {
      isDate: true,
      isBefore: new Date().toISOString()
    }
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: true,
    defaultValue: 'other',
    comment: 'Giới tính theo yêu cầu tài liệu'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'graduated', 'suspended'),
    allowNull: false,
    defaultValue: 'active',
    comment: 'Trạng thái học tập theo yêu cầu tài liệu'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Liên kết với bảng users',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  }
}, {
  tableName: 'students',
  indexes: [
    {
      unique: true,
      fields: ['studentCode']
    },
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['status']
    },
    {
      fields: ['userId']
    }
  ]
});

export default Student;
