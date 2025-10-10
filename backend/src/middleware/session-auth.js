/**
 * Session Authentication Middleware for AdminJS routes
 * Sử dụng session của AdminJS để authenticate tất cả các API routes
 */

/**
 * Require AdminJS session middleware
 * Kiểm tra xem user đã đăng nhập AdminJS chưa
 */
export const requireAdminSession = (req, res, next) => {
  if (!req.session || !req.session.adminUser) {
    console.warn(`[SECURITY] Unauthorized access attempt: ${req.method} ${req.path} from ${req.ip}`);
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized - Please login to AdminJS first',
      redirectTo: '/admin/login'
    });
  }
  
  // Attach user info to request for logging
  req.user = req.session.adminUser;
  next();
};

/**
 * Optional session middleware
 * Cho phép cả authenticated và anonymous access
 */
export const optionalSession = (req, res, next) => {
  if (req.session && req.session.adminUser) {
    req.user = req.session.adminUser;
  }
  next();
};

/**
 * Role-based authorization middleware (session-based)
 * @param {Array<string>} roles - Allowed roles (e.g., ['admin', 'teacher'])
 */
export const requireRoles = (roles = []) => {
  return (req, res, next) => {
    if (!req.session || !req.session.adminUser) {
      console.warn(`[AUTH] Access denied - No session: ${req.method} ${req.path}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized - Please login first' 
      });
    }

    const userRole = req.session.adminUser.role;
    
    if (!roles.includes(userRole)) {
      console.warn(`[AUTH] Access denied - Role ${userRole} not in ${roles}: ${req.method} ${req.path} - User: ${req.session.adminUser.email}`);
      return res.status(403).json({ 
        success: false, 
        message: `Access denied - Required roles: ${roles.join(', ')}`,
        userRole: userRole
      });
    }

    next();
  };
};

/**
 * Admin-only middleware
 */
export const requireAdmin = requireRoles(['admin']);

/**
 * Admin or Teacher middleware
 */
export const requireAdminOrTeacher = requireRoles(['admin', 'teacher']);

export default {
  requireAdminSession,
  optionalSession,
  requireRoles,
  requireAdmin,
  requireAdminOrTeacher
};
