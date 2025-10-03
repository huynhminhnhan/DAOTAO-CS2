import { DataTypes } from 'sequelize';
import { sequelize } from '../config.js';

const Grade = sequelize.define('Grade', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID điểm số tự động tăng'
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID sinh viên',
    references: {
      model: 'students',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  enrollmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'enrollment_id',
    comment: 'ID đăng ký học (từ bảng enrollments)', 
    references: {
      model: 'Enrollments',
      key: 'enrollment_id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  semester: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'Học kỳ (HK1, HK2, HK3)',
    validate: {
      isIn: [['HK1', 'HK2', 'HK3']]
    }
  },
  academicYear: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'Năm học (VD: 2023-24)',
    validate: {
      is: /^\d{4}-\d{2}$/
    }
  },
  txScore: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Điểm thường xuyên dạng JSON {tx1: 8, tx2: 7, tx3: 9, ...}',
    validate: {
      isValidTxJson(value) {
        if (!value) return; // Allow null
        
        if (typeof value !== 'object' || Array.isArray(value)) {
          throw new Error('txScore must be an object');
        }
        
        for (let key in value) {
          // Validate key format (tx1, tx2, tx3, etc.)
          if (!key.match(/^tx\d+$/)) {
            throw new Error(`Invalid txScore key format: ${key}. Expected format: tx1, tx2, tx3, etc.`);
          }
          
          // Validate score range
          const score = parseFloat(value[key]);
          if (isNaN(score) || score < 0 || score > 10) {
            throw new Error(`Invalid txScore value for ${key}: ${value[key]}. Must be between 0 and 10`);
          }
        }
      }
    }
  },
  dkScore: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Điểm định kỳ dạng JSON {dk1: 8, dk2: 7, dk3: 9, ...}',
    validate: {
      isValidDkJson(value) {
        if (!value) return; // Allow null
        
        if (typeof value !== 'object' || Array.isArray(value)) {
          throw new Error('dkScore must be an object');
        }
        
        for (let key in value) {
          // Validate key format (dk1, dk2, dk3, etc.)
          if (!key.match(/^dk\d+$/)) {
            throw new Error(`Invalid dkScore key format: ${key}. Expected format: dk1, dk2, dk3, etc.`);
          }
          
          // Validate score range
          const score = parseFloat(value[key]);
          if (isNaN(score) || score < 0 || score > 10) {
            throw new Error(`Invalid dkScore value for ${key}: ${value[key]}. Must be between 0 and 10`);
          }
        }
      }
    }
  },
  finalScore: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
    comment: 'Điểm thi cuối kỳ (0-10)',
    validate: {
      min: 0,
      max: 10
    }
  },
  tbktScore: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
    comment: 'Điểm trung bình kỹ thuật (tự động tính)',
    validate: {
      min: 0,
      max: 10
    }
  },
  tbmhScore: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
    comment: 'Điểm trung bình môn học (tự động tính)',
    validate: {
      min: 0,
      max: 10
    }
  },
  letterGrade: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: "Xếp loại (Xuất sắc, Giỏi, Khá, Trung bình, Yếu)",
    validate: {
      isIn: [['Xuất sắc', 'Giỏi', 'Khá', 'Trung bình', 'Yếu']]
    }
  },
  isPassed: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    comment: 'Đã đạt môn học hay chưa'
  },
  retakeCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Số lần học lại môn này'
  },
  isRetake: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Có phải là lần học lại không'
  },
  attemptNumber: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: false,
    field: 'attempt_number',
    comment: 'Lần thứ mấy (1=lần đầu, 2=thi lại, 3=học lại lần 1...)',
    validate: {
      min: 1
    }
  },
  retakeType: {
    type: DataTypes.ENUM('RETAKE_EXAM', 'RETAKE_COURSE'),
    allowNull: true,
    field: 'retake_type',
    comment: 'Loại thi lại: RETAKE_EXAM (thi lại), RETAKE_COURSE (học lại)',
    validate: {
      isIn: [['RETAKE_EXAM', 'RETAKE_COURSE']]
    }
  },
  retakeReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'retake_reason',
    comment: 'Lý do phải thi lại/học lại'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Ghi chú thêm'
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
  tableName: 'grades',
  timestamps: true,
  paranoid: false,
  comment: 'Bảng điểm số sinh viên theo kỳ học',
  indexes: [
    {
      fields: ['studentId']
    },
    {
      fields: ['enrollment_id']
    }
  ]
});

