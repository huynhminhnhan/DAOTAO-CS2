import express from 'express';
import GradeUpdateController from '../controllers/GradeUpdateController.js';
import { requireAdminSession, requireAdminOrTeacher } from '../middleware/session-auth.js';
import { checkGradeEntryPermission } from '../middleware/checkTeacherPermission.js';

const router = express.Router();

/**
 * ✅ SECURITY FIX: Enable authentication and role-based authorization
 * These routes handle sensitive grade updates and must be protected
 */

// Apply AdminJS session authentication
router.use(requireAdminSession);

// Apply role-based authorization (only admin and teacher)
router.use(requireAdminOrTeacher);


/**
 * PUT /api/grades/update-retake-exam
 * Cập nhật điểm thi lại (chỉ điểm thi cuối kỳ và TBMH)
 */
router.put('/update-retake-exam', GradeUpdateController.updateRetakeExam);

/**
 * PUT /api/grades/update-retake-course  
 * Cập nhật điểm học lại (toàn bộ điểm TX, DK, TBKT, Thi, TBMH)
 */
router.put('/update-retake-course', GradeUpdateController.updateRetakeCourse);

/**
 * GET /api/grades/history/:studentId/:subjectId
 * Lấy lịch sử cập nhật điểm của sinh viên cho môn học
 */
router.get('/history/:studentId/:subjectId', GradeUpdateController.getGradeUpdateHistory);

export default router;