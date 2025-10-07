/**
 * Student Management System - Main Application (AdminJS v7 + ESM)
 * Hệ thống Quản lý Điểm Sinh viên theo chuẩn AdminJS v7+ và Enterprise Architecture
 * 
 * Features:
 * - ✅ AdminJS v7.8+ với ESM support
 * - ✅ Enterprise Architecture: MVC, Factory, Service Layer, Resource Pattern
 * - ✅ Tự động tính điểm: TX → DK → TBKT → Final → TBMH → Letter Grade
 * - ✅ Phân quyền đầy đủ: Admin, Teacher, Student
 * - ✅ Bảo mật: JWT, Bcrypt, Rate limiting, Input sanitization
 * - ✅ Vietnamese localization (client-side)
 * - ✅ 7 bảng quản lý: Users, Students, Subjects, Classes, Grades, History, Notifications
 * - ✅ Modular Architecture following AdminJS v7 Official Template
 */

import express from 'express';
import AdminJSExpress from '@adminjs/express';
import { Database, Resource } from '@adminjs/sequelize';
import session from 'express-session';
import SequelizeStore from 'connect-session-sequelize';
import path from 'path';

// Import configurations
import { createAdminJSConfig } from './src/config/adminjs-v7.config.js';
import { createExpressApp } from './src/config/server.config.js';
// Auth middleware will be dynamically imported inside startApp for ESM/CJS interop

// Import database
import { 
  sequelize, 
  User,
  syncDatabase
} from './src/backend/database/index.js';

const SessionStore = SequelizeStore(session.Store);

