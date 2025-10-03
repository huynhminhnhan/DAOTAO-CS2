import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../database/index.js';

/**
 * Middleware xác thực JWT token
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Xác thực token
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired access token'
      });
    }

    // Kiểm tra user còn tồn tại và active
    const user = await User.findByPk(decoded.id);
    if (!user || user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Gắn thông tin user vào request
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

/**
 * Middleware phân quyền theo role
 * @param {Array} allowedRoles - Danh sách role được phép
 */
const authorizeRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (allowedRoles.length === 0 || allowedRoles.includes(req.user.role)) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
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
