/**
 * Teacher Permission Service
 * Business logic cho quản lý quyền nhập điểm
 */

import { TeacherPermission, Enrollment, User, Student, Class, Subject, Cohort, Semester, Grade, GradeRetake } from '../database/index.js';
import { Op } from 'sequelize';

class TeacherPermissionService {
  /**
   * Kiểm tra user có quyền nhập điểm cho enrollment không
   * @param {number} userId - ID của user
   * @param {number} enrollmentId - ID của enrollment
   * @returns {Promise<boolean>}
   */
  static async checkGradeEntryPermission(userId, enrollmentId) {
    try {
      // Lấy thông tin enrollment
      const enrollment = await Enrollment.findByPk(enrollmentId);
      if (!enrollment) {
        console.log(`❌ Không tìm thấy enrollment #${enrollmentId}`);
        return false;
      }

      // Kiểm tra user có quyền không
      const hasPermission = await TeacherPermission.checkPermission(userId, enrollmentId);
      
      if (hasPermission) {
        console.log(`✅ User #${userId} có quyền nhập điểm cho enrollment #${enrollmentId}`);
      } else {
        console.log(`🚫 User #${userId} KHÔNG có quyền nhập điểm cho enrollment #${enrollmentId}`);
      }

      return hasPermission;
    } catch (error) {
      console.error('❌ Lỗi khi kiểm tra quyền:', error);
      return false;
    }
  }

  /**
   * Lấy danh sách enrollments mà user có quyền nhập điểm
   * @param {number} userId - ID của user
   * @param {object} filters - Các filter tùy chọn (semesterId, classId, subjectId)
   * @returns {Promise<Array>}
   */
  static async getPermittedEnrollments(userId, filters = {}) {
    try {
      // Lấy tất cả quyền active của user
      const permissions = await TeacherPermission.getActivePermissions(userId);
      
      if (!permissions || permissions.length === 0) {
        console.log(`⚠️ User #${userId} không có quyền nào`);
        return [];
      }

      // Build điều kiện query OR cho từng permission
      const permissionConditions = permissions.map(perm => {
        const condition = {};

        // Semester luôn phải match
        condition.semesterId = perm.semesterId;

        // Class: NULL = tất cả, không NULL = phải match
        if (perm.classId) {
          condition.classId = perm.classId;
        }

        // Subject: NULL = tất cả, không NULL = phải match
        if (perm.subjectId) {
          condition.subjectId = perm.subjectId;
        }

        // Cohort: NULL = tất cả, không NULL = phải match
        if (perm.cohortId) {
          condition.cohortId = perm.cohortId;
        }

        return condition;
      });

      // Thêm filters từ user (nếu có)
      const baseCondition = {
        status: 'active', // Chỉ lấy enrollments đang active
        ...filters // semesterId, classId, subjectId từ filters
      };

      // Query enrollments với điều kiện OR
      const enrollments = await Enrollment.findAll({
        where: {
          ...baseCondition,
          [Op.or]: permissionConditions
        },
        include: [
          { model: Student, as: 'Student' },
          { model: Class, as: 'Class' },
          { model: Subject, as: 'Subject' },
          { model: Cohort, as: 'Cohort' },
          { model: Semester, as: 'Semester' },
          { 
            model: Grade, 
            as: 'Grades',
            include: [
              { 
                model: GradeRetake, 
                as: 'retakes' 
              }
            ]
          }
        ],
        order: [
          ['classId', 'ASC'],
          ['subjectId', 'ASC']
        ]
      });

      console.log(`✅ User #${userId} có quyền nhập điểm cho ${enrollments.length} enrollments`);
      return enrollments;

    } catch (error) {
      console.error('❌ Lỗi khi lấy danh sách enrollments:', error);
      return [];
    }
  }

  /**
   * Tạo quyền mới cho user
   * @param {object} permissionData - Dữ liệu quyền
   * @param {number} createdBy - ID của admin tạo quyền
   * @returns {Promise<object>}
   */
  static async createPermission(permissionData, createdBy) {
    try {
      // Validate user tồn tại
      const user = await User.findByPk(permissionData.userId);
      if (!user) {
        throw new Error(`User #${permissionData.userId} không tồn tại`);
      }

      // Validate role = teacher
      if (user.role !== 'teacher') {
        throw new Error(`User #${permissionData.userId} không phải là giảng viên`);
      }

      // Tạo permission
      const permission = await TeacherPermission.create({
        ...permissionData,
        createdBy
      });

      console.log(`✅ Đã tạo quyền #${permission.id} cho user #${permissionData.userId}`);
      return permission;

    } catch (error) {
      console.error('❌ Lỗi khi tạo quyền:', error);
      throw error;
    }
  }

  /**
   * Cập nhật quyền
   * @param {number} permissionId - ID của quyền
   * @param {object} updateData - Dữ liệu cần cập nhật
   * @returns {Promise<object>}
   */
  static async updatePermission(permissionId, updateData) {
    try {
      const permission = await TeacherPermission.findByPk(permissionId);
      if (!permission) {
        throw new Error(`Quyền #${permissionId} không tồn tại`);
      }

      await permission.update(updateData);
      console.log(`✅ Đã cập nhật quyền #${permissionId}`);
      
      return permission;

    } catch (error) {
      console.error('❌ Lỗi khi cập nhật quyền:', error);
      throw error;
    }
  }

  /**
   * Thu hồi quyền (đặt status = revoked)
   * @param {number} permissionId - ID của quyền
   * @returns {Promise<object>}
   */
  static async revokePermission(permissionId) {
    try {
      const permission = await TeacherPermission.findByPk(permissionId);
      if (!permission) {
        throw new Error(`Quyền #${permissionId} không tồn tại`);
      }

      await permission.update({ status: 'revoked' });
      console.log(`🚫 Đã thu hồi quyền #${permissionId}`);
      
      return permission;

    } catch (error) {
      console.error('❌ Lỗi khi thu hồi quyền:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách quyền của user
   * @param {number} userId - ID của user
   * @param {string} status - Filter theo status (active/expired/revoked/all)
   * @returns {Promise<Array>}
   */
  static async getUserPermissions(userId, status = 'active') {
    try {
      const whereClause = { userId };
      
      if (status !== 'all') {
        whereClause.status = status;
      }

      const permissions = await TeacherPermission.findAll({
        where: whereClause,
        include: [
          { model: Class, as: 'Class' },
          { model: Subject, as: 'Subject' },
          { model: Cohort, as: 'Cohort' },
          { model: Semester, as: 'Semester' }
        ],
        order: [['validTo', 'DESC']]
      });

      return permissions;

    } catch (error) {
      console.error('❌ Lỗi khi lấy danh sách quyền:', error);
      return [];
    }
  }

  /**
   * Kiểm tra và cập nhật quyền hết hạn (chạy bằng cron job)
   * @returns {Promise<number>} Số lượng quyền đã cập nhật
   */
  static async checkAndUpdateExpiredPermissions() {
    try {
      const [updatedCount] = await TeacherPermission.update(
        { status: 'expired' },
        {
          where: {
            status: 'active',
            validTo: {
              [Op.lt]: new Date()
            }
          }
        }
      );

      if (updatedCount > 0) {
        console.log(`⏱️ Đã cập nhật ${updatedCount} quyền hết hạn`);
      }

      return updatedCount;

    } catch (error) {
      console.error('❌ Lỗi khi kiểm tra quyền hết hạn:', error);
      return 0;
    }
  }
}

export default TeacherPermissionService;
