/**
 * Centralized Route Manager
 * Quản lý tất cả routes của hệ thống tại một nơi
 * 
 * Structure:
 * - Public routes (no authentication)
 * - AdminJS session routes (/admin-api/*) - SỬ DỤNG SESSION CHO TẤT CẢ
 * 
 * NOTE: Hiện tại chưa implement JWT authentication backend,
 * nên TẤT CẢ routes đều sử dụng AdminJS session authentication
 */

/**
 * Setup all application routes
 * @param {Express.Application} app - Express app instance
 */
export const setupRoutes = async (app) => {

  // ==========================================
  // 1. PUBLIC ROUTES (No authentication)
  // ==========================================
  
  // Health check - public route
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'Student Management System API is running',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: 'SQLite connected',
      adminjs: 'Configured and running',
      architecture: 'AdminJS Official Template - Session-based Auth'
    });
  });

  // ==========================================
  // 2. ADMIN-API ROUTES (AdminJS session-based)
  // ==========================================
  
  const adminApiRoutes = (await import('./admin-api.routes.js')).default;
  app.use('/', adminApiRoutes);

  // ==========================================
  // 3. STUDENT MANAGEMENT ROUTES (Session-based)
  // ==========================================
  
  const studentImportRoutes = (await import('./student-import.routes.js')).default;
  app.use('/admin-api/student-import', studentImportRoutes);

  // ==========================================
  // 4. GRADE MANAGEMENT ROUTES (Session-based)
  // ==========================================
  
  // Main grade routes
  const gradeRoutes = (await import('./grade.routes.js')).default;
  app.use('/admin-api/grade', gradeRoutes);

  // Grade update routes (retake exam/course scoring)
  const gradeUpdateRoutes = (await import('./grade-update.routes.js')).default;
  app.use('/admin-api/grades', gradeUpdateRoutes);

  // Grade history routes (list/detail/revert)
  const gradeHistoryRoutes = (await import('./grade-history.routes.js')).default;
  app.use('/admin-api', gradeHistoryRoutes);

  // Grade state management routes (submit/approve/finalize workflow)
  const gradeStateRoutes = (await import('./grade-state.routes.js')).default;
  app.use('/admin-api/grade/state', gradeStateRoutes);

  // ==========================================
  // 5. ENROLLMENT ROUTES (Session-based)
  // ==========================================
  
  const bulkEnrollmentRoutes = (await import('./bulk-enrollment.routes.js')).default;
  app.use('/admin-api/bulk-enrollment', bulkEnrollmentRoutes);

  // ==========================================
  // 6. RETAKE SYSTEM ROUTES (Session-based)
  // ==========================================
  
  // Legacy retake routes (if still needed)
  const retakeRoutes = (await import('./retake.routes.js')).default;
  app.use('/admin-api/retake', retakeRoutes);

  // New comprehensive retake management
  const retakeManagementRoutes = (await import('./retake-management.routes.js')).default;
  app.use('/admin-api/retake-management', retakeManagementRoutes);

  // Retake scoring routes
  const retakeScoringRoutes = (await import('./retake-scoring.routes.js')).default;
  app.use('/admin-api/retake-scoring', retakeScoringRoutes);

  // ==========================================
  // 7. ACADEMIC DATA ROUTES (Session-based)
  // ==========================================
  
  // Academic routes (cohorts, semesters)
  const academicRoutes = (await import('./academic.routes.js')).default;
  app.use('/admin-api', academicRoutes);

  // Subjects routes
  const subjectsRoutes = (await import('./subjects.routes.js')).default;
  app.use('/admin-api', subjectsRoutes);

  // Semester routes
  const semesterRoutes = (await import('./semester.routes.js')).default;
  app.use('/admin-api/semesters', semesterRoutes);

  // ==========================================
  // 8. TRANSCRIPT ROUTES (Session-based)
  // ==========================================
  
  const studentTranscriptRoutes = (await import('./student-transcript.routes.js')).default;
  app.use('/admin-api', studentTranscriptRoutes);

  // ==========================================
  // 9. TEACHER PERMISSION ROUTES (Session-based)
  // ==========================================
  
  const teacherPermissionRoutes = (await import('./teacher-permission.routes.js')).default;
  app.use('/admin-api/teacher-permissions', teacherPermissionRoutes);

  // ==========================================
  // 11. ERROR HANDLERS
  // ==========================================
  
  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
      path: req.originalUrl
    });
  });

  // Simple error handler
  app.use((err, req, res, next) => {
    console.error('Error occurred:', err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  });

};

/**
 * Route structure summary
 */
export const getRoutesSummary = () => {
  return {
    public: [
      'GET /api/health'
    ],
    adminSession: [
      'GET /admin-api/classes/:classId',
      'GET /admin-api/cohorts',
      'POST /admin-api/classes/:classId/enroll',
      // ... other admin-api routes
    ],
    jwtProtected: {
      students: [
        'POST /api/student-import/upload',
        'POST /api/student-import/confirm'
      ],
      grades: [
        'POST /api/grade/bulk-entry',
        'GET /api/grade/class/:classId',
        'PUT /api/grades/:gradeId/retake-exam',
        'PUT /api/grades/:gradeId/retake-course',
        'GET /api/grade-history/list',
        'GET /api/grade-history/:id',
        'POST /api/grade-history/:id/revert'
      ],
      enrollment: [
        'POST /api/bulk-enrollment/preview',
        'POST /api/bulk-enrollment/confirm'
      ],
      retake: [
        'GET /api/retake/history',
        'POST /api/retake/register',
        'GET /api/retake-management/students',
        'POST /api/retake-management/approve',
        'POST /api/retake/score-entry'
      ],
      academic: [
        'GET /api/cohorts',
        'GET /api/semesters',
        'GET /api/subjects'
      ],
      transcript: [
        'GET /api/student-transcript/:studentCode'
      ],
      permissions: [
        'GET /api/teacher-permissions',
        'PUT /api/teacher-permissions/:id'
      ]
    }
  };
};

export default setupRoutes;
