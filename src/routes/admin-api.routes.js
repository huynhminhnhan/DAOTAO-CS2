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

// Admin-only endpoint to delete teacher permission
router.delete('/admin-api/teacher-permissions/:id', AdminApiController.deleteTeacherPermission);

// Get current logged-in user info
router.get('/admin-api/auth/current-user', (req, res) => {
  try {
    if (!req.session || !req.session.adminUser) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: req.session.adminUser.id,
        email: req.session.adminUser.email,
        username: req.session.adminUser.username,
        role: req.session.adminUser.role
      }
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting current user',
      error: error.message
    });
  }
});

// Get teacher's assigned cohorts
router.get('/admin-api/teacher-permissions/my-cohorts', async (req, res) => {
  try {
    if (!req.session || !req.session.adminUser) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const userId = req.session.adminUser.id;
    const { Cohort, Class, TeacherPermission } = await import('../backend/database/index.js');
    
    // Get all active permissions for teacher
    const permissions = await TeacherPermission.findAll({
      where: {
        userId: userId,
        status: 'active'
      },
      attributes: ['classId', 'validFrom', 'validTo']
    });
    
    // Check current date against validFrom and validTo
    const now = new Date();
    const validPermissions = permissions.filter(perm => {
      if (!perm.validFrom || !perm.validTo) return true;
      const validFrom = new Date(perm.validFrom);
      const validTo = new Date(perm.validTo);
      return now >= validFrom && now <= validTo;
    });
    
    // Extract unique classIds
    const classIds = [...new Set(validPermissions.map(p => p.classId).filter(id => id !== null))];
    
    if (classIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'Không có lớp nào được phân công'
      });
    }
    
    // Get classes to find cohortIds
    const classes = await Class.findAll({
      where: {
        id: classIds
      },
      attributes: ['cohortId']
    });
    
    // Extract unique cohortIds
    const cohortIds = [...new Set(classes.map(c => c.cohortId).filter(id => id !== null))];
    
    if (cohortIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'Không có khóa học nào'
      });
    }
    
    // Get cohort details
    const cohorts = await Cohort.findAll({
      where: {
        cohortId: cohortIds
      },
      attributes: ['cohortId', 'name', 'startDate', 'endDate', 'description'],
      order: [['name', 'ASC']]
    });
    
    res.json({
      success: true,
      data: cohorts.map(c => {
        // Extract year from startDate and endDate
        const startYear = c.startDate ? new Date(c.startDate).getFullYear() : '';
        const endYear = c.endDate ? new Date(c.endDate).getFullYear() : '';
        
        return {
          cohortId: c.cohortId,
          name: c.name,
          startYear: startYear,
          endYear: endYear,
          description: c.description
        };
      })
    });
  } catch (error) {
    console.error('Error loading teacher cohorts:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách khóa học',
      error: error.message
    });
  }
});

// Get teacher's assigned classes by cohort
router.get('/admin-api/teacher-permissions/my-classes/:cohortId', async (req, res) => {
  try {
    if (!req.session || !req.session.adminUser) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const userId = req.session.adminUser.id;
    const cohortId = parseInt(req.params.cohortId);
    
    if (isNaN(cohortId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cohort ID'
      });
    }
    
    const { Class, TeacherPermission } = await import('../backend/database/index.js');
    
    // Get all active permissions for teacher
    const permissions = await TeacherPermission.findAll({
      where: {
        userId: userId,
        status: 'active'
      },
      attributes: ['classId', 'validFrom', 'validTo']
    });
    
    // Check current date against validFrom and validTo
    const now = new Date();
    const validPermissions = permissions.filter(perm => {
      if (!perm.validFrom || !perm.validTo) return true; // No date restriction
      const validFrom = new Date(perm.validFrom);
      const validTo = new Date(perm.validTo);
      return now >= validFrom && now <= validTo;
    });
    
    // Extract unique classIds
    const classIds = [...new Set(validPermissions.map(p => p.classId).filter(id => id !== null))];
    
    if (classIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'Không có lớp nào được phân công'
      });
    }
    
    // Get class details filtered by cohortId
    const classes = await Class.findAll({
      where: {
        id: classIds,
        cohortId: cohortId
      },
      attributes: ['id', 'className', 'classCode', 'academicYear', 'semester', 'cohortId'],
      order: [['className', 'ASC']]
    });
    
    res.json({
      success: true,
      data: classes.map(c => ({
        id: c.id,
        className: c.className,
        classCode: c.classCode,
        academicYear: c.academicYear,
        semester: c.semester,
        cohortId: c.cohortId
      }))
    });
  } catch (error) {
    console.error('Error loading teacher classes by cohort:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách lớp',
      error: error.message
    });
  }
});

export default router;
