/**
 * RetakeManagementService - Service quản lý thi lại và học lại
 * 
 * Quy tắc nghiệp vụ:
 * 1. TBKT < 5 → HỌC LẠI (RETAKE_COURSE): Phải học lại toàn bộ môn
 * 2. Điểm thi < 5 (khi TBKT >= 5) → THI LẠI (RETAKE_EXAM): Chỉ thi lại cuối kỳ
 * 3. TBMH < 5 → THI LẠI (RETAKE_EXAM): Chỉ thi lại cuối kỳ
 */

import { Grade, GradeRetake, Enrollment, Student, Subject } from '../database/index.js';

const RetakeManagementService = {
  
  /**
   * Phân tích trạng thái điểm và xác định cần thi lại/học lại
   */
  async analyzeGradeStatus(gradeData) {
    const { tbktScore, finalScore, tbmhScore, attemptNumber = 1 } = gradeData;
    
    // Rule 1: TBKT < 5 → Học lại toàn bộ
    if (tbktScore !== null && tbktScore < 5) {
      return {
        needsAction: true,
        actionType: 'RETAKE_COURSE',
        reason: `TBKT = ${tbktScore} < 5.0 - Cần học lại toàn bộ môn`,
        canTakeExam: false,
        mustRetakeCourse: true,
        severity: 'HIGH' // Nghiêm trọng nhất
      };
    }
    
    // Rule 2: Điểm thi < 5 → Thi lại
    if (finalScore !== null && finalScore < 5) {
      return {
        needsAction: true,
        actionType: 'RETAKE_EXAM',
        reason: `Điểm thi = ${finalScore} < 5.0 - Cần thi lại`,
        canTakeExam: false,
        mustRetakeExam: true,
        severity: 'MEDIUM'
      };
    }
    
    // Rule 3: Đạt tất cả
    if (tbmhScore >= 5) {
      return {
        needsAction: false,
        actionType: 'PASS',
        reason: `Đạt môn: TBMH = ${tbmhScore} >= 5.0`,
        canTakeExam: true,
        isPassed: true,
        severity: 'NONE'
      };
    }
    
    // Rule 5: Chưa có đủ điểm để đánh giá
    return {
      needsAction: false,
      actionType: 'PENDING',
      reason: 'Chưa có đủ điểm để đánh giá',
      canTakeExam: true,
      isPending: true,
      severity: 'NONE'
    };
  },

  /**
   * Tạo bản ghi học lại (RETAKE_COURSE)
   */
  async createRetakeCourse(originalGradeId, studentId, subjectId, reason, semester, academicYear) {
    const transaction = await Grade.sequelize.transaction();
    
    try {
      // 1. Lấy thông tin grade gốc và enrollment
      const originalGrade = await Grade.findByPk(originalGradeId, {
        include: [{ model: Enrollment, as: 'enrollment' }],
        transaction
      });
      
      if (!originalGrade) {
        throw new Error('Không tìm thấy bản ghi điểm gốc');
      }
      
      const newAttemptNumber = originalGrade.attemptNumber + 1;
      
      // 2. Tạo Enrollment mới cho lần học lại
      const newEnrollment = await Enrollment.create({
        studentId,
        classId: originalGrade.enrollment.classId,
        subjectId,
        cohortId: originalGrade.enrollment.cohortId,
        semesterId: originalGrade.enrollment.semesterId,
        attempt: newAttemptNumber,
        status: 'active',
        enrollmentDate: new Date(),
        note: `Học lại lần ${newAttemptNumber - 1}: ${reason}`
      }, { transaction });
      
      // 3. Tạo bản ghi GradeRetake
      const retakeRecord = await GradeRetake.create({
        originalGradeId,
        studentId,
        subjectId,
        enrollmentId: newEnrollment.enrollmentId,
        retakeType: 'RETAKE_COURSE',
        attemptNumber: newAttemptNumber,
        retakeReason: reason,
        semester,
        academicYear,
        resultStatus: 'PENDING',
        isCurrent: true,
        // Điểm ban đầu null - sẽ nhập lại từ đầu
        txScore: null,
        dkScore: null,
        finalScore: null,
        tbktScore: null,
        tbmhScore: null
      }, { transaction });
      
      // 4. Đánh dấu các retake cũ không còn current
      await GradeRetake.update(
        { isCurrent: false },
        { 
          where: { 
            studentId, 
            subjectId, 
            id: { [Grade.sequelize.Sequelize.Op.ne]: retakeRecord.id }
          },
          transaction 
        }
      );
      
      await transaction.commit();
      
      return {
        success: true,
        retakeRecord,
        newEnrollment,
        message: `Đã tạo đăng ký học lại lần ${newAttemptNumber - 1} cho sinh viên`
      };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Tạo bản ghi thi lại (RETAKE_EXAM)
   */
  async createRetakeExam(originalGradeId, studentId, subjectId, reason, semester, academicYear) {
    const transaction = await Grade.sequelize.transaction();
    
    try {
      // 1. Lấy thông tin grade gốc
      const originalGrade = await Grade.findByPk(originalGradeId, {
        include: [{ model: Enrollment, as: 'enrollment' }],
        transaction
      });
      
      if (!originalGrade) {
        throw new Error('Không tìm thấy bản ghi điểm gốc');
      }
      
      const newAttemptNumber = originalGrade.attemptNumber + 1;
      
      // 2. Tạo bản ghi GradeRetake (KHÔNG tạo enrollment mới)
      const retakeRecord = await GradeRetake.create({
        originalGradeId,
        studentId,
        subjectId,
        enrollmentId: originalGrade.enrollmentId, // Dùng enrollment cũ
        retakeType: 'RETAKE_EXAM',
        attemptNumber: newAttemptNumber,
        retakeReason: reason,
        semester,
        academicYear,
        resultStatus: 'PENDING',
        isCurrent: true,
        // Giữ nguyên TX, DK, TBKT - chỉ thi lại
        txScore: originalGrade.txScore,
        dkScore: originalGrade.dkScore,
        tbktScore: originalGrade.tbktScore,
        finalScore: null, // Sẽ nhập điểm thi mới
        tbmhScore: null   // Sẽ tính lại khi có finalScore mới
      }, { transaction });
      
      // 3. Đánh dấu các retake cũ không còn current
      await GradeRetake.update(
        { isCurrent: false },
        { 
          where: { 
            studentId, 
            subjectId, 
            id: { [Grade.sequelize.Sequelize.Op.ne]: retakeRecord.id }
          },
          transaction 
        }
      );
      
      await transaction.commit();
      
      return {
        success: true,
        retakeRecord,
        message: `Đã tạo đăng ký thi lại lần ${newAttemptNumber - 1} cho sinh viên`
      };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Lấy lịch sử thi lại/học lại của sinh viên cho 1 môn
   */
  async getRetakeHistory(studentId, subjectId) {
    // Lấy lịch sử retake
    const retakeHistory = await GradeRetake.findAll({
      where: { studentId, subjectId },
      order: [['attemptNumber', 'ASC']],
      include: [
        { model: Subject, as: 'subject' },
        { model: Student, as: 'student' },
        {
          model: Grade,
          as: 'originalGrade',
          required: false
        }
      ]
    });
    
    // Lấy grade gốc thực sự - cách 1: Từ originalGradeId của retake đầu tiên
    let originalGrade = null;
    if (retakeHistory.length > 0 && retakeHistory[0].originalGrade) {
      originalGrade = retakeHistory[0].originalGrade;
    } else {
      // Cách 2: Lấy grade có attemptNumber = 1 (lần đầu tiên)
      originalGrade = await Grade.findOne({
        include: [
          {
            model: Enrollment,
            as: 'enrollment',
            where: { subjectId, attempt: 1 },
            required: true
          }
        ],
        where: { studentId }
      });
    }
    
    // Lấy retake hiện tại
    const currentRetake = await GradeRetake.findOne({
      where: { studentId, subjectId, isCurrent: true }
    });
    
    return {
      originalGrade,
      retakeHistory,
      currentRetake,
      totalAttempts: retakeHistory.length + 1,
      needsAction: currentRetake ? currentRetake.resultStatus === 'PENDING' : false
    };
  },

  /**
   * Cập nhật kết quả thi lại/học lại
   */
  async updateRetakeResult(retakeId, scoreData) {
    const transaction = await Grade.sequelize.transaction();
    
    try {
      const retakeRecord = await GradeRetake.findByPk(retakeId, { transaction });
      if (!retakeRecord) {
        throw new Error('Không tìm thấy bản ghi thi lại');
      }
      
      // Cập nhật điểm
      const updateData = {};
      
      if (retakeRecord.retakeType === 'RETAKE_COURSE') {
        // Học lại: có thể cập nhật tất cả loại điểm
        if (scoreData.txScore) updateData.txScore = scoreData.txScore;
        if (scoreData.dkScore) updateData.dkScore = scoreData.dkScore;
        if (scoreData.tbktScore) updateData.tbktScore = scoreData.tbktScore;
      }
      
      if (scoreData.finalScore !== undefined) {
        updateData.finalScore = scoreData.finalScore;
      }
      
      if (scoreData.tbmhScore !== undefined) {
        updateData.tbmhScore = scoreData.tbmhScore;
      }
      
      // Phân tích kết quả
      const analysis = await this.analyzeGradeStatus({
        tbktScore: updateData.tbktScore || retakeRecord.tbktScore,
        finalScore: updateData.finalScore,
        tbmhScore: updateData.tbmhScore,
        attemptNumber: retakeRecord.attemptNumber
      });
      
      // Cập nhật trạng thái
      if (analysis.isPassed) {
        updateData.resultStatus = 'PASS';
      } else if (analysis.actionType === 'RETAKE_COURSE') {
        updateData.resultStatus = 'FAIL_TBKT';
      } else if (analysis.actionType === 'RETAKE_EXAM') {
        updateData.resultStatus = 'FAIL_EXAM';
      }
      
      await retakeRecord.update(updateData, { transaction });
      await transaction.commit();
      
      return {
        success: true,
        retakeRecord: await retakeRecord.reload(),
        analysis,
        message: 'Đã cập nhật kết quả thi lại/học lại'
      };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Lấy danh sách sinh viên cần thi lại/học lại theo lớp và môn
   */
  async getStudentsNeedingRetake(classId, subjectId) {
    // Lấy tất cả grades của lớp và môn này
    const grades = await Grade.findAll({
      include: [
        {
          model: Enrollment,
          as: 'enrollment',
          where: { classId, subjectId },
          required: true,
          include: [
            { model: Student, as: 'student' }
          ]
        }
      ],
      order: [['enrollment', 'student', 'studentCode', 'ASC']]
    });
    
    const results = [];
    
    for (const grade of grades) {
      const analysis = await this.analyzeGradeStatus({
        tbktScore: grade.tbktScore,
        finalScore: grade.finalScore,
        tbmhScore: grade.tbmhScore,
        attemptNumber: grade.attemptNumber
      });
      
      if (analysis.needsAction) {
        // Kiểm tra đã có retake chưa
        const existingRetake = await GradeRetake.findOne({
          where: {
            originalGradeId: grade.id,
            isCurrent: true
          }
        });
        
        results.push({
          grade,
          student: grade.enrollment.student,
          analysis,
          hasActiveRetake: !!existingRetake,
          existingRetake
        });
      }
    }
    
    return results;
  }
};

export default RetakeManagementService;