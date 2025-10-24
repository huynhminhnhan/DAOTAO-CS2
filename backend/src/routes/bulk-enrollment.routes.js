/**
 * Bulk Enrollment API Routes
 * API endpoints hỗ trợ bulk enrollment component
 */
import express from 'express';
import BulkEnrollmentController from '../controllers/BulkEnrollmentController.js';
import { requireAdminSession, requireAdminOrTeacher } from '../middleware/session-auth.js';

const router = express.Router();

// ✅ SECURITY: Admin and teacher only (session-based)
// Bulk enrollment operations should be controlled
router.use(requireAdminSession);
router.use(requireAdminOrTeacher);

console.log('✅ Bulk enrollment routes protected - Admin/Teacher only (session-based)');

// GET /api/bulk-enrollment/subjects - Lấy danh sách môn học
router.get('/subjects', BulkEnrollmentController.getSubjects);

// POST /api/bulk-enrollment/enroll - Đăng ký hàng loạt
router.post('/enroll', BulkEnrollmentController.bulkEnroll);

// GET /api/bulk-enrollment/stats/:classId/:subjectId/:semester - Thống kê đăng ký
router.get('/stats/:classId/:subjectId/:semester', BulkEnrollmentController.getStats);

export default router;
