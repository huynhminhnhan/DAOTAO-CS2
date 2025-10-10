/**
 * AdminJS Components Configuration
 * Centralized component loading following AdminJS best practices
 */

import { ComponentLoader } from 'adminjs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize ComponentLoader
const componentLoader = new ComponentLoader();

// Register all custom components
const Components = {
  // Custom pages
  GradeEntryPage: componentLoader.add('GradeEntryPage', path.join(__dirname, '../components/GradeEntryPageComponent.jsx')),
  StudentImportComponent: componentLoader.add('StudentImportComponent', path.join(__dirname, '../components/StudentImportComponent.jsx')),
  BulkEnrollmentComponent: componentLoader.add('BulkEnrollmentComponent', path.join(__dirname, '../components/BulkEnrollmentComponent.jsx')),
  StudentTranscript: componentLoader.add('StudentTranscript', path.join(__dirname, '../components/StudentTranscriptComponent.jsx')),
  // Backwards-compatible alias: some resources reference `StudentTranscriptComponent`
  // StudentTranscriptComponent: componentLoader.add('StudentTranscriptComponent', path.join(__dirname, '../components/StudentTranscriptComponent.jsx')),
  StudentTranscriptComponent: componentLoader.add('StudentTranscriptComponent', path.join(__dirname, '../components/StudentRecordTranscriptComponent.jsx')),
  TeacherPermissionManagement: componentLoader.add('TeacherPermissionManagement', path.join(__dirname, '../components/TeacherPermissionManagement.jsx')),
  TeacherGradeEntry: componentLoader.add('TeacherGradeEntry', path.join(__dirname, '../components/TeacherGradeEntryComponent.jsx')),
  DateShowDDMMYYYY: componentLoader.add('DateShowDDMMYYYY', path.join(__dirname, '../components/DateShowDDMMYYYY.jsx')),
  DatePickerFlatpickr: componentLoader.add('DatePickerFlatpickr', path.join(__dirname, '../components/DatePickerFlatpickr.jsx')),
  AdminDashboard: componentLoader.add('AdminDashboard', path.join(__dirname, '../components/AdminDashboard.jsx')),
  CustomAdminLogin: componentLoader.add('CustomAdminLogin', path.join(__dirname, '../components/CustomAdminLogin.jsx')),
  GradeHistoryDiff: componentLoader.add('GradeHistoryDiff', path.join(__dirname, '../components/GradeHistoryDiff.jsx')),
  StudentGradeHistoryTab: componentLoader.add('StudentGradeHistoryTab', path.join(__dirname, '../components/StudentGradeHistoryTab.jsx')),
};

// Override login page
componentLoader.override('Login', path.join(__dirname, '../components/CustomAdminLogin.jsx'));

// Override default components if needed
// const OverriddenComponents = {
//   SidebarFooter: componentLoader.override('SidebarFooter', path.join(__dirname, '../components/CustomSidebarFooter.jsx')),
// };

export { componentLoader, Components };