export default Grade;

// Helper methods for JSON score calculations
Grade.prototype.getTxAverage = function() {
  if (!this.txScore || Object.keys(this.txScore).length === 0) return null;
  
  const scores = Object.values(this.txScore);
  const sum = scores.reduce((acc, score) => acc + parseFloat(score), 0);
  return Math.round((sum / scores.length) * 100) / 100; // Round to 2 decimal places
};

Grade.prototype.getDkAverage = function() {
  if (!this.dkScore || Object.keys(this.dkScore).length === 0) return null;
  
  const scores = Object.values(this.dkScore);
  const sum = scores.reduce((acc, score) => acc + parseFloat(score), 0);
  return Math.round((sum / scores.length) * 100) / 100; // Round to 2 decimal places
};

// Method to add individual scores
Grade.prototype.addTxScore = function(index, score) {
  if (!this.txScore) this.txScore = {};
  this.txScore[`tx${index}`] = score;
  this.changed('txScore', true); // Mark as changed for Sequelize
};

Grade.prototype.addDkScore = function(index, score) {
  if (!this.dkScore) this.dkScore = {};
  this.dkScore[`dk${index}`] = score;
  this.changed('dkScore', true); // Mark as changed for Sequelize
};

// Associations
Grade.associate = (models) => {
  Grade.belongsTo(models.Student, {
    foreignKey: 'studentId',
    as: 'student'
  });

  Grade.belongsTo(models.Enrollment, {
    foreignKey: 'enrollmentId',
    as: 'enrollment'
  });

  Grade.hasMany(models.GradeHistory, {
    foreignKey: 'gradeId',
    as: 'history',
    onDelete: 'CASCADE'
  });

  // Quan hệ với GradeRetake
  Grade.hasMany(models.GradeRetake, {
    foreignKey: 'originalGradeId',
    as: 'retakes',
    onDelete: 'CASCADE'
  });
};

// Static methods cho business logic
Grade.determineGradeStatus = function(gradeData) {
  const { tbktScore, finalScore, attemptNumber = 1 } = gradeData;
  
  // Rule 1: TBKT < 5 → Học lại
  if (tbktScore !== null && tbktScore < 5) {
    return {
      status: 'RETAKE_COURSE',
      reason: `TBKT = ${tbktScore} < 5.0`,
      needsRetake: true,
      canTakeExam: false
    };
  }
  
  // Rule 2: Điểm thi < 5
  if (finalScore !== null && finalScore < 5) {
    if (attemptNumber === 1) {
      return {
        status: 'RETAKE_EXAM',
        reason: `Điểm thi = ${finalScore} < 5.0`,
        needsRetake: true,
        canTakeExam: false
      };
    } else {
      return {
        status: 'RETAKE_COURSE',
        reason: `Thi lại vẫn dưới 5: ${finalScore}`,
        needsRetake: true,
        canTakeExam: false
      };
    }
  }
  
  // Rule 3: Đạt
  return {
    status: 'PASS',
    reason: 'Đạt tất cả yêu cầu',
    needsRetake: false,
    canTakeExam: true
  };
};

Grade.getRetakeHistory = async function(studentId, subjectId) {
  const grades = await this.findAll({
    where: { studentId },
    include: [
      {
        model: this.sequelize.models.Enrollment,
        as: 'enrollment',
        where: { subjectId },
        required: true
      }
    ],
    order: [['attemptNumber', 'ASC']]
  });
  
  const retakes = await this.sequelize.models.GradeRetake.findAll({
    where: { studentId, subjectId },
    order: [['attemptNumber', 'ASC']]
  });
  
  return { grades, retakes };
};
