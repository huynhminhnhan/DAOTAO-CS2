/**
 * Student Transcript API Routes
 * API routes cho bảng điểm sinh viên theo format chuẩn
 */
import express from 'express';
import { Student, Grade, Subject, Class, Enrollment, Cohort,Semester } from '../backend/database/index.js';
import StudentTranscriptController from '../controllers/StudentTranscriptController.js';

const router = express.Router();

// API lấy danh sách sinh viên
router.get('/students', StudentTranscriptController.listStudents);

// API lấy bảng điểm chi tiết của sinh viên
router.get('/student/:studentCode/transcript', StudentTranscriptController.getTranscript);

export default router;
