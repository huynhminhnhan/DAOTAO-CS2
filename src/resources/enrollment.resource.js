/**
 * Enrollment Resource - Simple Version
 */
import { Enrollment } from '../backend/database/index.js';
import { Components } from '../config/components.js';
import Semester from '../backend/database/models/Semester.js';
import Cohort from '../backend/database/models/Cohort.js';

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
        reference: 'classes'
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
        before: async (request, context) => {
          const { currentAdmin } = context;
          if (currentAdmin?.role === 'teacher') {
            const { Teacher, TeacherClassAssignment } = await import('../backend/database/index.js');
            const teacher = await Teacher.findOne({ where: { email: currentAdmin.email } });
            if (teacher) {
              const assignments = await TeacherClassAssignment.findAll({ where: { teacherId: teacher.id } });
              const classIds = assignments.map(a => a.classId);
              if (classIds.length > 0) {
                request.query = {
                  ...request.query,
                  'filters.classId': classIds
                };
              }
            }
          }
          return request;
        }
      },
      new: {
        before: async (request) => {
          
          return request;
        }
      },
      bulkEnroll: {
        actionType: 'resource',
        icon: 'Users',
        label: 'Đăng ký môn học theo lớp',
        component: Components.BulkEnrollmentComponent,
        handler: async (request, response, context) => {
          // Component sẽ xử lý logic, handler này chỉ để hiển thị component
          return {
            record: {}
          };
        }
      }
    }
  }
};

export default EnrollmentResource;
