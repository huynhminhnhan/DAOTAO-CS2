/**
 * Teacher Grade Entry Resource - Navigation Control via Resource
 * 
 * ⚠️ Solution: Dùng TeacherPermission model (đã tồn tại) nhưng custom navigation
 * để tạo menu item riêng cho teacher grade entry, với isAccessible control
 */

import { TeacherPermission } from '../database/index.js';
import { Components } from '../config/components.js';

console.log('🎯 Loading TeacherGradeEntryResource with isAccessible control...');

const TeacherGradeEntryResource = {
  resource: TeacherPermission,
  
  options: {
    id: 'teacher-grade-entry', // ID khác với teacherPermission
    
    // Navigation configuration - Tạo menu item mới
    navigation: {
      name: 'Nhập điểm TX & ĐK',
      icon: 'Edit'
    },
    
    // Hide all properties - không hiển thị gì trong list
    listProperties: [],
    showProperties: [],
    editProperties: [],
    filterProperties: [],
    
    // Actions configuration
    actions: {
      list: {
        // ✅ Control navigation visibility - CHỈ teacher mới thấy
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin && currentAdmin.role === 'teacher';
        },
        // ✅ Thay trang list bằng TeacherGradeEntry component
        component: Components.TeacherGradeEntry,
        // Không cần handler redirect nữa vì đã dùng custom component
      },
      // Hide tất cả actions khác
      show: { isAccessible: false },
      new: { isAccessible: false },
      edit: { isAccessible: false },
      delete: { isAccessible: false },
      bulkDelete: { isAccessible: false }
    }
  }
};

export default TeacherGradeEntryResource;
