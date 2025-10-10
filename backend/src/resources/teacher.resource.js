/**
 * Teacher Resource Configuration
 * Cấu hình resource Teacher với thông tin giáo viên
 */
import { Teacher } from '../backend/database/index.js';

const TeacherResource = {
  resource: Teacher,
  options: {
    id: 'teachers',
    parent: {
      name: 'Người dùng',
      icon: 'User'
    },
    
    // Cấu hình hiển thị list
    listProperties: ['teacherCode', 'fullName', 'email', 'department', 'degree', 'status'],
    
    // Cấu hình edit/new form
    editProperties: [
      'teacherCode', 'fullName', 'email', 'phone', 
      'department', 'degree', 'status'
    ],
    
    // Cấu hình show (chi tiết)
    showProperties: [
      'teacherCode', 'fullName', 'email', 'phone',
      'department', 'degree', 'status', 'createdAt', 'updatedAt'
    ],
    
    // Cấu hình filter
    filterProperties: ['teacherCode', 'fullName', 'email', 'department', 'degree', 'status'],
    
    // Cấu hình properties
    properties: {
      teacherCode: { 
        // isTitle: true, 
        isRequired: true,
        position: 1,
        description: 'Mã giáo viên duy nhất'
      },
      fullName: { 
        isRequired: true,
        isTitle: true, 
        position: 2,
        description: 'Họ và tên đầy đủ của giáo viên'
      },
      email: { 
        isRequired: true, 
        type: 'email',
        position: 3,
        description: 'Email liên hệ'
      },
      phone: {
        position: 4,
        description: 'Số điện thoại liên hệ'
      },
      department: {
        position: 5,
        description: 'Khoa/Bộ môn/Phòng ban'
      },
      degree: {
        type: 'select',
        availableValues: [
          { value: 'Cử nhân', label: 'Cử nhân' },
          { value: 'Thạc sĩ', label: 'Thạc sĩ' },
          { value: 'Tiến sĩ', label: 'Tiến sĩ' },
          { value: 'Phó Giáo sư', label: 'Phó Giáo sư' },
          { value: 'Giáo sư', label: 'Giáo sư' }
        ],
        position: 6,
        description: 'Học vị'
      },
      status: {
        type: 'select',
        availableValues: [
          { value: 'active', label: '✅ Đang làm việc' },
          { value: 'inactive', label: '⏸️ Tạm nghỉ' },
          { value: 'retired', label: '🎖️ Nghỉ hưu' }
        ],
        position: 7,
        description: 'Trạng thái làm việc'
      },
      createdAt: {
        isVisible: { list: false, filter: false, show: true, edit: false }
      },
      updatedAt: {
        isVisible: { list: false, filter: false, show: true, edit: false }
      }
    },
    actions: {
      list: { isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher' },
      show: { isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher' },
      new: { isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher' && currentAdmin?.role === 'admin' },
      edit: { isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher' && currentAdmin?.role === 'admin' },
      delete: { isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher' && currentAdmin?.role === 'admin' }
    }
  }
};

export default TeacherResource;
