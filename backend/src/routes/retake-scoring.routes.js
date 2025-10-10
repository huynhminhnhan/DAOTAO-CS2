/**
 * Retake Scoring API Routes
 * API routes cho chức năng nhập điểm thi lại/học lại
 */
import express from 'express';
import { GradeRetake, Grade, Student, ClassSubject, Enrollment } from '../backend/database/index.js';
import { calculateTBKT, calculateTBMH } from '../utils/gradeCalculation.js';
import { requireAdminSession, requireAdminOrTeacher, requireAdmin } from "../backend/middleware/session-auth.js";

const router = express.Router();

// ✅ SECURITY FIX: Admin and teacher only
// Retake scoring is sensitive and should be controlled
router.use(requireAdminSession);
router.use(requireAdminOrTeacher);

console.log('✅ Retake scoring routes protected - Admin/Teacher only');

/**
 * GET /api/retake/detailed-history
 * Lấy lịch sử chi tiết tất cả các lần thi/học với điểm số
 */
router.get('/detailed-history', async (req, res) => {
  try {
    const { studentId, classId, subjectId } = req.query;
    
    if (!studentId || !classId || !subjectId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: studentId, classId, subjectId'
      });
    }
    
    // Tìm enrollment
    const enrollment = await Enrollment.findOne({
      where: { 
        studentId: parseInt(studentId),
        classId: parseInt(classId),
        subjectId: parseInt(subjectId)
      }
    });

    if (!enrollment) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy môn học trong lớp này'
      });
    }

    // Lấy điểm hiện tại từ bảng grades (điểm đã đạt)
    const currentGrade = await Grade.findOne({
      where: {
        studentId: parseInt(studentId),
        enrollment_id: enrollment.enrollmentId
      }
    });

    // Lấy tất cả lịch sử retake
    const retakeHistory = await GradeRetake.findAll({
      where: { 
        enrollment_id: enrollment.enrollmentId
      },
      order: [['attempt_number', 'ASC']]
    });

    // Cấu trúc response với điểm hiện tại và lịch sử
    const response = {
      currentGrade: currentGrade ? {
        txScore: currentGrade.txScore,
        dkScore: currentGrade.dkScore,
        finalScore: currentGrade.finalScore,
        tbktScore: currentGrade.tbktScore,
        tbmhScore: currentGrade.tbmhScore,
        currentAttempt: currentGrade.current_attempt || 1,
        isRetakeResult: currentGrade.is_retake_result || false
      } : null,
      
      retakeHistory: retakeHistory.map(retake => ({
        id: retake.id,
        attemptNumber: retake.attemptNumber,
        retakeType: retake.retakeType,
        retakeReason: retake.retakeReason,
        
        // Điểm của lần này (có thể null nếu chưa nhập)
        retakeTxScore: retake.retakeTxScore,
        retakeDkScore: retake.retakeDkScore,
        retakeFinalScore: retake.retakeFinalScore,
        retakeTbktScore: retake.retakeTbktScore,
        retakeTbmhScore: retake.retakeTbmhScore,
        
        resultStatus: retake.resultStatus,
        isPassed: retake.isPassed,
        isCurrent: retake.isCurrent,
        
        createdAt: retake.createdAt,
        completedAt: retake.completedAt
      }))
    };

    res.json({
      success: true,
      data: response,
      message: `Tìm thấy ${retakeHistory.length} lần thi lại`
    });

  } catch (error) {
    console.error('Error getting detailed retake history:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

/**
 * POST /api/retake/submit-scores
 * Nhập điểm cho lần thi lại cụ thể
 */
router.post('/submit-scores', async (req, res) => {
  try {
    const { 
      retakeId, 
      txScore, 
      dkScore, 
      finalScore,
      autoCalculate = true 
    } = req.body;
    
    if (!retakeId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu retakeId'
      });
    }
    
    // Tìm retake record
    const retakeRecord = await GradeRetake.findByPk(retakeId);
    if (!retakeRecord) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lần thi lại'
      });
    }
    
    // Validate retake type vs điểm nhập
    if (retakeRecord.retakeType === 'RETAKE_EXAM') {
      // Thi lại: chỉ được nhập finalScore
      if (txScore || dkScore) {
        return res.status(400).json({
          success: false,
          message: 'Thi lại chỉ được nhập điểm thi cuối'
        });
      }
      if (!finalScore) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập điểm thi cuối'
        });
      }
    } else if (retakeRecord.retakeType === 'RETAKE_COURSE') {
      // Học lại: cần nhập đầy đủ
      if (!txScore || !dkScore) {
        return res.status(400).json({
          success: false,
          message: 'Học lại cần nhập đầy đủ điểm TX và DK'
        });
      }
    }
    
    // Update scores
    const updateData = {};
    
    if (retakeRecord.retakeType === 'RETAKE_COURSE') {
      // Học lại: update tất cả điểm
      updateData.retakeTxScore = txScore;
      updateData.retakeDkScore = dkScore;
      updateData.retakeFinalScore = finalScore;
      
      if (autoCalculate) {
        // Auto calculate TBKT và TBMH
        updateData.retakeTbktScore = calculateTBKT(txScore, dkScore);
        if (finalScore) {
          updateData.retakeTbmhScore = calculateTBMH(updateData.retakeTbktScore, finalScore);
        }
      }
    } else {
      // Thi lại: chỉ update finalScore, giữ nguyên TX/DK từ lần trước
      updateData.retakeFinalScore = finalScore;
      
      // Lấy TBKT từ lần trước
      const originalGrade = await Grade.findByPk(retakeRecord.originalGradeId);
      if (originalGrade && originalGrade.tbktScore) {
        updateData.retakeTbktScore = originalGrade.tbktScore;
        if (autoCalculate) {
          updateData.retakeTbmhScore = calculateTBMH(originalGrade.tbktScore, finalScore);
        }
      }
    }
    
    // Determine pass/fail
    const tbktScore = updateData.retakeTbktScore;
    const tbmhScore = updateData.retakeTbmhScore;
    
    if (tbktScore && tbmhScore) {
      updateData.isPassed = tbktScore >= 5 && finalScore >= 5 && tbmhScore >= 5;
      updateData.resultStatus = updateData.isPassed ? 'PASS' : 'FAIL_EXAM';
      
      if (updateData.isPassed) {
        updateData.completedAt = new Date();
      }
    }
    
    // Update retake record
    await retakeRecord.update(updateData);
    
    res.json({
      success: true,
      data: {
        id: retakeRecord.id,
        ...updateData
      },
      message: 'Cập nhật điểm thành công'
    });

  } catch (error) {
    console.error('Error submitting retake scores:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

/**
 * POST /api/retake/promote-to-main
 * Promote điểm từ retake lên bảng grades chính
 */
router.post('/promote-to-main', async (req, res) => {
  try {
    const { retakeId } = req.body;
    
    if (!retakeId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu retakeId'
      });
    }
    
    // Tìm retake record
    const retakeRecord = await GradeRetake.findByPk(retakeId);
    if (!retakeRecord) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lần thi lại'
      });
    }
    
    // Kiểm tra retake đã pass chưa
    if (!retakeRecord.isPassed) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể promote điểm đã đạt'
      });
    }
    
    // Tìm grade record gốc
    const originalGrade = await Grade.findByPk(retakeRecord.originalGradeId);
    if (!originalGrade) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy điểm gốc'
      });
    }
    
    // Update grade record với điểm mới
    const updateData = {
      current_attempt: retakeRecord.attemptNumber,
      is_retake_result: true,
      last_retake_id: retakeRecord.id
    };
    
    if (retakeRecord.retakeType === 'RETAKE_COURSE') {
      // Học lại: update tất cả điểm
      updateData.txScore = retakeRecord.retakeTxScore;
      updateData.dkScore = retakeRecord.retakeDkScore;
      updateData.finalScore = retakeRecord.retakeFinalScore;
      updateData.tbktScore = retakeRecord.retakeTbktScore;
      updateData.tbmhScore = retakeRecord.retakeTbmhScore;
    } else {
      // Thi lại: chỉ update finalScore và tbmhScore
      updateData.finalScore = retakeRecord.retakeFinalScore;
      updateData.tbmhScore = retakeRecord.retakeTbmhScore;
    }
    
    await originalGrade.update(updateData);
    
    // Mark retake as current
    await retakeRecord.update({ isCurrent: true });
    
    res.json({
      success: true,
      data: {
        gradeId: originalGrade.id,
        retakeId: retakeRecord.id,
        newAttempt: retakeRecord.attemptNumber
      },
      message: 'Promote điểm thành công'
    });

  } catch (error) {
    console.error('Error promoting retake scores:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

export default router;
