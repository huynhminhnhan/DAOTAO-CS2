/**
 * Teacher Permission API Routes
 * API routes cho quản lý quyền nhập điểm của giảng viên
 */

import express from 'express';
import TeacherPermissionService from '../services/TeacherPermissionService.js';
import { checkGradeEntryPermission, checkHasAnyPermission, checkIsTeacher } from '../middleware/checkTeacherPermission.js';

const router = express.Router();

/**
 * GET /api/teacher-permissions/my-permissions
 * Lấy danh sách quyền nhập điểm của giảng viên đang login
 * Middleware: checkIsTeacher
 */
router.get('/my-permissions', checkIsTeacher, async (req, res) => {
  try {
    const userId = req.user.id;
    const status = req.query.status || 'active'; // active/expired/revoked/all

    const permissions = await TeacherPermissionService.getUserPermissions(userId, status);

    res.json({
      success: true,
      data: permissions,
      count: permissions.length
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy danh sách quyền:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách quyền',
      error: error.message
    });
  }
});

/**
 * GET /api/teacher-permissions/permitted-enrollments
 * Lấy danh sách enrollments mà giảng viên có quyền nhập điểm
 * Middleware: checkHasAnyPermission
 * Query params: semesterId, classId, subjectId (optional filters)
 */
router.get('/permitted-enrollments', checkHasAnyPermission, async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = {};

    // Lấy filters từ query params
    if (req.query.semesterId) {
      filters.semesterId = parseInt(req.query.semesterId);
    }
    if (req.query.classId) {
      filters.classId = parseInt(req.query.classId);
    }
    if (req.query.subjectId) {
      filters.subjectId = parseInt(req.query.subjectId);
    }
    if (req.query.cohortId) {
      filters.cohortId = parseInt(req.query.cohortId);
    }

    const enrollments = await TeacherPermissionService.getPermittedEnrollments(userId, filters);

    res.json({
      success: true,
      data: enrollments,
      count: enrollments.length,
      filters
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy danh sách enrollments:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách enrollments',
      error: error.message
    });
  }
});

/**
 * GET /api/teacher-permissions/check/:enrollmentId
 * Kiểm tra quyền nhập điểm cho một enrollment cụ thể
 * Middleware: checkIsTeacher
 */
router.get('/check/:enrollmentId', checkIsTeacher, async (req, res) => {
  try {
    const userId = req.user.id;
    const enrollmentId = parseInt(req.params.enrollmentId);

    const hasPermission = await TeacherPermissionService.checkGradeEntryPermission(
      userId,
      enrollmentId
    );

    res.json({
      success: true,
      hasPermission,
      enrollmentId
    });
  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra quyền:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra quyền',
      error: error.message
    });
  }
});

/**
 * GET /api/teacher-permissions/my-classes
 * Lấy danh sách lớp mà giáo viên được phân công
 * Middleware: checkIsTeacher
 */
router.get('/my-classes', checkIsTeacher, async (req, res) => {
  try {
    const userId = req.user.id;
    const { Class, TeacherPermission } = await import('../database/index.js');
    
    // Lấy tất cả permissions active của giáo viên
    const permissions = await TeacherPermission.findAll({
      where: {
        userId: userId,
        status: 'active'
      },
      attributes: ['classId']
    });
    
    // Extract unique classIds
    const classIds = [...new Set(permissions.map(p => p.classId).filter(id => id !== null))];
    
    if (classIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'Không có lớp nào được phân công'
      });
    }
    
    // Lấy thông tin chi tiết các lớp
    const classes = await Class.findAll({
      where: {
        id: classIds
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
    console.error('❌ Error loading teacher classes:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách lớp',
      error: error.message
    });
  }
});

/**
 * GET /api/teacher-permissions/stats
 * Thống kê quyền của giảng viên (số lớp, môn, sinh viên)
 * Middleware: checkHasAnyPermission
 */
router.get('/stats', checkHasAnyPermission, async (req, res) => {
  try {
    const userId = req.user.id;
    const permissions = req.userPermissions; // Từ middleware

    // Tính toán statistics
    const uniqueClasses = new Set();
    const uniqueSubjects = new Set();
    const uniqueSemesters = new Set();

    permissions.forEach(perm => {
      if (perm.classId) uniqueClasses.add(perm.classId);
      if (perm.subjectId) uniqueSubjects.add(perm.subjectId);
      if (perm.semesterId) uniqueSemesters.add(perm.semesterId);
    });

    res.json({
      success: true,
      stats: {
        totalPermissions: permissions.length,
        uniqueClasses: uniqueClasses.size,
        uniqueSubjects: uniqueSubjects.size,
        uniqueSemesters: uniqueSemesters.size
      }
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy thống kê:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê',
      error: error.message
    });
  }
});

/**
 * GET /admin-api/teacher-permissions/my-cohorts
 * Get teacher's assigned cohorts (for dropdown in TeacherGradeEntryComponent)
 */
router.get('/my-cohorts', async (req, res) => {
  try {
    if (!req.session || !req.session.adminUser) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const userId = req.session.adminUser.id;
    const { Cohort, Class, TeacherPermission } = await import('../database/index.js');
    
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
    console.error('❌ Error loading teacher cohorts:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách khóa học',
      error: error.message
    });
  }
});

/**
 * GET /admin-api/teacher-permissions/my-classes/:cohortId
 * Get teacher's assigned classes by cohort (for dropdown in TeacherGradeEntryComponent)
 */
router.get('/my-classes/:cohortId', async (req, res) => {
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
    
    const { Class, TeacherPermission } = await import('../database/index.js');
    
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
    console.error('❌ Error loading teacher classes by cohort:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách lớp',
      error: error.message
    });
  }
});

export default router;
