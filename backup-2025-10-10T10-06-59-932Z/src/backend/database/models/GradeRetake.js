import { DataTypes } from 'sequelize';
import { sequelize } from '../config.js';

const GradeRetake = sequelize.define('GradeRetake', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID tự động tăng'
  },
  originalGradeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'original_grade_id',
    comment: 'Tham chiếu đến grades.id gốc',
    references: {
      model: 'Grades',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'student_id',
    comment: 'ID sinh viên',
    references: {
      model: 'Students',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  subjectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'subject_id',
    comment: 'ID môn học',
    references: {
      model: 'Subjects',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  enrollmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'enrollment_id',
    comment: 'ID đăng ký học',
    references: {
      model: 'Enrollments',
      key: 'enrollment_id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  
  // Thông tin lần thi lại/học lại
  retakeType: {
    type: DataTypes.ENUM('RETAKE_EXAM', 'RETAKE_COURSE'),
    allowNull: false,
    field: 'retake_type',
    comment: 'Loại: RETAKE_EXAM (thi lại điểm thi), RETAKE_COURSE (học lại toàn bộ)',
    validate: {
      isIn: [['RETAKE_EXAM', 'RETAKE_COURSE']]
    }
  },
  attemptNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'attempt_number',
    comment: 'Lần thứ mấy (2, 3, 4...)',
    validate: {
      min: 2 // Lần đầu là 1, thi lại/học lại bắt đầu từ 2
    }
  },
  
  // Điểm của lần thi lại/học lại này
  txScore: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Điểm TX (chỉ có khi học lại - RETAKE_COURSE)',
    validate: {
      isValidTxJson(value) {
        if (!value) return; // Allow null
        
        if (typeof value !== 'object' || Array.isArray(value)) {
          throw new Error('txScore must be an object');
        }
        
        for (let key in value) {
          if (!key.match(/^tx\d+$/)) {
            throw new Error(`Invalid txScore key format: ${key}. Expected format: tx1, tx2, tx3, etc.`);
          }
          
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
    comment: 'Điểm DK (chỉ có khi học lại - RETAKE_COURSE)',
    validate: {
      isValidDkJson(value) {
        if (!value) return; // Allow null
        
        if (typeof value !== 'object' || Array.isArray(value)) {
          throw new Error('dkScore must be an object');
        }
        
        for (let key in value) {
          if (!key.match(/^dk\d+$/)) {
            throw new Error(`Invalid dkScore key format: ${key}. Expected format: dk1, dk2, dk3, etc.`);
          }
          
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
    field: 'finalScore',
    comment: 'Điểm thi lại',
    validate: {
      min: 0,
      max: 10
    }
  },
  tbktScore: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
    field: 'tbktScore',
    comment: 'TBKT (copy từ lần trước nếu RETAKE_EXAM)',
    validate: {
      min: 0,
      max: 10
    }
  },
  tbmhScore: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
    field: 'tbmhScore',
    comment: 'TBMH mới tính',
    validate: {
      min: 0,
      max: 10
    }
  },
  
  // Kết quả và metadata
  resultStatus: {
    type: DataTypes.ENUM('PASS', 'FAIL_EXAM', 'FAIL_TBKT', 'PENDING'),
    allowNull: false,
    defaultValue: 'PENDING',
    field: 'result_status',
    comment: 'Kết quả lần thi lại/học lại này',
    validate: {
      isIn: [['PASS', 'FAIL_EXAM', 'FAIL_TBKT', 'PENDING']]
    }
  },
  isCurrent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_current',
    comment: 'Có phải điểm hiện tại có hiệu lực không'
  },
  retakeReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'retake_reason',
    comment: 'Lý do thi lại: "Điểm thi = 4.5 < 5", "TBKT = 4.2 < 5"'
  },
  
  // Thông tin học kỳ
  semester: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'Học kỳ thi lại (HK1, HK2, HK3)',
    validate: {
      isIn: [['HK1', 'HK2', 'HK3']]
    }
  },
  academicYear: {
    type: DataTypes.STRING(10),
    allowNull: false,
    field: 'academic_year',
    comment: 'Năm học thi lại (VD: 2024-25)',
    validate: {
      is: /^\d{4}-\d{2}$/
    }
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at',
    comment: 'Ngày hoàn thành thi lại/học lại'
  }
}, {
  tableName: 'GradeRetakes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  comment: 'Bảng lưu lịch sử thi lại và học lại của sinh viên',
  indexes: [
    {
      name: 'idx_grade_retakes_student_subject',
      fields: ['student_id', 'subject_id']
    },
    {
      name: 'idx_grade_retakes_original_grade',
      fields: ['original_grade_id']
    },
    {
      name: 'idx_grade_retakes_type_status',
      fields: ['retake_type', 'result_status']
    },
    {
      name: 'idx_grade_retakes_is_current',
      fields: ['is_current']
    }
  ]
});

// Định nghĩa quan hệ
GradeRetake.associate = (models) => {
  // Quan hệ với Grade gốc
  GradeRetake.belongsTo(models.Grade, {
    foreignKey: 'originalGradeId',
    as: 'originalGrade',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });
  
  // Quan hệ với Student
  GradeRetake.belongsTo(models.Student, {
    foreignKey: 'studentId',
    as: 'student',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });
  
  // Quan hệ với Subject
  GradeRetake.belongsTo(models.Subject, {
    foreignKey: 'subjectId',
    as: 'subject',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });
  
  // Quan hệ với Enrollment
  GradeRetake.belongsTo(models.Enrollment, {
    foreignKey: 'enrollmentId',
    as: 'enrollment',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });
};

// Static methods cho business logic
GradeRetake.getRetakeHistory = async function(studentId, subjectId) {
  return await this.findAll({
    where: { studentId, subjectId },
    order: [['attemptNumber', 'ASC']],
    include: [
      { model: this.sequelize.models.Grade, as: 'originalGrade' },
      { model: this.sequelize.models.Subject, as: 'subject' }
    ]
  });
};

GradeRetake.getCurrentRetake = async function(studentId, subjectId) {
  return await this.findOne({
    where: { 
      studentId, 
      subjectId, 
      isCurrent: true 
    },
    include: [
      { model: this.sequelize.models.Grade, as: 'originalGrade' }
    ]
  });
};

GradeRetake.getRetakeStats = async function() {
  const retakeExamCount = await this.count({
    where: { retakeType: 'RETAKE_EXAM' }
  });
  
  const retakeCourseCount = await this.count({
    where: { retakeType: 'RETAKE_COURSE' }
  });
  
  const passCount = await this.count({
    where: { resultStatus: 'PASS' }
  });
  
  return {
    totalRetakes: retakeExamCount + retakeCourseCount,
    retakeExamCount,
    retakeCourseCount,
    passCount,
    failCount: retakeExamCount + retakeCourseCount - passCount
  };
};

export default GradeRetake;
