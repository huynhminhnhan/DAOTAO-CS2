/**
 * Student Transcript API Routes
 * API routes cho bảng điểm sinh viên theo format chuẩn
 */
import express from 'express';
import { Student, Grade, Subject, Class, Enrollment, Cohort,Semester } from '../backend/database/index.js';
import StudentTranscriptController from '../controllers/StudentTranscriptController.js';
import { requireAdminSession, requireAdminOrTeacher, requireAdmin } from "../backend/middleware/session-auth.js";

const router = express.Router();

console.log('✅ Student transcript routes protected');

// ✅ SECURITY FIX: Admin and teacher can list all students
router.get('/students', 
  requireAdminSession,
  requireAdminOrTeacher,
  StudentTranscriptController.listStudents
);

// ✅ TODO: Add logic in controller to check if student can only view their own transcript
router.get('/student/:studentCode/transcript', 
  requireAdminSession,
  // Allow all roles but controller should check:
  // - Student can only view their own transcript
  // - Teacher/Admin can view all transcripts
  StudentTranscriptController.getTranscript
);

export default router;
