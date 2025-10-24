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
    
    if (!studentId || !classId || !subjectId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: studentId, classId, subjectId'
      });
    }
    
    // Tìm enrollment trước
    const enrollment = await Enrollment.findOne({
      where: { 
        student_id: studentId,
        class_id: classId,
        subject_id: subjectId
      }
    });

    if (!enrollment) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy môn học trong lớp này'
      });
    }

    // Tìm lịch sử retake bằng enrollment_id
    const retakeHistory = await GradeRetake.findAll({
      where: { 
        enrollment_id: enrollment.enrollment_id
      },
      order: [['created_at', 'DESC']]  // Sử dụng created_at (snake_case) từ database
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
    const { 
      studentId, 
      classId, 
      subjectId, 
      retakeType, 
      reason, 
      scheduledDate, 
      notes 
    } = req.body;
    
    // Validate required fields
    if (!studentId || !classId || !subjectId || !retakeType || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: studentId, classId, subjectId, retakeType, reason'
      });
    }
    
    // Validate retakeType (mapping API format to DB enum)
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
    
    // Tìm enrollment trước
    const enrollment = await Enrollment.findOne({
      where: { 
        student_id: studentId,
        class_id: classId,
        subject_id: subjectId
      }
    });

    if (!enrollment) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy môn học trong lớp này'
      });
    }

    // Kiểm tra xem có Grade record không (sử dụng enrollment_id)
    const existingGrade = await Grade.findOne({
      where: { 
        studentId: studentId,
        enrollment_id: enrollment.enrollment_id  // Sử dụng enrollment_id từ database
      }
    });

    if (!existingGrade) {
      return res.status(400).json({
        success: false,
        message: 'Chưa có điểm cho môn học này, không thể thi lại'
      });
    }

    // Đếm số lần thi lại hiện tại
    const currentAttempts = await GradeRetake.count({
      where: {
        enrollment_id: enrollment.enrollment_id,
        retake_type: dbRetakeType
      }
    });

    // Tạo record thi lại mới
    const retakeRecord = await GradeRetake.create({
      original_grade_id: existingGrade.id,
      student_id: parseInt(studentId),
      subject_id: parseInt(subjectId),
      enrollment_id: enrollment.enrollment_id,
      retake_type: dbRetakeType,
      attempt_number: currentAttempts + 1,
      retake_reason: reason,
      semester: existingGrade.semester,
      academic_year: existingGrade.academicYear,
      result_status: 'PENDING',
      is_current: 1
    });

    // Cập nhật Grade record để đánh dấu là retake
    await existingGrade.update({
      retakeCount: currentAttempts + 1,
      isRetake: true,
      is_retake: 1,
      retake_type: dbRetakeType,
      retake_reason: reason
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
 * PUT /api/retake/status/:id
 * Cập nhật trạng thái thi lại
 */
router.put('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, scores } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin trạng thái'
      });
    }
    
    const retakeRecord = await GradeRetake.findByPk(id);
    if (!retakeRecord) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lần thi lại'
      });
    }
    
    // Cập nhật trạng thái và điểm (nếu có)
    const updateData = { result_status: status };
    if (scores) {
      if (scores.txScore) updateData.txScore = scores.txScore;
      if (scores.dkScore) updateData.dkScore = scores.dkScore;
      if (scores.finalScore) updateData.finalScore = scores.finalScore;
      if (scores.tbktScore) updateData.tbktScore = scores.tbktScore;
      if (scores.tbmhScore) updateData.tbmhScore = scores.tbmhScore;
    }
    
    await retakeRecord.update(updateData);
    
    res.json({
      success: true,
      data: retakeRecord,
      message: 'Cập nhật trạng thái thi lại thành công'
    });
    
  } catch (error) {
    console.error('Error updating retake status:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật trạng thái: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/retake/stats
 * Thống kê thi lại
 */
router.get('/stats', async (req, res) => {
  try {
    const { classId, subjectId } = req.query;
    
    let whereCondition = {};
    if (classId && subjectId) {
      // Tìm tất cả enrollment cho class và subject này
      const enrollments = await Enrollment.findAll({
        where: {
          class_id: classId,
          subject_id: subjectId
        },
        attributes: ['enrollment_id']
      });
      
      const enrollmentIds = enrollments.map(e => e.enrollment_id);
      whereCondition.enrollment_id = enrollmentIds;
    }
    
    const totalRetakes = await GradeRetake.count({ where: whereCondition });
    const examRetakes = await GradeRetake.count({ 
      where: { ...whereCondition, retake_type: 'RETAKE_EXAM' }
    });
    const courseRetakes = await GradeRetake.count({ 
      where: { ...whereCondition, retake_type: 'RETAKE_COURSE' }
    });
    
    const pendingRetakes = await GradeRetake.count({ 
      where: { ...whereCondition, result_status: 'PENDING' }
    });
    
    const passedRetakes = await GradeRetake.count({ 
      where: { ...whereCondition, result_status: 'PASS' }
    });
    
    res.json({
      success: true,
      data: {
        total: totalRetakes,
        examRetakes,
        courseRetakes,
        pending: pendingRetakes,
        passed: passedRetakes,
        failed: totalRetakes - passedRetakes - pendingRetakes
      }
    });
    
  } catch (error) {
    console.error('Error getting retake stats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thống kê: ' + error.message,
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
    // Import additional models
    const { Student, Subject, ClassSubject } = await import('../database/index.js');
    
    // Lấy tất cả retake records với thông tin liên quan
    const retakeList = await GradeRetake.findAll({
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['studentCode', 'firstName', 'lastName']
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['subjectName', 'subjectCode']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Transform data để dễ sử dụng
    const transformedData = retakeList.map(retake => {
      const student = retake.student || {};
      const subject = retake.subject || {};
      
      return {
        id: retake.id,
        studentCode: student.studentCode,
        studentName: `${student.lastName || ''} ${student.firstName || ''}`.trim(),
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

/**
 * GET /api/retake/retake-classes
 * Lấy danh sách lớp học lại
 */
router.get('/retake-classes', async (req, res) => {
  try {
    // Import ClassSubject model nếu cần
    const { ClassSubject } = await import('../database/index.js');
    
    // Tìm tất cả lớp học có isRetakeClass = true
    const retakeClasses = await ClassSubject.findAll({
      where: { 
        isRetakeClass: true 
      },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: retakeClasses,
      message: `Tìm thấy ${retakeClasses.length} lớp học lại`
    });

  } catch (error) {
    console.error('Error getting retake classes:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách lớp học lại: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;