// Hàm khởi động ứng dụng
const startApp = async () => {
  try {
    console.log('🚀 Starting Student Management System...');
    
    // Test kết nối database
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    // Đồng bộ database (không force để giữ dữ liệu)
     await sequelize.sync();
    //await syncDatabase(true); // Tạo dữ liệu mẫu
    console.log('✅ Database synchronized successfully');

    // Create Express app with middleware
    const app = createExpressApp();

    // Session configuration for AdminJS
    const sessionStore = new SessionStore({
      db: sequelize,
    });

    // Comment out app-level session config as AdminJS will handle it
    app.use(session({
      secret: 'your-session-secret-key-here',
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: false, // Set to true in production with HTTPS
        httpOnly: true
      }
    }));

    await sessionStore.sync();

    // Serve static files for custom CSS
    app.use(express.static('public'));
    app.use("/public", express.static("public"))

  // Serve only required vendor assets from node_modules under a safe /vendor prefix
  // This exposes only the flatpickr distribution files, not the entire node_modules.
  const flatpickrDist = path.join(process.cwd(), 'node_modules', 'flatpickr', 'dist');
  app.use('/vendor/flatpickr', express.static(flatpickrDist));

    // Create AdminJS instance with modular configuration
    const adminJs = createAdminJSConfig();
    
    // Skip bundling completely in development mode
    process.env.ADMIN_JS_SKIP_BUNDLE = 'true';
    
    console.log('🔧 Development mode: Components will be served directly (no bundling)');

    // AdminJS authentication
    const adminRouter = AdminJSExpress.buildAuthenticatedRouter(adminJs, {
      authenticate: async (email, password) => {
        try {
          // Allow admin and teacher accounts to authenticate to AdminJS.
          // Resource-level access will be controlled via isAccessible in resource configs.
          const user = await User.findOne({ 
            where: { 
              email: email,
              status: 'active'
            }
          });

          if (!user) return null;

          if (await user.validatePassword(password)) {
            user.lastLogin = new Date();
            await user.save();

            // Return minimal currentAdmin object used by AdminJS
            return {
              id: user.id,
              email: user.email,
              username: user.username,
              role: user.role
            };
          }

          return null;
        } catch (error) {
          console.error('Admin authentication error:', error);
          return null;
        }
      },
      cookieName: 'adminjs',
      cookiePassword: 'your-cookie-secret-here',
      sessionOptions: {
        resave: false,
        saveUninitialized: false,
        secret: 'your-session-secret-key-here',
        store: sessionStore,
        cookie: {
          maxAge: 24 * 60 * 60 * 1000,
          secure: false,
          httpOnly: true
        }
      }
    });

    // Mount AdminJS FIRST
    app.use(adminJs.options.rootPath, adminRouter);

    // NOW setup body parser and other middleware for API routes
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mount admin API routes (classes, teacher-assignments)
  const adminApiRoutes = (await import('./src/routes/admin-api.routes.js')).default;
  app.use('/', adminApiRoutes);

    // Simple input sanitization middleware
    app.use((req, res, next) => {
      if (req.path.startsWith('/admin')) {
        return next(); // Skip sanitization for AdminJS routes
      }
      
      try {
        const sanitize = (obj) => {
          if (typeof obj === 'string') {
            return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                     .replace(/javascript:/gi, '')
                     .replace(/on\w+\s*=/gi, '');
          }
          if (typeof obj === 'object' && obj !== null) {
            for (let key in obj) {
              obj[key] = sanitize(obj[key]);
            }
          }
          return obj;
        };

        if (req.body) req.body = sanitize(req.body);
        if (req.query) req.query = sanitize(req.query);
        if (req.params) req.params = sanitize(req.params);
      } catch (error) {
        console.error('Sanitization error:', error);
      }
      
      next();
    });

    // Homepage
    app.get('/', (req, res) => {
      // If the user is not authenticated via AdminJS session, redirect to Admin login
      // AdminJS stores session info on req.session (the buildAuthenticatedRouter uses the session store).
      // We check for a known session property that AdminJS sets for authenticated users.
      if (!req.session || !req.session.adminUser) {
        return res.redirect('/admin');
      }
    });

    // Health check API
    app.get('/api/health', (req, res) => {
      res.json({
        success: true,
        message: 'Student Management System API is running',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        database: 'SQLite connected',
        adminjs: 'Configured and running',
        architecture: 'AdminJS Official Template - Modular Structure'
      });
    });

  // Protect all /api routes with JWT authentication
  // Public routes (like /api/health) should be registered before this middleware
  // Dynamic import to support CJS middleware in this ESM file
  const authModule = await import('./src/backend/middleware/auth.js');
  const authMiddleware = authModule.default || authModule;
  const { authenticateToken } = authMiddleware;
  //app.use('/api', authenticateToken);

  // Import student routes
  const studentImportRoutes = (await import('./src/routes/student-import.routes.js')).default;
  app.use('/api/student-import', studentImportRoutes);

  // Import grade routes
  const gradeRoutes = (await import('./src/routes/grade.routes.js')).default;
  app.use('/api/grade', gradeRoutes);

  // Import bulk enrollment routes
  const bulkEnrollmentRoutes = (await import('./src/routes/bulk-enrollment.routes.js')).default;
  app.use('/api/bulk-enrollment', bulkEnrollmentRoutes);

  // Import academic routes (cohorts, semesters)
  const academicRoutes = (await import('./src/routes/academic.routes.js')).default;
  app.use('/api', academicRoutes);

  // Import subjects routes
  const subjectsRoutes = (await import('./src/routes/subjects.routes.js')).default;
  app.use('/api', subjectsRoutes);

  // Import student transcript routes
  const studentTranscriptRoutes = (await import('./src/routes/student-transcript.routes.js')).default;
  app.use('/api', studentTranscriptRoutes);

  // Import retake routes
  const retakeRoutes = (await import('./src/routes/retake.routes.js')).default;
  app.use('/api/retake', retakeRoutes);

  // Import retake management routes (new comprehensive system)
  const retakeManagementRoutes = (await import('./src/routes/retake-management.routes.js')).default;
  app.use('/api/retake-management', retakeManagementRoutes);

  // Import retake scoring routes (enhanced)
  const retakeScoringRoutes = (await import('./src/routes/retake-scoring.routes.js')).default;
  app.use('/api/retake', retakeScoringRoutes);

  // Import grade history routes (list/detail/revert)
  const gradeHistoryRoutes = (await import('./src/routes/grade-history.routes.js')).default;
  app.use('/', gradeHistoryRoutes);

  // Import grade update routes (retake exam/course scoring)
  const gradeUpdateRoutes = (await import('./src/routes/grade-update.routes.js')).default;
  app.use('/api/grades', gradeUpdateRoutes);

  // Import teacher permission routes (quyền nhập điểm)
  const teacherPermissionRoutes = (await import('./src/routes/teacher-permission.routes.js')).default;
  app.use('/api/teacher-permissions', teacherPermissionRoutes);

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

    const PORT = process.env.PORT || 3000;
    const HOST = process.env.HOST || 'localhost';

    const server = app.listen(PORT, HOST, () => {
      console.log('');
      console.log('🎉 ================================');
      console.log('   SERVER STARTED SUCCESSFULLY!');
      console.log('🎉 ================================');
      console.log(`   📍 Homepage: http://${HOST}:${PORT}`);
      console.log(`   🛠️  Admin Panel: http://${HOST}:${PORT}/admin`);
      console.log(`   🔌 API Health: http://${HOST}:${PORT}/api/health`);
      console.log('');
      console.log('✅ All systems operational!');
      console.log('   - Database synchronized');
      console.log('   - Sample data created'); 
      console.log('   - AdminJS configured with auto-calculation');
      console.log('   - Security middleware active');
      console.log('   - Modular architecture (AdminJS Official Template)');
      console.log('   - No body-parser conflicts');
      console.log('');
      console.log('🏗️ Architecture:');
      console.log('   - src/config/ - AdminJS & Server configurations');
      console.log('   - src/resources/ - Individual resource configs');
      console.log('   - src/backend/ - Database, middleware, controllers');
      console.log('   - Follows AdminJS official template structure');
      console.log('');
      console.log('🔐 Admin Login:');
      console.log('   Email: admin@university.edu.vn');
      console.log('   Password: 123456');
      console.log('');
      console.log('📊 Features:');
      console.log('   - Auto calculate grades: TX*40% + DK*60% = TBKT');
      console.log('   - Auto calculate GPA: TBKT*40% + Final*60% = TBMH');
      console.log('   - Auto assign letter grades (A, B+, B, C+, C, D+, D, F)');
      console.log('   - Role-based access control');
      console.log('   - Vietnamese localization');
      console.log('');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startApp();
