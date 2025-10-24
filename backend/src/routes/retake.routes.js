/**
 * Retake API Routes
 * API routes cho chức năng thi lại/học lại
 */
import express from 'express';
import { GradeRetake, Grade, Student, ClassSubject, Enrollment } from '../database/index.js';

const router = express.Router();

// Test route để debug
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Retake routes working!',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/retake/history
 * Lấy lịch sử thi lại của sinh viên
 */
router.get('/history', async (req, res) => {
  try {
    const { studentId, classId, subjectId } = req.query;
    
    console.log('DEBUG - Query params:', { studentId, classId, subjectId });
    
    if (!studentId || !classId || !subjectId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: studentId, classId, subjectId'
      });
    }
    
    // Tìm enrollment trước
    const enrollment = await Enrollment.findOne({
      where: { 
        studentId: parseInt(studentId),
        classId: parseInt(classId),
        subjectId: parseInt(subjectId)
      }
    });

    console.log('DEBUG - Enrollment found:', enrollment?.dataValues || 'NOT FOUND');

    if (!enrollment) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy môn học trong lớp này',
        debug: { studentId, classId, subjectId }
      });
    }

    // Tìm lịch sử retake bằng enrollmentId
    const retakeHistory = await GradeRetake.findAll({
      where: { 
        enrollment_id: enrollment.enrollmentId  // Database sử dụng snake_case
      },
      order: [['created_at', 'DESC']]  // Database sử dụng snake_case
    });

    res.json({
      success: true,
      data: retakeHistory,
      message: `Tìm thấy ${retakeHistory.length} lần thi lại`
    });

  } catch (error) {
    console.error('Error getting retake history:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy lịch sử thi lại: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/retake/create
 * Tạo lần thi lại mới
 */
router.post('/create', async (req, res) => {
  try {
    const { studentId, classId, subjectId, retakeType, reason } = req.body;
    
    // Validate required fields
    if (!studentId || !classId || !subjectId || !retakeType || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: studentId, classId, subjectId, retakeType, reason'
      });
    }
    
    // Validate retakeType
    const retakeTypeMapping = {
      'EXAM': 'RETAKE_EXAM',
      'COURSE': 'RETAKE_COURSE'
    };
    
    const dbRetakeType = retakeTypeMapping[retakeType];
    if (!dbRetakeType) {
      return res.status(400).json({
        success: false,
        message: 'retakeType phải là EXAM hoặc COURSE'
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

    // Đếm số lần thi lại hiện tại
    const currentAttempts = await GradeRetake.count({
      where: {
        enrollment_id: enrollment.enrollmentId,  // Database query vẫn dùng snake_case
        retake_type: dbRetakeType
      }
    });

    // Tìm Grade record để lấy originalGradeId
    let originalGradeId = null;
    try {
      const existingGrade = await Grade.findOne({
        where: { 
          studentId: parseInt(studentId),
          enrollment_id: enrollment.enrollmentId
        }
      });
      originalGradeId = existingGrade ? existingGrade.id : 1; // Default to 1 if no grade found
    } catch (error) {
      console.log('No grade found, using default originalGradeId = 1');
      originalGradeId = 1;
    }

    // Tạo record thi lại mới với camelCase fields (Sequelize model properties)
    const retakeRecord = await GradeRetake.create({
      originalGradeId: originalGradeId,        // camelCase cho Sequelize
      studentId: parseInt(studentId),          // camelCase cho Sequelize
      subjectId: parseInt(subjectId),          // camelCase cho Sequelize
      enrollmentId: enrollment.enrollmentId,   // camelCase cho Sequelize
      retakeType: dbRetakeType,               // camelCase cho Sequelize
      attemptNumber: Math.max(currentAttempts + 1, 2), // Min = 2 theo validation
      retakeReason: reason,                   // camelCase cho Sequelize
      semester: 'HK1',                       // Enum: HK1, HK2, HK3
      academicYear: '2024-25',               // Format: YYYY-YY theo validation
      resultStatus: 'PENDING',               // camelCase cho Sequelize
      isCurrent: true                        // camelCase cho Sequelize
    });

    res.status(201).json({
      success: true,
      data: retakeRecord,
      message: 'Tạo lần thi lại thành công'
    });

  } catch (error) {
    console.error('Error creating retake:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo lần thi lại: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/retake/list
 * Lấy danh sách tất cả yêu cầu thi lại để quản lý
 */
router.get('/list', async (req, res) => {
  try {
    // Import additional models if needed
    const { Subject } = await import('../database/index.js');
    
    // Lấy tất cả retake records với thông tin liên quan
    const retakeList = await GradeRetake.findAll({
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['studentCode', 'fullName']
        },
        {
          model: Subject,
          as: 'subject', 
          attributes: ['subjectName', 'subjectCode']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Transform data để dễ sử dụng
    const transformedData = retakeList.map(retake => {
      const student = retake.student || {};
      const subject = retake.subject || {};
      
      return {
        id: retake.id,
        studentCode: student.studentCode,
        studentName: student.fullName || 'N/A',
        subjectName: subject.subjectName,
        subjectCode: subject.subjectCode,
        retakeType: retake.retakeType,
        reason: retake.retakeReason,
        status: retake.resultStatus,
        createdAt: retake.createdAt,
        className: 'N/A' // Có thể thêm logic lấy className sau
      };
    });

    res.json({
      success: true,
      data: transformedData,
      message: `Tìm thấy ${transformedData.length} yêu cầu thi lại`
    });

  } catch (error) {
    console.error('Error getting retake list:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/retake/:id/approve
 * Phê duyệt yêu cầu thi lại
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    const retakeRecord = await GradeRetake.findByPk(id);
    if (!retakeRecord) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu thi lại'
      });
    }

    await retakeRecord.update({
      resultStatus: 'APPROVED'
    });

    res.json({
      success: true,
      data: retakeRecord,
      message: 'Đã phê duyệt yêu cầu thi lại'
    });

  } catch (error) {
    console.error('Error approving retake:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi phê duyệt: ' + error.message
    });
  }
});

/**
 * POST /api/retake/:id/reject
 * Từ chối yêu cầu thi lại
 */
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    
    const retakeRecord = await GradeRetake.findByPk(id);
    if (!retakeRecord) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu thi lại'
      });
    }

    await retakeRecord.update({
      resultStatus: 'REJECTED'
    });

    res.json({
      success: true,
      data: retakeRecord,
      message: 'Đã từ chối yêu cầu thi lại'
    });

  } catch (error) {
    console.error('Error rejecting retake:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi từ chối: ' + error.message
    });
  }
});

export default router;
