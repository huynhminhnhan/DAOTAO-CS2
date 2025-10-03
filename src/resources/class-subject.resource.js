/**
 *const ClassSubjectResource = {
  resource: ClassSubject,
  options: {
    id: 'classSubjects',
    titleProperty: 'Lịch học',
    navigation: {
      name: 'Lịch học',
      icon: 'Calendar'
    },
    parent: {
      name: 'Quản lý Lớp học',
      icon: 'Calendar'
    },ubject Resource Configuration
 * Cấu hình resource ClassSubject cho lịch học lớp-môn theo kỳ
 */
import { ClassSubject } from '../backend/database/index.js';

const ClassSubjectResource = {
  resource: ClassSubject,
  options: {
    parent: {
      name: 'Quản lý Lớp học',
      icon: 'Calendar'
    },
    
    // Cấu hình hiển thị list
    listProperties: ['classId', 'subjectId', 'teacherId', 'semester', 'academicYear', 'status'],
    
    // Cấu hình edit/new form
    editProperties: [
      'classId', 'subjectId', 'teacherId', 'semester', 'academicYear',
      'startDate', 'endDate', 'status'
    ],
    
    // Cấu hình show (chi tiết)
    showProperties: [
      'classId', 'subjectId', 'teacherId', 'semester', 'academicYear',
      'startDate', 'endDate', 'status', 'createdAt', 'updatedAt'
    ],
    
    // Cấu hình filter
    filterProperties: ['classId', 'subjectId', 'teacherId', 'semester', 'academicYear', 'status'],
    
    // Cấu hình properties
    properties: {
      classId: { 
        isRequired: true,
        position: 1,
        description: 'Lớp học'
      },
      subjectId: { 
        isRequired: true,
        position: 2,
        description: 'Môn học'
      },
      teacherId: { 
        isRequired: true,
        position: 3,
        description: 'Giáo viên đứng lớp'
      },
      semester: {
        type: 'select',
        availableValues: [
          { value: 'HK1', label: 'Học kỳ 1' },
          { value: 'HK2', label: 'Học kỳ 2' },
          { value: 'HK3', label: 'Học kỳ 3' }
        ],
        isRequired: true,
        position: 4,
        description: 'Học kỳ'
      },
      academicYear: {
        isRequired: true,
        position: 5,
        description: 'Năm học (VD: 2023-24)'
      },
      startDate: {
        type: 'date',
        position: 6,
        description: 'Ngày bắt đầu học'
      },
      endDate: {
        type: 'date',
        position: 7,
        description: 'Ngày kết thúc học'
      },
      status: {
        type: 'select',
        availableValues: [
          { value: 'scheduled', label: '📅 Đã lên lịch' },
          { value: 'active', label: '▶️ Đang học' },
          { value: 'completed', label: '✅ Hoàn thành' },
          { value: 'cancelled', label: '❌ Đã hủy' }
        ],
        position: 8,
        description: 'Trạng thái lịch học'
      },
      createdAt: {
        isVisible: { list: false, filter: false, show: true, edit: false }
      },
      updatedAt: {
        isVisible: { list: false, filter: false, show: true, edit: false }
      }
    }
  }
};

export default ClassSubjectResource;
