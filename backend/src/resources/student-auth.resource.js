/**
 * Student Resource với phân quyền
 * Giáo viên chỉ thấy sinh viên lớp mình quản lý
 */
import { Student, Class } from '../database';

const StudentResourceWithAuth = {
  resource: Student,
  options: {
    parent: {
      name: 'Quản lý Lớp',
      icon: 'Users'
    },
    id: 'Student',
    listProperties: [
      'id',
      'studentCode',
      'fullName',
      'email',
      'gender',
      'phone',
      'class.className',
      'status'
    ],
    showProperties: [
      'id',
      'studentCode', 
      'fullName',
      'email',
      'gender',
      'dateOfBirth',
      'phone',
      'address',
      'class.className',
      'class.classCode',
      'status',
      'createdAt'
    ],
    filterProperties: [
      'studentCode',
      'fullName',
      'email',
      'gender',
      'classId',
      'status'
    ],
    editProperties: [
      'studentCode',
      'fullName', 
      'email',
      'gender',
      'dateOfBirth',
      'phone',
      'address',
      'classId',
      'status'
    ],
    
    // Phân quyền xem/sửa
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin.role === 'admin' || currentAdmin.role === 'teacher';
        },
        before: async (request, context) => {
          const { currentAdmin } = context;
          
          // Admin thấy tất cả
          if (currentAdmin.role === 'admin') {
            return request;
          }
          
          // Giáo viên chỉ thấy lớp mình quản lý
          if (currentAdmin.role === 'teacher') {
            const teacher = await Teacher.findOne({
              where: { email: currentAdmin.email },
              include: [{
                model: Class,
                as: 'trainingClasses',
                attributes: ['id']
              }]
            });
            
            if (teacher) {
              const managedClassIds = teacher.trainingClasses.map(c => c.id);
              request.query = {
                ...request.query,
                'filters.classId': managedClassIds
              };
            }
          }
          
          return request;
        }
      },
      
      edit: {
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin.role === 'admin';
        }
      },
      
      delete: {
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin.role === 'admin';
        }
      },
      
      new: {
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin.role === 'admin';
        }
      }
    },
    
    properties: {
      'classId': {
        reference: 'Classes',
        isTitle: false
      },
      'userId': {
        reference: 'users',
        isVisible: { list: false, show: true, edit: true, filter: false }
      },
      'gender': {
        availableValues: [
          { value: 'male', label: 'Nam' },
          { value: 'female', label: 'Nữ' }
        ]
      },
      'status': {
        availableValues: [
          { value: 'active', label: 'Đang học' },
          { value: 'inactive', label: 'Tạm nghỉ' },
          { value: 'graduated', label: 'Đã tốt nghiệp' },
          { value: 'dropped', label: 'Thôi học' }
        ]
      }
    }
  }
};

export default StudentResourceWithAuth;
