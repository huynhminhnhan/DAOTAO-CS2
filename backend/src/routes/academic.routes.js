/**
 * Academic Routes - Cohorts and Semesters API
 */
import express from 'express';
import AcademicController from '../controllers/AcademicController.js';
import { optionalSession } from '../middleware/session-auth.js';

const router = express.Router();

// ✅ SECURITY NOTE: These routes use optional auth
// They work with or without authentication (needed for dropdown components)
// Consider making them session-based if security is a concern
router.use(optionalSession);

// GET /api/cohorts - Lấy danh sách tất cả khóa học
router.get('/cohorts', AcademicController.listCohorts);

// GET /api/semesters - Lấy danh sách tất cả học kỳ
router.get('/semesters', AcademicController.listSemesters);

// GET /api/semesters/by-cohort/:cohortId - Lấy học kỳ theo khóa
router.get('/semesters/by-cohort/:cohortId', AcademicController.listSemestersByCohort);

export default router;
