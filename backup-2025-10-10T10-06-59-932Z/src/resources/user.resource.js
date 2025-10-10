/**
 * User Resource Configuration
 * Cấu hình resource User theo chuẩn AdminJS
 * 
 * Note: Teacher permissions are now managed via TeacherPermission model,
 * not through TeacherClassAssignment.
 */

import { User } from '../backend/database/index.js';
import { Components } from '../config/components.js';

const UserResource = {
  resource: User,
  options: {
    id: 'users', // ID để mapping với translations
    titleProperty: 'Người dùng', // Title hiển thị
    navigation: {
      name: 'Người dùng',
      icon: 'Settings'
    },
    parent: {
      name: 'Quản lý Hệ thống',
      icon: 'Settings'
    },
  listProperties: ['id', 'username', 'email', 'fullName', 'role', 'status', 'lastLogin'],
  filterProperties: ['username', 'email', 'role', 'status'],
  showProperties: ['id', 'username', 'email', 'fullName', 'role', 'status', 'lastLogin', 'createdAt'],
  editProperties: ['username', 'email', 'fullName', 'role', 'status', 'password'],
    actions: {
      new: {
        isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin',
        before: async (request) => {
          if (request.method === 'post' && request.payload) {
            if (request.payload.password === '') delete request.payload.password;
            // Validate password length if provided; actual hashing is handled by Sequelize hooks
            if (request.payload.password && request.payload.password.length < 6) {
              throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
            }
          }
          return request;
        },
        after: async (response) => {
          if (response.record) {
            response.record.params.password = '';
          }
          return response;
        }
      },
      edit: {
        isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin',
        before: async (request) => {
          if (request.method === 'post' && request.payload) {
            if (request.payload.password === '') delete request.payload.password;
            // Validate password length if provided; hashing handled by model hooks
            if (request.payload.password && request.payload.password.length < 6) {
              throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
            }
          }
          return request;
        },
        after: async (response) => {
          if (response.record) {
            response.record.params.password = '';
          }
          return response;
        }
      },
      show: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher',
        after: async (response) => {
          if (response.record) {
            response.record.params.password = '';
          }
          return response;
        }
      },
      list: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher',
        after: async (response) => {
          if (response.records) {
            for (const r of response.records) {
              r.params.password = '';
            }
          }
          return response;
        }
      },
      delete: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher'
      },
      
      // Custom action: Gán quyền cho giảng viên
      manageTeacherPermissions: {
        actionType: 'resource',
        icon: 'Key',
        label: 'Gán quyền giảng viên',
        component: Components.TeacherPermissionManagement,
        handler: async (request, response, context) => {
          return { record: {} };
        },
        isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin',
      }
    },
    properties: {
      id: { isVisible: { list: true, filter: false, show: true, edit: false } },
      password: {
        isVisible: { list: false, filter: false, show: false, edit: true },
        type: 'password'
      },
      username: { isTitle: true, isRequired: true },
      email: { isRequired: true, type: 'email' },
      fullName: { isRequired: true },
      role: { 
        availableValues: [
          { value: 'admin', label: 'Quản trị viên' },
          { value: 'teacher', label: 'Giảng viên' }
        ]
      },
      status: { 
        availableValues: [
          { value: 'active', label: 'Hoạt động' },
          { value: 'inactive', label: 'Ngừng hoạt động' },
          { value: 'suspended', label: 'Tạm khóa' }
        ]
      }
    }
  }
};

export default UserResource;
