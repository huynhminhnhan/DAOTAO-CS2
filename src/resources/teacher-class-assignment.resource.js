import TeacherClassAssignment from '../backend/database/models/TeacherClassAssignment.js';
import { Teacher, Class } from '../backend/database/index.js';

const TeacherClassAssignmentResource = {
  resource: TeacherClassAssignment,
  options: {
    parent: {
      name: 'Người dùng',
      icon: 'User'
    },
    listProperties: ['id', 'teacherId', 'classId', 'role', 'createdAt'],
    editProperties: ['teacherId', 'classId', 'role'],
    properties: {
      teacherId: { type: 'reference', reference: 'teachers', isRequired: true, label: 'Giáo viên' },
      classId: { type: 'reference', reference: 'classes', isRequired: true, label: 'Lớp' },
      role: { label: 'Vai trò', description: 'Vai trò của giáo viên trong lớp' }
    },
    actions: {
      new: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
      edit: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
      delete: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
      list: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role !== 'teacher' },
      show: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role !== 'teacher' }
    }
  }
};

export default TeacherClassAssignmentResource;
