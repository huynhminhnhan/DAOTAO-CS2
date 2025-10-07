/**
 * AdminJS v7 Configuration with Modular Setup
 * Theo tài liệu: https://docs.adminjs.co/ui-customization/writing-your-own-components
 * 
 * Architecture:
 * - components.js: Component loading và registration
 * - pages.config.js: Custom pages configuration
 * - branding.config.js: UI branding và theme
 * - locale.config.js: Internationalization
 */

import AdminJS from 'adminjs';
import * as AdminJSSequelize from '@adminjs/sequelize';

// Import modular configurations
import { componentLoader } from './components.js';
import { pagesConfig } from './pages.config.js';
import { brandingConfig } from './branding.config.js';
import { localeConfig } from './locale.config.js';

// Register adapter
AdminJS.registerAdapter({
  Database: AdminJSSequelize.Database,
  Resource: AdminJSSequelize.Resource,
});

// Import resources
import StudentResource from '../resources/student.resource.js';
import UserResource from '../resources/user.resource.js';
import ClassResource from '../resources/class.resource.js';
import TeacherResource from '../resources/teacher.resource.js';
import SubjectResource from '../resources/subject.resource.js';
// import TeacherClassAssignmentResource from '../resources/teacher-class-assignment.resource.js';
// import ClassSubjectResource from '../resources/class-subject.resource.js';
import GradeResource from '../resources/grade.resource.js';
import EnrollmentResource from '../resources/enrollment.resource.js';
import CohortResource from '../resources/cohort.resource.js';
import SemesterResource from '../resources/semester.resource.js';
import GradeHistoryResource from '../resources/grade-history.resource.js';
import TeacherPermissionResource from '../resources/teacherPermission.resource.js';

export const createAdminJSConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const skipBundle = process.env.ADMIN_JS_SKIP_BUNDLE === 'true';
  const config = {
    // Component loader for custom components
    componentLoader,
    // Custom dashboard component
    dashboard: {
      component: 'AdminDashboard'
    },
    
    // Resources configuration
    resources: [
      UserResource,
      StudentResource,
      ClassResource,
      TeacherResource, 
      SubjectResource,
  // TeacherClassAssignmentResource,
      // ClassSubjectResource,
      GradeResource,
      EnrollmentResource,
      CohortResource,
      SemesterResource,
  GradeHistoryResource,
      TeacherPermissionResource, // ⭐ Module mới - Gán quyền nhập điểm
    ],
    // Custom pages
    pages: pagesConfig,
    
    // Static assets
    assets: {
      styles: ['/vendor/flatpickr/flatpickr.min.css', '/custom-admin.css', '/vietnamese-fix.css', '/vietnamese-menu-override.css'],
      scripts: ['/vietnamese-text-fixer.js', '/vietnamese-menu-fixer.js', '/ultimate-vietnamese-fixer.js']
    },
    
    // Root path
    rootPath: '/admin',
    
    // Branding configuration
    branding: brandingConfig,
    
    // Locale configuration
    locale: localeConfig
  };

  // Enable bundling để compile JSX components
  config.bundler = {
    babelConfig: '../../.babelrc'
  };

  config.branding =  {
    companyName: 'TRƯỜNG CĐCSND II',
    logo: "/public/assets/logo.jpeg", 
    theme: {
      colors: {
        primary100: '#006A4E',
        primary80: '#008F5A',
        primary60: '#4CAF50',
        accent: '#FFD600',
        hoverBg: '#E8F5E9',
        grey100: '#212121',
        grey80: '#424242',
        grey40: '#BDBDBD',
        grey20: '#F5F5F5',
        filterBg: '#ffffff',
      }
    }
  };
  return new AdminJS(config);
};
