import express from 'express';
import AdminApiController from '../controllers/AdminApiController.js';
const router = express.Router();

// Admin-only lightweight endpoint for AdminJS components to load classes
router.get('/admin-api/classes', AdminApiController.getClasses);

// Admin-only endpoint to get classes by cohort
router.get('/admin-api/classes/by-cohort/:cohortId', AdminApiController.getClassesByCohort);

// Admin-only endpoint to return class assignments for a teacher (by email or userId)
router.get('/admin-api/teacher-assignments', AdminApiController.getTeacherAssignments);

// Admin-only endpoint to return cohorts (session-cookie friendly)
router.get('/admin-api/cohorts', AdminApiController.getCohorts);

// Admin-only endpoint to return subjects (session-cookie friendly)
router.get('/admin-api/subjects', AdminApiController.getSubjects);

// Admin-only endpoint to return subjects by class
router.get('/admin-api/subjects/by-class/:classId', AdminApiController.getSubjectsByClass);

// Admin-only endpoint to return dashboard stats
router.get('/admin-api/dashboard-stats', AdminApiController.getDashboardStats);

export default router;
