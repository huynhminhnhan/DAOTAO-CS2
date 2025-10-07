import express from 'express';
import GradeUpdateController from '../controllers/GradeUpdateController.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Routes cho cập nhật điểm thi lại và học lại
 */

// Middleware authentication cho tất cả routes
// router.use(authMiddleware.checkRole(['admin', 'teacher']));

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