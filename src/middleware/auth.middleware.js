/**
 * Authentication & Authorization Middleware
 * Middleware xác thực và phân quyền cho giáo viên
 */

const { User, Teacher, Class } = require('../backend/database');

// Middleware kiểm tra quyền truy cập theo vai trò
const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const user = req.session?.adminUser;
      if (!user) {
        return res.status(401).json({ error: 'Chưa đăng nhập' });
      }

      // Admin có quyền truy cập tất cả
      if (user.role === 'admin') {
        req.userPermissions = { 
          role: 'admin', 
          canAccessAll: true,
          managedClasses: [] 
        };
        return next();
      }

      // Kiểm tra vai trò được phép
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Không có quyền truy cập' });
      }

      // Với giáo viên, tìm các lớp họ quản lý
      if (user.role === 'teacher') {
        const teacher = await Teacher.findOne({
          where: { email: user.email },
          include: [{
            model: Class,
            as: 'trainingClasses',
            attributes: ['id', 'classCode', 'className']
          }]
        });

        if (!teacher) {
          return res.status(403).json({ error: 'Không tìm thấy thông tin giáo viên' });
        }

        req.userPermissions = {
          role: 'teacher',
          teacherId: teacher.id,
          canAccessAll: false,
          managedClasses: teacher.trainingClasses.map(c => c.id)
        };
      }

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({ error: 'Lỗi hệ thống' });
    }
  };
};

// Middleware lọc dữ liệu theo quyền
const filterByPermission = (req, res, next) => {
  const { userPermissions } = req;
  
  if (!userPermissions || userPermissions.canAccessAll) {
    return next();
  }

  // Thêm filter cho giáo viên chỉ thấy lớp mình quản lý
  req.classFilter = {
    classId: userPermissions.managedClasses
  };

  next();
};

module.exports = {
  checkRole,
  filterByPermission
};
