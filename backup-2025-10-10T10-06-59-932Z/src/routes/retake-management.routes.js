/**
 * Retake Routes - API endpoints cho quản lý thi lại và học lại
 */

import express from 'express';
import RetakeController from '../controllers/RetakeController.js';
import { requireAdminSession, requireAdminOrTeacher, requireAdmin } from "../backend/middleware/session-auth.js";

const router = express.Router();

// ✅ SECURITY FIX: Admin and teacher only
// Retake management operations should be controlled
router.use(requireAdminSession);
router.use(requireAdminOrTeacher);

console.log('✅ Retake management routes protected - Admin/Teacher only');

// Phân tích trạng thái điểm
router.get('/analyze/:gradeId', RetakeController.analyzeGrade);

// Tạo đăng ký học lại
router.post('/create-course', RetakeController.createRetakeCourse);

// Tạo đăng ký thi lại
router.post('/create-exam', RetakeController.createRetakeExam);

// Lấy lịch sử thi lại/học lại
router.get('/history/:studentId/:subjectId', RetakeController.getRetakeHistory);

// Cập nhật kết quả thi lại/học lại
router.put('/update-result/:retakeId', RetakeController.updateRetakeResult);

// Lấy danh sách sinh viên cần thi lại/học lại theo lớp và môn
router.get('/students-need-retake/:classId/:subjectId', RetakeController.getStudentsNeedingRetake);

// Thống kê thi lại/học lại
router.get('/stats', RetakeController.getRetakeStats);

// Tạo hàng loạt đăng ký thi lại/học lại
router.post('/bulk-create', RetakeController.bulkCreateRetake);

export default router;