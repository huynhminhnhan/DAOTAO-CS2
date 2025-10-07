/**
 * TeacherPermission AdminJS Resource
 * Module gán quyền nhập điểm cho giảng viên
 */

import { TeacherPermission, User, Class, Subject, Cohort, Semester } from '../backend/database/index.js';
import { Components } from '../config/components.js';

/** @type {import('adminjs').ResourceOptions} */
const teacherPermissionResource = {
  resource: TeacherPermission,
  options: {
    navigation: {
      name: 'Quản lý quyền',
      icon: 'Key'
    },
    properties: {
      // ID
      id: {
        isVisible: { list: true, show: true, edit: false, filter: true }
      },

      // User được gán quyền
      userId: {
        isVisible: { list: true, show: true, edit: true, filter: true },
        isRequired: true,
        reference: 'User',
        description: 'Chọn giảng viên (chỉ hiển thị user có role=teacher)'
      },

      // Phạm vi quyền
      classId: {
        isVisible: { list: true, show: true, edit: true, filter: true },
        reference: 'Class',
        description: 'Để trống = Tất cả các lớp'
      },

      subjectId: {
        isVisible: { list: true, show: true, edit: true, filter: true },
        reference: 'Subject',
        description: 'Để trống = Tất cả các môn'
      },

      cohortId: {
        isVisible: { list: true, show: true, edit: true, filter: true },
        reference: 'Cohort',
        description: 'Để trống = Tất cả các khóa'
      },

      semesterId: {
        isVisible: { list: true, show: true, edit: true, filter: true },
        isRequired: true,
        reference: 'Semester',
        description: 'Học kỳ (bắt buộc)'
      },

      // Thời gian hiệu lực
      validFrom: {
        type: 'date',
        isVisible: { list: true, show: true, edit: true, filter: true },
        isRequired: true,
        components: {
          edit: Components.DatePickerFlatpickr,
          show: Components.DateShowDDMMYYYY
        }
      },

      validTo: {
        type: 'date',
        isVisible: { list: true, show: true, edit: true, filter: true },
        isRequired: true,
        components: {
          edit: Components.DatePickerFlatpickr,
          show: Components.DateShowDDMMYYYY
        }
      },

      // Trạng thái
      status: {
        isVisible: { list: true, show: true, edit: true, filter: true },
        availableValues: [
          { value: 'active', label: '✅ Đang hoạt động' },
          { value: 'expired', label: '⏱️ Hết hạn' },
          { value: 'revoked', label: '🚫 Đã thu hồi' }
        ]
      },

      // Ghi chú
      notes: {
        type: 'textarea',
        isVisible: { list: false, show: true, edit: true, filter: false }
      },

      // Audit fields
      createdBy: {
        isVisible: { list: false, show: true, edit: false, filter: false },
        reference: 'User'
      },

      createdAt: {
        type: 'datetime',
        isVisible: { list: true, show: true, edit: false, filter: true }
      },

      updatedAt: {
        type: 'datetime',
        isVisible: { list: false, show: true, edit: false, filter: false }
      }
    },

    // Custom list properties
    listProperties: ['id', 'userId', 'semesterId', 'classId', 'subjectId', 'validFrom', 'validTo', 'status'],
    
    // Custom show properties
    showProperties: [
      'id', 
      'userId', 
      'classId', 
      'subjectId', 
      'cohortId', 
      'semesterId',
      'validFrom', 
      'validTo', 
      'status', 
      'notes',
      'createdBy',
      'createdAt',
      'updatedAt'
    ],

    // Custom edit properties
    editProperties: [
      'userId',
      'semesterId',
      'classId',
      'subjectId', 
      'cohortId',
      'validFrom',
      'validTo',
      'status',
      'notes'
    ],

    // Custom filter properties
    filterProperties: ['userId', 'semesterId', 'classId', 'subjectId', 'status'],

    // Actions
    actions: {
      // List action
      list: {
        isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin',
      },

      // Show action
      show: {
        isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin',
      },

      // New action
      new: {
        isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin',
        before: async (request, context) => {
          // Ghi nhận người tạo
          if (request.payload && context.currentAdmin) {
            request.payload.createdBy = context.currentAdmin.id;
          }
          return request;
        },
        after: async (response, request, context) => {
          // Log audit trail
          console.log(`✅ Admin ${context.currentAdmin.email} đã tạo quyền mới #${response.record.params.id}`);
          return response;
        }
      },

      // Edit action
      edit: {
        isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin',
        after: async (response, request, context) => {
          // Log audit trail
          console.log(`✏️ Admin ${context.currentAdmin.email} đã cập nhật quyền #${response.record.params.id}`);
          return response;
        }
      },

      // Delete action
      delete: {
        isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin',
        before: async (request, context) => {
          // Confirm trước khi xóa
          console.log(`🗑️ Admin ${context.currentAdmin.email} đang xóa quyền #${request.params.recordId}`);
          return request;
        }
      },

      // Custom Action: Check Expired Permissions
      checkExpired: {
        actionType: 'resource',
        icon: 'Clock',
        label: 'Kiểm tra quyền hết hạn',
        handler: async (request, response, context) => {
          const expiredCount = await TeacherPermission.update(
            { status: 'expired' },
            {
              where: {
                status: 'active',
                validTo: {
                  [require('sequelize').Op.lt]: new Date()
                }
              }
            }
          );

          return {
            notice: {
              message: `Đã cập nhật ${expiredCount[0]} quyền hết hạn`,
              type: 'success'
            }
          };
        }
      }
    }
  }
};

export default teacherPermissionResource;
