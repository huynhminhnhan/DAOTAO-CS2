/**
 * Middleware: Check Teacher Permission
 * Kiểm tra quyền nhập điểm của giảng viên
 */

import TeacherPermissionService from '../services/TeacherPermissionService.js';

/**
 * Middleware kiểm tra quyền nhập điểm cho một enrollment cụ thể
 * Dùng cho các route update grade: PUT /api/grades/:enrollmentId
 */
const checkGradeEntryPermission = async (req, res, next) => {
  try {
    const userId = req.user?.id; // Từ JWT middleware
    const enrollmentId = req.params.enrollmentId || req.body.enrollmentId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập'
      });
    }

    if (!enrollmentId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu enrollmentId'
      });
    }

    // Kiểm tra quyền
    const hasPermission = await TeacherPermissionService.checkGradeEntryPermission(
      userId,
      enrollmentId
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: '🚫 Bạn không có quyền nhập điểm cho sinh viên này',
        hint: 'Vui lòng liên hệ admin để được cấp quyền'
      });
    }

    // User có quyền, cho phép tiếp tục
    next();

  } catch (error) {
    console.error('❌ Lỗi middleware checkGradeEntryPermission:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra quyền',
      error: error.message
    });
  }
};

/**
 * Middleware kiểm tra user có ít nhất 1 quyền active
 * Dùng cho các route list: GET /api/my-permissions, GET /api/permitted-enrollments
 */
const checkHasAnyPermission = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập'
      });
    }

    // Lấy danh sách quyền active
    const permissions = await TeacherPermissionService.getUserPermissions(userId, 'active');

    if (!permissions || permissions.length === 0) {
      return res.status(403).json({
        success: false,
        message: '⚠️ Bạn chưa được cấp quyền nhập điểm',
        hint: 'Vui lòng liên hệ admin để được cấp quyền'
      });
    }

    // Attach permissions vào request để controller sử dụng
    req.userPermissions = permissions;
    
    next();

  } catch (error) {
    console.error('❌ Lỗi middleware checkHasAnyPermission:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra quyền',
      error: error.message
    });
  }
};

/**
 * Middleware kiểm tra role = teacher
 * Dùng cho các route chỉ dành cho giảng viên
 */
const checkIsTeacher = (req, res, next) => {
  try {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập'
      });
    }

    if (userRole !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: '🚫 Chức năng này chỉ dành cho giảng viên',
        userRole
      });
    }

    next();

  } catch (error) {
    console.error('❌ Lỗi middleware checkIsTeacher:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra role',
      error: error.message
    });
  }
};

export {
  checkGradeEntryPermission,
  checkHasAnyPermission,
  checkIsTeacher
};
