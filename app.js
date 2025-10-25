import express from 'express';
import AdminJSExpress from '@adminjs/express';
import { Database, Resource } from '@adminjs/sequelize';
import session from 'express-session';
import SequelizeStore from 'connect-session-sequelize';
import path from 'path';

// Import configurations
import { createAdminJSConfig } from './backend/src/config/adminjs-v7.config.js';
import { createExpressApp } from './backend/src/config/server.config.js';
// Auth middleware will be dynamically imported inside startApp for ESM/CJS interop

// Import database
import { 
  sequelize, 
  User,
  syncDatabase
} from './backend/src/database/index.js';

const SessionStore = SequelizeStore(session.Store);

// Hàm khởi động ứng dụng
const startApp = async () => {
  try {    
    // Test kết nối database
    await sequelize.authenticate();
    
    // Đồng bộ database (không force để giữ dữ liệu)
    //await sequelize.sync();
    //await syncDatabase(true); // Tạo dữ liệu mẫu
    // Create Express app with middleware
    const app = createExpressApp();

    // Session configuration for AdminJS
    const sessionStore = new SessionStore({
      db: sequelize,
    });

    // Comment out app-level session config as AdminJS will handle it
    // Use environment variables for secrets in production
    const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret';
    const COOKIE_PASSWORD = process.env.COOKIE_PASSWORD || 'dev-cookie-password';
    const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod';

    app.use(session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: isProduction, // secure cookies in production
        httpOnly: true
      }
    }));

    await sessionStore.sync();

    // Debug middleware - log static file requests
    app.use((req, res, next) => {
      if (req.path.includes('assets') || req.path.includes('.css') || req.path.includes('.jpeg') || req.path.includes('.jpg') || req.path.includes('.png')) {
        console.log(`[STATIC] ${req.method} ${req.path}`);
      }
      next();
    });

    // Serve static files for custom CSS from frontend/public
    const frontendPublicPath = path.join(process.cwd(), 'frontend', 'public');
    
    // Static file options with proper caching and mobile support
    const staticOptions = {
      maxAge: '1d', // Cache for 1 day
      etag: true,
      lastModified: true,
      setHeaders: (res, path) => {
        // Allow cross-origin for images (mobile/ngrok compatibility)
        if (path.endsWith('.jpeg') || path.endsWith('.jpg') || path.endsWith('.png') || path.endsWith('.gif')) {
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Access-Control-Allow-Origin', '*');
        }
      }
    };
    
    app.use(express.static(frontendPublicPath, staticOptions));
    app.use("/public", express.static(frontendPublicPath, staticOptions))

  // Serve only required vendor assets from node_modules under a safe /vendor prefix
  // This exposes only the flatpickr distribution files, not the entire node_modules.
  const flatpickrDist = path.join(process.cwd(), 'node_modules', 'flatpickr', 'dist');
  app.use('/vendor/flatpickr', express.static(flatpickrDist));

    // Create AdminJS instance with modular configuration
    const adminJs = createAdminJSConfig();
    
    // Enable auto-bundling in development mode
    // AdminJS will watch and rebuild components when they change
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode: Auto-bundling enabled for components');
    }

    // AdminJS authentication
    const adminAuthOptions = {
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

          if (!user) {
            console.log(`[Auth] Login failed: User not found or inactive - ${email}`);
            return null;
          }

          if (!(await user.validatePassword(password))) {
            console.log(`[Auth] Login failed: Invalid password - ${email}`);
            return null;
          }

          // Kiểm tra teacher permissions nếu là teacher
          if (user.role === 'teacher') {
            const { TeacherPermission } = await import('./backend/src/database/index.js');
            
            // Kiểm tra xem teacher có ít nhất 1 permission còn valid không
            const activePermissions = await TeacherPermission.findAll({
              where: {
                userId: user.id,
                status: 'active'
              }
            });

            if (activePermissions.length === 0) {
              console.log(`[Auth] Login failed: Teacher ${email} has no active permissions`);
              throw new Error('Tài khoản giáo viên không có quyền truy cập. Vui lòng liên hệ quản trị viên.');
            }

            // Kiểm tra xem có ít nhất 1 permission còn trong thời hạn không
            const now = new Date();
            const validPermissions = activePermissions.filter(perm => {
              const validFrom = new Date(perm.validFrom);
              const validTo = new Date(perm.validTo);
              return now >= validFrom && now <= validTo;
            });

            if (validPermissions.length === 0) {
              console.log(`[Auth] Login failed: All permissions expired for teacher ${email}`);
              throw new Error('Tài khoản giáo viên đã hết thời hạn truy cập. Vui lòng liên hệ quản trị viên.');
            }

            console.log(`[Auth] Teacher ${email} logged in successfully with ${validPermissions.length} valid permissions`);
          }

          // Update last login
          user.lastLogin = new Date();
          await user.save();

          console.log(`[Auth] User ${email} (${user.role}) logged in successfully`);

          // Return minimal currentAdmin object used by AdminJS
          return {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role
          };
        } catch (error) {
          console.error('[Auth] Authentication error:', error);
          
          // Nếu là error message tùy chỉnh, throw ra để hiển thị cho user
          if (error.message && (
            error.message.includes('không có quyền') || 
            error.message.includes('hết thời hạn')
          )) {
            throw error;
          }
          
          return null;
        }
      },
      cookieName: 'adminjs',
      cookiePassword: COOKIE_PASSWORD,
    };

    // Pass sessionOptions as the 4th argument per AdminJS API (not nested inside auth)
    const adminSessionOptions = {
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      // cookie secret is set from auth.cookiePassword inside AdminJS
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        secure: isProduction,
        httpOnly: true
      }
    };

    const adminRouter = AdminJSExpress.buildAuthenticatedRouter(adminJs, adminAuthOptions, undefined, adminSessionOptions);

    // Mount AdminJS FIRST
    app.use(adminJs.options.rootPath, adminRouter);

    // Debug endpoint to test logo loading
    app.get('/api/debug/logo', async (req, res) => {
      const fs = await import('fs');
      const logoPath = path.join(frontendPublicPath, 'assets', 'logo.jpeg');
      res.json({
        logoPath: logoPath,
        exists: fs.existsSync(logoPath),
        expectedUrls: [
          '/assets/logo.jpeg',
          '/public/assets/logo.jpeg'
        ],
        staticBasePath: frontendPublicPath,
        host: req.get('host'),
        protocol: req.protocol
      });
    });

    // NOW setup body parser and other middleware for API routes
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mount admin API routes (classes, teacher-assignments)
  const adminApiRoutes = (await import('./backend/src/routes/admin-api.routes.js')).default;
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

    // ✅ SECURITY: Add request logging middleware
    app.use((req, res, next) => {
      const start = Date.now();
      
      // Log when response finishes
      res.on('finish', () => {
        const duration = Date.now() - start;
        const user = req.user ? `${req.user.email} (${req.user.role})` : 'anonymous';
        const session = req.session?.adminUser ? `AdminJS:${req.session.adminUser.email}` : 'none';
        
        // Only log API routes (skip static files)
        if (req.path.startsWith('/api') || req.path.startsWith('/admin-api')) {
          console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - User: ${user} - Session: ${session}`);
        }
      });
      
      next();
    });

    // Homepage
    app.get('/', (req, res) => {
      // Determine AdminJS root and login URLs
      const adminRoot = adminJs.options.rootPath || '/admin';
      const adminLogin = `${adminRoot.replace(/\/$/, '')}/login`;

      // If the user is not authenticated via AdminJS session, redirect to Admin login page
      if (!req.session || !req.session.adminUser) {
        return res.redirect(adminLogin);
      }

      // If user is authenticated, redirect to the AdminJS dashboard (rootPath)
      return res.redirect(adminRoot);
    });

    // ==========================================
    // SETUP ALL ROUTES (Centralized)
    // ==========================================
    const { setupRoutes } = await import('./backend/src/routes/index.js');
    await setupRoutes(app);

    // When deployed on platforms (Railway, Heroku, etc.) do NOT bind to an
    // explicit external/public IP from env (some platforms expose that IP but
    // it is not available inside the container). Instead bind only to PORT and
    // let Node default to 0.0.0.0 (all interfaces) so the platform router can
    // reach the process. If you previously set HOST env to a public IP, unset
    // it or remove it from Railway variables.
    const PORT = process.env.PORT || 3000;

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server is running (listening on port ${PORT})`);
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
