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
  // State Management Fields
  gradeStatus: {
    type: DataTypes.ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED_TX_DK', 'FINAL_ENTERED', 'FINALIZED'),
    allowNull: false,
    defaultValue: 'DRAFT',
    field: 'grade_status',
    comment: 'Trạng thái điểm: DRAFT (giáo viên đang nhập) → PENDING_REVIEW (chờ duyệt) → APPROVED_TX_DK (đã duyệt TX/ĐK) → FINAL_ENTERED (đã nhập điểm thi) → FINALIZED (hoàn thành)'
  },
  lockStatus: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'lock_status',
    comment: 'Trạng thái khóa các trường điểm: {txLocked: boolean, dkLocked: boolean, finalLocked: boolean}',
    defaultValue: {
      txLocked: false,
      dkLocked: false,
      finalLocked: false
    }
  },
  lockedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'locked_by',
    comment: 'ID người dùng khóa điểm',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  lockedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'locked_at',
    comment: 'Thời điểm khóa'
  },
  submittedForReviewAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'submitted_for_review_at',
    comment: 'Thời điểm giáo viên nộp điểm để duyệt'
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'approved_by',
    comment: 'ID admin duyệt điểm TX/ĐK',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at',
    comment: 'Thời điểm duyệt điểm TX/ĐK'
  },
  finalizedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'finalized_by',
    comment: 'ID admin hoàn tất điểm',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  finalizedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'finalized_at',
    comment: 'Thời điểm hoàn tất điểm'
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Phiên bản điểm (dùng cho optimistic locking)'
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
    },
    {
      fields: ['grade_status']
    },
    {
      fields: ['locked_by']
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

// State Management Instance Methods
Grade.prototype.getStatus = function() {
  return this.gradeStatus;
};

Grade.prototype.isLocked = function(fieldName) {
  if (!this.lockStatus) return false;
  
  switch (fieldName) {
    case 'txScore':
      return this.lockStatus.txLocked === true;
    case 'dkScore':
      return this.lockStatus.dkLocked === true;
    case 'finalScore':
      return this.lockStatus.finalLocked === true;
    default:
      return false;
  }
};

Grade.prototype.canEdit = function(userId, userRole, fieldName) {
  // If field is locked, no one can edit
  if (this.isLocked(fieldName)) {
    return false;
  }

  // FINALIZED state - no editing allowed
  if (this.gradeStatus === 'FINALIZED') {
    return false;
  }

  // Admin can edit in any non-finalized state
  if (userRole === 'admin') {
    return true;
  }

  // Teacher can only edit in DRAFT state
  if (userRole === 'teacher') {
    if (this.gradeStatus !== 'DRAFT') {
      return false;
    }
    // Teachers can only edit TX and DK scores
    return fieldName === 'txScore' || fieldName === 'dkScore';
  }

  return false;
};

Grade.prototype.isDraft = function() {
  return this.gradeStatus === 'DRAFT';
};

Grade.prototype.isPendingReview = function() {
  return this.gradeStatus === 'PENDING_REVIEW';
};

Grade.prototype.isApprovedTxDk = function() {
  return this.gradeStatus === 'APPROVED_TX_DK';
};

Grade.prototype.isFinalEntered = function() {
  return this.gradeStatus === 'FINAL_ENTERED';
};

Grade.prototype.isFinalized = function() {
  return this.gradeStatus === 'FINALIZED';
};

Grade.prototype.getStatusDisplay = function() {
  const statusMap = {
    'DRAFT': 'Bản nháp',
    'PENDING_REVIEW': 'Chờ duyệt',
    'APPROVED_TX_DK': 'Đã duyệt TX/ĐK',
    'FINAL_ENTERED': 'Đã nhập điểm thi',
    'FINALIZED': 'Hoàn tất'
  };
  return statusMap[this.gradeStatus] || this.gradeStatus;
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

  // State Management Associations
  Grade.hasMany(models.GradeStateTransition, {
    foreignKey: 'gradeId',
    as: 'stateTransitions',
    onDelete: 'CASCADE'
  });

  Grade.belongsTo(models.User, {
    foreignKey: 'lockedBy',
    as: 'lockedByUser'
  });

  Grade.belongsTo(models.User, {
    foreignKey: 'approvedBy',
    as: 'approvedByUser'
  });

  Grade.belongsTo(models.User, {
    foreignKey: 'finalizedBy',
    as: 'finalizedByUser'
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
