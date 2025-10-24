const rateLimit = require('express-rate-limit');

/**
 * Rate limiting chung cho API
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // tối đa 100 requests per IP trong 15 phút
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiting nghiêm ngặt cho login và sensitive operations
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5, // tối đa 5 attempts per IP trong 15 phút
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiting cho file upload
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 10, // tối đa 10 uploads per IP trong 1 giờ
  message: {
    success: false,
    message: 'Too many file uploads, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Middleware validation input
 */
const validateInput = (schema) => {
  return (req, res, next) => {
    try {
      // Kiểm tra request body theo schema (có thể dùng Joi hoặc custom validation)
      const { error, value } = schema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }
      
      req.body = value; // Sử dụng validated data
      next();
    } catch (error) {
      console.error('Validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal validation error'
      });
    }
  };
};

/**
 * Middleware sanitization để tránh XSS và injection attacks
 */
const sanitizeInput = (req, res, next) => {
  try {
    // Đơn giản loại bỏ các ký tự nguy hiểm
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

    next();
  } catch (error) {
    console.error('Sanitization error:', error);
    next(); // Tiếp tục ngay cả khi có lỗi sanitization
  }
};

/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', err);

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors.map(error => ({
        field: error.path,
        message: error.message
      }))
    });
  }

  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Data already exists',
      errors: err.errors.map(error => ({
        field: error.path,
        message: `${error.path} already exists`
      }))
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message: message
  });
};

module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  validateInput,
  sanitizeInput,
  errorHandler
};
