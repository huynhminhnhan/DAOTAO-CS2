import { DataTypes } from 'sequelize';
import { sequelize } from '../config.js';

const Teacher = sequelize.define('Teacher', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID giáo viên tự động tăng'
  },
  teacherCode: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'Mã giáo viên (VD: GV001, GV002)',
    validate: {
      notEmpty: true,
      len: [3, 20]
    }
  },
  fullName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Họ và tên giáo viên',
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Email giáo viên',
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
  department: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Khoa/Bộ môn'
  },
  degree: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Học vị (ThS, TS, GS, PGS)',
    validate: {
      isIn: [['Cử nhân', 'Thạc sĩ', 'Tiến sĩ', 'Phó Giáo sư', 'Giáo sư']]
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'retired'),
    defaultValue: 'active',
    comment: 'Trạng thái giáo viên'
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
  tableName: 'teachers',
  timestamps: true,
  paranoid: false,
  comment: 'Bảng thông tin giáo viên'
});

export default Teacher;

// Associations
Teacher.associate = (models) => {
  Teacher.hasMany(models.Class, {
    foreignKey: 'homeroomTeacherId',
    as: 'homeroomClasses',
    onDelete: 'RESTRICT'
  });

  Teacher.hasMany(models.Class, {
    foreignKey: 'trainingTeacherId',
    as: 'trainingClasses',
    onDelete: 'RESTRICT'
  });

  Teacher.hasMany(models.Class, {
    foreignKey: 'examTeacherId',
    as: 'examClasses',
    onDelete: 'RESTRICT'
  });

  Teacher.hasMany(models.ClassSubject, {
    foreignKey: 'teacherId',
    as: 'teachingSchedules',
    onDelete: 'RESTRICT'
  });
};
