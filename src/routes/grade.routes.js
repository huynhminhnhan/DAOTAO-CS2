/**
 * Grade API Routes
 * API routes cho chức năng nhập điểm
 */
import express from 'express';
import GradeApiController from '../controllers/GradeApiController.js';
import GradeBulkController from '../controllers/GradeBulkController.js';
import { Grade, Enrollment, GradeHistory } from '../backend/database/index.js';
// Import middleware (nếu cần dùng)
// import { checkRole, filterByPermission } from '../middleware/auth.middleware.js';

const router = express.Router();

// API lấy sinh viên đã đăng ký môn học cụ thể (ĐÚNG LOGIC NGHIỆP VỤ)
router.get('/enrolled-students', GradeApiController.getEnrolledStudents);

// API lấy toàn bộ sinh viên theo classId cho trang nhập điểm (không bị giới hạn pagination)
router.get('/students/by-class/:classId', GradeApiController.getStudentsByClass);

// API lấy danh sách sinh viên và điểm theo lớp
router.get('/class-grades/:classId', GradeApiController.getClassGrades);

// API lấy danh sách lớp mà giáo viên quản lý
router.get('/teacher-classes', GradeApiController.getTeacherClasses);

// API để lưu điểm số hàng loạt
router.post('/save-bulk', GradeBulkController.saveBulk);

export default router;
