/**
 * AdminJS Pages Configuration
 * Định nghĩa các trang custom trong AdminJS
 */

import { Components } from './components.js';

/**
 * Pages configuration theo AdminJS documentation
 * @link https://docs.adminjs.co/ui-customization/writing-your-own-components#creating-custom-pages
 */
export const pagesConfig = {
  // Semester Grade Summary Page
  // 'semester-grade-summary': {
  //   component: Components.SemesterGradeSummary,
  //   icon: 'DocumentCheck',
  //   label: 'Bảng điểm tổng kết',
  //   handler: async (request, response, context) => {
  //     return {};
  //   }
  // },
  // Teacher Grade Entry Page - ONLY TX and DK scores
  // 'teacher-grade-entry': {
  //   component: Components.TeacherGradeEntry,
  //   icon: 'Edit',
  //   // ❌ KHÔNG đặt trong navigation để ẩn khỏi sidebar menu
  //   // Menu sẽ được thêm động qua client-side script pages-rbac-hider.js
  //   showInNavigation: false, // Thử property này
  //   handler: async (request, response, context) => {
  //     // Check if user is teacher
  //     debugger;
  //     console.log('🧑‍🏫 Teacher Grade Entry page accessed by:', context.currentAdmin);
      
  //     const currentAdmin = context.currentAdmin;
  //     if (!currentAdmin || currentAdmin.role !== 'teacher') {
  //       // Redirect admin về dashboard
  //       if (currentAdmin && currentAdmin.role === 'admin') {
  //         return {
  //           redirectUrl: '/admin'
  //         };
  //       }
  //       return {
  //         text: 'Access denied. This page is only for teachers.',
  //       };
  //     }
  //     return {};
  //   }
  // }
};
