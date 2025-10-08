import express from 'express';
import AdminApiController from '../controllers/AdminApiController.js';
const router = express.Router();

/**
 * ✅ SECURITY FIX: Require AdminJS session for all admin-api routes
 * These routes are used by AdminJS components (React components in admin panel)
 * They should only be accessible when user is logged in to AdminJS
 */
const requireAdminSession = (req, res, next) => {
  // Check if AdminJS session exists
  if (!req.session || !req.session.adminUser) {
    console.warn(`[SECURITY] Unauthorized admin-api access attempt: ${req.method} ${req.path} from ${req.ip}`);
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: AdminJS session required',
      hint: 'Please login to AdminJS first'
    });
  }
  
  // Log access for monitoring
  console.log(`[ADMIN-API] ${req.method} ${req.path} - User: ${req.session.adminUser.email}`);
  
  next();
};

// ✅ Apply middleware to ALL routes in this router
router.use(requireAdminSession);

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

// Admin-only endpoint to create teacher permission
router.post('/admin-api/teacher-permissions', AdminApiController.createTeacherPermission);

export default router;
