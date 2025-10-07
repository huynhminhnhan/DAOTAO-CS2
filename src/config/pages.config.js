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
  'nhap-diem': {
    component: Components.GradeEntryPage,
    icon: 'Edit',
    parent: {
      name: 'Học tập',
      icon: 'Book'
    }
  },

  // Thêm các pages khác ở đây
  // 'dashboard-custom': {
  //   component: Components.CustomDashboard,
  //   icon: 'Dashboard',
  //   parent: {
  //     name: 'Báo cáo',
  //     icon: 'Analytics'
  //   }
  // }
};
