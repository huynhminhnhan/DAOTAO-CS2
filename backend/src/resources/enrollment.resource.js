/**
 * Enrollment Resource - Simple Version
 */
import { Enrollment } from '../database/index.js';
import { Components } from '../config/components.js';
import Semester from '../database/models/Semester.js';
import Cohort from '../database/models/Cohort.js';

const EnrollmentResource = {
  resource: Enrollment,
  options: {
    parent: {
      name: '🏫 Quản lý Lớp học',
      icon: 'BookOpen'
    },
  
  listProperties: ['enrollmentId', 'studentId', 'classId', 'subjectId', 'cohortId', 'semesterId', 'status'],
  editProperties: ['studentId', 'classId', 'subjectId', 'cohortId', 'semesterId', 'attempt', 'status', 'note'],
  filterProperties: ['classId', 'subjectId', 'cohortId', 'semesterId', 'status'],
  filters: {
      visible: false
    },
  showFilter: false,
    properties: {
      enrollmentId: {
        position: 1,
        isVisible: { list: true, filter: false, show: true, edit: false }
      },
      studentId: { 
        position: 2,
        isRequired: true,
        type: 'reference',
        reference: 'students'
      },
      classId: { 
        position: 3,
        isRequired: true,
        type: 'reference',
        reference: 'Classes'
      },
      subjectId: { 
        position: 4,
        isRequired: true,
        type: 'reference',
        reference: 'subjects'
      },
      cohortId: {
  position: 4.5,
  isRequired: true,
        type: 'reference',
        reference: 'Cohorts',
        label: 'Khóa',
        isVisible: { list: true, filter: true, show: true, edit: true }
      },
      semesterId: { 
        position: 5,
        isRequired: true,
        type: 'reference',
        reference: 'Semesters',
        label: 'Học kỳ',
      },
      status: { 
        position: 7,
        type: 'string',
        availableValues: [
          { value: 'active', label: 'Đang học' },
          { value: 'withdrawn', label: 'Đã rút' },
          { value: 'completed', label: 'Hoàn thành' }
        ]
      }
    },
    
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin',
        component: Components.BulkEnrollmentComponent,
        showFilter: false, // ✅ Ẩn filter
        before: async (request, context) => {
          // Teacher permissions now managed via TeacherPermission model
          // No filtering needed here - permissions checked at grade entry level
          return request;
        }
      },
      show: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin'
      },
      edit: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin'
      },
      new: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin',
        before: async (request) => {
          
          return request;
        }
      },
      delete: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin'
      },
      // bulkEnroll: {
      //   actionType: 'resource',
      //   icon: 'Users',
      //   label: 'Đăng ký môn học theo lớp',
      //   isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin',
      //   component: Components.BulkEnrollmentComponent,
      //   handler: async (request, response, context) => {
      //     // Component sẽ xử lý logic, handler này chỉ để hiển thị component
      //     return {
      //       record: {}
      //     };
      //   }
      // }
    }
  }
};

export default EnrollmentResource;
