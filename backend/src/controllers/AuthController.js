/**
 * Auth Controller - MVC Pattern
 * Xử lý các request liên quan đến authentication
 */

const AuthService = require('../services/AuthService');

class AuthController {
  /**
   * POST /api/auth/login
   * Đăng nhập với email/password
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email và mật khẩu là bắt buộc'
        });
      }

      // Authenticate
      const result = await AuthService.login(email, password);

      res.json({
        success: true,
        message: 'Đăng nhập thành công',
        data: result
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/refresh
   * Làm mới access token
   */
  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token là bắt buộc'
        });
      }

      const result = await AuthService.refreshToken(refreshToken);

      res.json({
        success: true,
        message: 'Làm mới token thành công',
        data: result
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   * Đăng xuất
   */
  static async logout(req, res, next) {
    try {
      const userId = req.user.id; // Từ middleware authentication

      await AuthService.logout(userId);

      res.json({
        success: true,
        message: 'Đăng xuất thành công'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/change-password
   * Thay đổi mật khẩu
   */
  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Validation
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc'
        });
      }

      const result = await AuthService.changePassword(userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   * Lấy thông tin user hiện tại
   */
  static async getCurrentUser(req, res, next) {
    try {
      res.json({
        success: true,
        data: req.user // Từ middleware authentication
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/register
   * Đăng ký tài khoản mới (chỉ admin)
   */
  static async register(req, res, next) {
    try {
      // Kiểm tra quyền admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền tạo tài khoản'
        });
      }

      const userData = req.body;
      const result = await AuthService.register(userData);

      res.status(201).json({
        success: true,
        message: 'Tạo tài khoản thành công',
        data: result
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/reset-password
   * Đặt lại mật khẩu (chỉ admin)
   */
  static async resetPassword(req, res, next) {
    try {
      // Kiểm tra quyền admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền đặt lại mật khẩu'
        });
      }

      const { targetUserId, newPassword } = req.body;
      const adminUserId = req.user.id;

      if (!targetUserId || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'User ID và mật khẩu mới là bắt buộc'
        });
      }

      const result = await AuthService.resetPassword(targetUserId, newPassword, adminUserId);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
