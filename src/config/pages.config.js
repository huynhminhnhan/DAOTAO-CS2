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
  // Teacher Grade Entry Page - ONLY TX and DK scores
  'teacher-grade-entry': {
    component: Components.TeacherGradeEntry,
    icon: 'Edit',
    handler: async (request, response, context) => {
      // Check if user is teacher
      const currentAdmin = context.currentAdmin;
      if (!currentAdmin || currentAdmin.role !== 'teacher') {
        return {
          text: 'Access denied. This page is only for teachers.',
        };
      }
      return {};
    }
  }
};
