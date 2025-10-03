/**
 * Authentication Service - JWT Management
 * Design Pattern: Service Layer + Factory Pattern
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { User } = require('../../database');

class AuthService {
  /**
   * Tạo JWT tokens (Access + Refresh)
   */
  static generateTokens(payload) {
    const accessToken = jwt.sign(
      payload,
      config.jwt.accessTokenSecret,
      { expiresIn: config.jwt.accessTokenExpiry }
    );

    const refreshToken = jwt.sign(
      payload,
      config.jwt.refreshTokenSecret,
      { expiresIn: config.jwt.refreshTokenExpiry }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Xác thực Access Token
   */
  static verifyAccessToken(token) {
    return jwt.verify(token, config.jwt.accessTokenSecret);
  }

  /**
   * Xác thực Refresh Token
   */
  static verifyRefreshToken(token) {
    return jwt.verify(token, config.jwt.refreshTokenSecret);
  }

  /**
   * Đăng nhập với email/password
   */
  static async login(email, password) {
    // Tìm user với email
    const user = await User.findOne({
      where: { 
        email,
        status: 'active'
      }
    });

    if (!user) {
      throw new Error('Email hoặc mật khẩu không chính xác');
    }

    // Kiểm tra mật khẩu
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      throw new Error('Email hoặc mật khẩu không chính xác');
    }

    // Tạo JWT tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    };

    const tokens = this.generateTokens(tokenPayload);

    // Lưu refresh token vào database
    await user.update({
      refreshToken: tokens.refreshToken,
      lastLogin: new Date()
    });

    return {
      user: user.toJSON(), // toJSON() sẽ loại bỏ password
      tokens
    };
  }

  /**
   * Làm mới Access Token bằng Refresh Token
   */
  static async refreshToken(refreshToken) {
    try {
      // Xác thực refresh token
      const decoded = this.verifyRefreshToken(refreshToken);

      // Tìm user và kiểm tra refresh token
      const user = await User.findOne({
        where: {
          id: decoded.id,
          refreshToken,
          status: 'active'
        }
      });

      if (!user) {
        throw new Error('Refresh token không hợp lệ');
      }

      // Tạo tokens mới
      const tokenPayload = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      };

      const tokens = this.generateTokens(tokenPayload);

      // Cập nhật refresh token mới
      await user.update({
        refreshToken: tokens.refreshToken
      });

      return {
        user: user.toJSON(),
        tokens
      };

    } catch (error) {
      throw new Error('Refresh token không hợp lệ hoặc đã hết hạn');
    }
  }

  /**
   * Đăng xuất (vô hiệu hóa refresh token)
   */
  static async logout(userId) {
    await User.update(
      { refreshToken: null },
      { where: { id: userId } }
    );

    return { message: 'Đăng xuất thành công' };
  }

  /**
   * Thay đổi mật khẩu
   */
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('Người dùng không tồn tại');
    }

    // Kiểm tra mật khẩu hiện tại
    const isValidPassword = await user.validatePassword(currentPassword);
    if (!isValidPassword) {
      throw new Error('Mật khẩu hiện tại không chính xác');
    }

    // Validation mật khẩu mới
    if (newPassword.length < 6) {
      throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
    }

    // Cập nhật mật khẩu (sẽ được mã hóa tự động bởi hook beforeUpdate)
    await user.update({
      password: newPassword,
      refreshToken: null // Vô hiệu hóa tất cả sessions
    });

    return { message: 'Thay đổi mật khẩu thành công' };
  }

  /**
   * Đặt lại mật khẩu (Admin only)
   */
  static async resetPassword(targetUserId, newPassword, adminUserId) {
    // Kiểm tra quyền admin
    const admin = await User.findByPk(adminUserId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('Không có quyền thực hiện thao tác này');
    }

    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      throw new Error('Người dùng không tồn tại');
    }

    // Cập nhật mật khẩu
    await targetUser.update({
      password: newPassword,
      refreshToken: null
    });

    return { message: 'Đặt lại mật khẩu thành công' };
  }

  /**
   * Tạo tài khoản mới
   */
  static async register(userData) {
    const { username, email, password, fullName, role = 'student' } = userData;

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({
      where: { email }
    });

    if (existingUser) {
      throw new Error('Email đã được sử dụng');
    }

    // Kiểm tra username đã tồn tại
    const existingUsername = await User.findOne({
      where: { username }
    });

    if (existingUsername) {
      throw new Error('Username đã được sử dụng');
    }

    // Validation
    if (password.length < 6) {
      throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
    }

    // Tạo user mới (password sẽ được mã hóa tự động)
    const newUser = await User.create({
      username,
      email,
      password,
      fullName,
      role,
      status: 'active'
    });

    return newUser.toJSON();
  }

  /**
   * Lấy thông tin user từ token
   */
  static async getUserFromToken(token) {
    try {
      const decoded = this.verifyAccessToken(token);
      const user = await User.findByPk(decoded.id);
      
      if (!user || user.status !== 'active') {
        throw new Error('User không tồn tại hoặc đã bị vô hiệu hóa');
      }

      return user.toJSON();
    } catch (error) {
      throw new Error('Token không hợp lệ');
    }
  }
}

module.exports = AuthService;
