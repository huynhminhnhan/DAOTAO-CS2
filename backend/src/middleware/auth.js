import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../database/index.js';

/**
 * Middleware xác thực JWT token
 * ✅ ENHANCED: Added security logging for failed authentication attempts
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      // ✅ LOG: No token provided
      console.warn(`[AUTH] 401 - No token: ${req.method} ${req.path} from ${req.ip}`);
      
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Xác thực token
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      // ✅ LOG: Invalid token
      console.warn(`[AUTH] 403 - Invalid token: ${req.method} ${req.path} from ${req.ip}`);
      
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired access token'
      });
    }

    // Kiểm tra user còn tồn tại và active
    const user = await User.findByPk(decoded.id);
    if (!user || user.status !== 'active') {
      // ✅ LOG: User not found or inactive
      console.warn(`[AUTH] 403 - User inactive: ${decoded.email} - ${req.method} ${req.path}`);
      
      return res.status(403).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Gắn thông tin user vào request
    req.user = decoded;
    next();
  } catch (error) {
    // ✅ LOG: Error
    console.error(`[AUTH] 500 - Error: ${error.message} - ${req.method} ${req.path}`);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

/**
 * Middleware phân quyền theo role
 * ✅ ENHANCED: Added logging for access denied
 * @param {Array} allowedRoles - Danh sách role được phép
 */
const authorizeRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      console.warn(`[AUTHZ] 401 - No user in request: ${req.method} ${req.path}`);
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (allowedRoles.length === 0 || allowedRoles.includes(req.user.role)) {
      next();
    } else {
      // ✅ LOG: Access denied due to insufficient role
      console.warn(`[AUTHZ] 403 - Role denied: ${req.user.email} (${req.user.role}) tried to access ${req.method} ${req.path} - Required: ${allowedRoles.join(', ')}`);
      
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        userRole: req.user.role
      });
    }
  };
};

/**
 * Middleware xác thực tùy chọn (optional authentication)
 * Không bắt buộc phải có token, nhưng nếu có thì sẽ xác thực
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded) {
        const user = await User.findByPk(decoded.id);
        if (user && user.status === 'active') {
          req.user = decoded;
        }
      }
    }

    next(); // Tiếp tục dù có token hay không
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Vẫn tiếp tục nếu có lỗi
  }
};

export { authenticateToken, authorizeRoles, optionalAuth };
