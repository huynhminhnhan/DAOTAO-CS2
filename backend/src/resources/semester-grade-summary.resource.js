/**
 * Semester Grade Summary Resource - Navigation Control via Resource
 *
 * ⚠️ Solution: Dùng TeacherPermission model (đã tồn tại) nhưng custom navigation
 * để tạo menu item riêng cho semester grade summary, với isAccessible control
 */

import { TeacherPermission } from '../database/index.js';
import { Components } from '../config/components.js';

const SemesterGradeSummaryResource = {
  resource: TeacherPermission,

  options: {
    id: 'semester-grade-summary', // ID khác với teacherPermission
    parent: {
      name: 'Học Tập',
      icon: 'Book'
    },
    // // Navigation configuration - Tạo menu item mới
    // navigation: {
    //   name: 'Tổng kết điểm học kỳ',
    //   icon: 'BarChart'
    // },

    // Hide all properties - không hiển thị gì trong list
    listProperties: [],
    showProperties: [],
    editProperties: [],
    filterProperties: [], // Để array trống thay vì false

    // Ẩn filter bar hoàn toàn
    filters: {
      visible: false
    },

    // Actions configuration
    actions: {
      list: {
        // ✅ Control navigation visibility - CHỈ teacher mới thấy
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin && currentAdmin.role === 'admin';
        },
        // ✅ Thay trang list bằng SemesterGradeSummary component
        component: Components.SemesterGradeSummary,
         showFilter: false, // ✅ Ẩn filter
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

export default SemesterGradeSummaryResource;