/**
 * Grade Resource Configuration with Authorization
 * Cấu hình resource Grade với phân quyền
 */

import { Grade,Teacher,Class,Student } from '../backend/database/index.js';

const GradeResource = {
  resource: Grade,
  options: {
    parent: {
      name: 'Học Tập',
      icon: 'Book'
    },
    
    // Cấu hình hiển thị list
    listProperties: ['studentId', 'enrollmentId', 'semester', 'academicYear', 'tbmhScore', 'letterGrade', 'isPassed'],
    
    // Cấu hình edit/new form
    editProperties: [
      'studentId', 'enrollmentId', 'semester', 'academicYear',
      'txScore', 'dkScore', 'finalScore', 'isRetake', 'notes'
    ],
    
    // Cấu hình show (chi tiết)
    showProperties: [
      'studentId', 'enrollmentId', 'semester', 'academicYear',
      'txScore', 'dkScore', 'finalScore', 'tbktScore', 'tbmhScore', 
      'letterGrade', 'isPassed', 'isRetake', 'retakeCount', 'notes',
      'createdAt', 'updatedAt'
    ],
    
    // Cấu hình filter
    filterProperties: ['studentId', 'enrollmentId', 'semester', 'academicYear', 'letterGrade', 'isPassed', 'isRetake'],
    
    // Thêm action nhập điểm theo lớp
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin'
      },
      show: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin'
      },
      edit: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin'
      },
      delete: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin'
      },
      new: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin'
      }
    },
    
    // Cấu hình properties
    properties: {
      studentId: { 
        isRequired: true,
        position: 1,
        description: 'Sinh viên'
      },
      enrollmentId: { 
        isRequired: true,
        position: 2,
        description: 'Đăng ký học',
  reference: 'Enrollments'
      },
      semester: {
        type: 'select',
        availableValues: [
          { value: 'HK1', label: 'Học kỳ 1' },
          { value: 'HK2', label: 'Học kỳ 2' },
          { value: 'HK3', label: 'Học kỳ 3' }
        ],
        isRequired: true,
        position: 3,
        description: 'Học kỳ'
      },
      academicYear: {
        isRequired: true,
        position: 4,
        description: 'Năm học (VD: 2023-24)'
      },
      txScore: {
        type: 'number',
        position: 5,
        description: 'Điểm thường xuyên (0-10)'
      },
      dkScore: {
        type: 'number',
        position: 6,
        description: 'Điểm đánh giá kỹ năng (0-10)'
      },
      finalScore: {
        type: 'number',
        position: 7,
        description: 'Điểm thi cuối kỳ (0-10)'
      },
      tbktScore: {
        type: 'number',
        isVisible: { list: false, filter: false, show: true, edit: false },
        position: 8,
        description: 'Điểm TB kỹ thuật (tự động tính)'
      },
      tbmhScore: {
        type: 'number',
        isVisible: { list: true, filter: true, show: true, edit: false },
        position: 9,
        description: 'Điểm TB môn học (tự động tính)'
      },
      letterGrade: {
        type: 'select',
        availableValues: [
          { value: 'A+', label: 'A+ (9.0-10.0)' },
          { value: 'A', label: 'A (8.5-8.9)' },
          { value: 'B+', label: 'B+ (8.0-8.4)' },
          { value: 'B', label: 'B (7.0-7.9)' },
          { value: 'C+', label: 'C+ (6.5-6.9)' },
          { value: 'C', label: 'C (5.5-6.4)' },
          { value: 'D+', label: 'D+ (5.0-5.4)' },
          { value: 'D', label: 'D (4.0-4.9)' },
          { value: 'F', label: 'F (0.0-3.9)' }
        ],
        isVisible: { list: true, filter: true, show: true, edit: false },
        position: 10,
        description: 'Xếp loại (tự động tính)'
      },
      isPassed: {
        type: 'boolean',
        isVisible: { list: true, filter: true, show: true, edit: false },
        position: 11,
        description: 'Đã đạt môn'
      },
      isRetake: {
        type: 'boolean',
        position: 12,
        description: 'Học lại'
      },
      retakeCount: {
        type: 'number',
        isVisible: { list: false, filter: false, show: true, edit: false },
        position: 13,
        description: 'Số lần học lại'
      },
      notes: {
        type: 'textarea',
        position: 14,
        description: 'Ghi chú'
      },
      createdAt: {
        isVisible: { list: false, filter: false, show: true, edit: false }
      },
      updatedAt: {
        isVisible: { list: false, filter: false, show: true, edit: false }
      }
    },
    
    // Layout form cho edit và new
    layout: {
      edit: {
        layout: [
          // Hàng 1: Sinh viên và Enrollment
          [{ flexDirection: 'row', flex: true }, [
            ['studentId', { flexGrow: 1, marginRight: 'default' }],
            ['enrollmentId', { flexGrow: 1 }]
          ]],
          // Hàng 2: Học kỳ và Năm học
          [{ flexDirection: 'row', flex: true }, [
            ['semester', { flexGrow: 1, marginRight: 'default' }],
            ['academicYear', { flexGrow: 1 }]
          ]],
          // Hàng 3: Điểm TX và Điểm ĐK
          [{ flexDirection: 'row', flex: true }, [
            ['txScore', { flexGrow: 1, marginRight: 'default' }],
            ['dkScore', { flexGrow: 1 }]
          ]],
          // Hàng 4: Điểm thi và Học lại
          [{ flexDirection: 'row', flex: true }, [
            ['finalScore', { flexGrow: 1, marginRight: 'default' }],
            ['isRetake', { flexGrow: 1 }]
          ]],
          // Hàng 5: Ghi chú
          [{ flexDirection: 'column', flex: true }, [
            ['notes', { flexGrow: 1 }]
          ]]
        ]
      },
      new: {
        layout: [
          // Hàng 1: Sinh viên và Enrollment
          [{ flexDirection: 'row', flex: true }, [
            ['studentId', { flexGrow: 1, marginRight: 'default' }],
            ['enrollmentId', { flexGrow: 1 }]
          ]],
          // Hàng 2: Học kỳ và Năm học
          [{ flexDirection: 'row', flex: true }, [
            ['semester', { flexGrow: 1, marginRight: 'default' }],
            ['academicYear', { flexGrow: 1 }]
          ]],
          // Hàng 3: Điểm TX và Điểm ĐK
          [{ flexDirection: 'row', flex: true }, [
            ['txScore', { flexGrow: 1, marginRight: 'default' }],
            ['dkScore', { flexGrow: 1 }]
          ]],
          // Hàng 4: Điểm thi và Học lại
          [{ flexDirection: 'row', flex: true }, [
            ['finalScore', { flexGrow: 1, marginRight: 'default' }],
            ['isRetake', { flexGrow: 1 }]
          ]],
          // Hàng 5: Ghi chú
          [{ flexDirection: 'column', flex: true }, [
            ['notes', { flexGrow: 1 }]
          ]]
        ]
      }
    }
  }
};

export default GradeResource;
