/**
 * Student Resource Configuration
 * Cấu hình resource Student với layout 2 cột thực sự
 */
import { Student } from '../backend/database/index.js';
import { Components } from '../config/components.js';
import StudentResourceService from '../services/studentResource.service.js';

const StudentResource = {
  resource: Student,
  options: {
    parent: {
      name: 'Quản lý Sinh viên',
      icon: 'User'
    },
    
    // // Cấu hình pagination
    // sort: {
    //   sortBy: 'studentCode',
    //   direction: 'asc'
    // },
    
    // // Tăng số records mặc định cho list
    // navigation: {
    //   name: 'Students'
    // },
    
    // Cấu hình hiển thị list
    listProperties: ['studentCode', 'fullName', 'email', 'gender', 'classId', 'status', 'createdAt'],
    
    // Cấu hình edit/new form
    editProperties: [
      'studentCode', 'fullName', 'email', 'classId',
      'gender', 'dateOfBirth', 'phone', 'status'
    ],
    
    // Cấu hình show (chi tiết)
    showProperties: [
      'studentCode', 'fullName', 'email', 'classId',
      'gender', 'dateOfBirth', 'phone', 'status',
  'createdAt', 'updatedAt', 'gradeHistoryTab'
    ],
    
    // Cấu hình filter
    filterProperties: ['studentCode', 'fullName', 'email', 'classId', 'status', 'gender'],
    
    // Cấu hình properties
    properties: {
      studentCode: { 
        // isTitle: true, 
        isRequired: true,
        position: 1,
        description: 'Mã sinh viên duy nhất'
      },
      fullName: { 
        isRequired: true, 
        isRequired: true,
        position: 2,
        description: 'Họ và tên đầy đủ của sinh viên'
      },
      email: { 
        isRequired: false, 
        type: 'email',
        position: 3,
        description: 'Email liên hệ'
      },
      classId: { 
        isRequired: true,
        position: 4,
        description: 'Lớp học cố định suốt khóa'
      },
      gender: {
        type: 'select',
        availableValues: [
          { value: 'male', label: 'Nam' },
          { value: 'female', label: 'Nữ' },
          { value: 'other', label: 'Khác' }
        ],
        position: 5,
        description: 'Giới tính'
      },
      dateOfBirth: {
  type: 'date',
  position: 6,
  label: 'Ngày sinh',
  // description is optional but kept for help text
  description: 'Ngày sinh',
        components: {
          show: Components.DateShowDDMMYYYY,
          edit: Components.DatePickerFlatpickr,
          new: Components.DatePickerFlatpickr
        }
      },
      phone: {
        position: 7,
        description: 'Số điện thoại liên hệ'
      },
      status: {
        type: 'select',
        availableValues: [
          { value: 'active', label: '✅ Đang học' },
          { value: 'suspended', label: '⏸️ Tạm nghỉ' },
          { value: 'graduated', label: '🎓 Đã tốt nghiệp' },
          { value: 'dropped', label: '❌ Thôi học' }
        ],
        position: 8,
        description: 'Trạng thái học tập hiện tại'
      },
      createdAt: {
        isVisible: { list: true, filter: false, show: true, edit: false }
      },
      updatedAt: {
        isVisible: { list: false, filter: false, show: true, edit: false }
      }
      ,
      // Virtual property to render grade history tab inside show view
      gradeHistoryTab: {
        isVisible: { list: false, filter: false, show: true, edit: false, new: false },
        components: {
          show: Components.StudentGradeHistoryTab
        }
      }
    },
    
    // Layout 2 cột cho form edit và new
    actions: {
      list: {
        before: async (request, context) => StudentResourceService.applyTeacherScopeToRequest(request, context)
      },
      // Ensure AdminJS reference/autocomplete search also respects teacher scope
      search: {
        before: async (request, context) => StudentResourceService.applyTeacherScopeToRequest(request, context)
      },
      importStudents: {
        actionType: 'resource',
        icon: 'Upload',
        label: 'Import sinh viên từ Excel',
        component: Components.StudentImportComponent,
        handler: async (request, response, context) => {
          // Chỉ hiển thị component, logic xử lý sẽ được thực hiện qua API riêng
          return {
            record: {}
          };
        }
      },
      viewTranscript: {
        actionType: 'record',
        label: 'Xem bảng điểm',
        component: Components.StudentTranscriptComponent,
        showInDrawer: false,
        handler: async (request, response, context) => {
          const { record, currentAdmin } = context;
          return {
            record: record.toJSON ? record.toJSON(currentAdmin) : record
          };
        }
      },
      gradeHistory: {
        actionType: 'record',
        label: 'Lịch sử sửa điểm',
        component: Components.StudentGradeHistoryTab,
        showInDrawer: false,
        isVisible: true,
        handler: async (request, response, context) => {
          const { record } = context;
          return {
            record: record.toJSON ? record.toJSON(context.currentAdmin) : record
          };
        }
      },
  edit: {
        layout: [
          // Hàng 1: Mã SV và Họ tên
          [{ flexDirection: 'row', flex: true }, [
            ['studentCode', { flexGrow: 1, marginRight: 'default' }],
            ['fullName', { flexGrow: 1 }]
          ]],
          // Hàng 2: Email và Lớp
          [{ flexDirection: 'row', flex: true }, [
            ['email', { flexGrow: 1, marginRight: 'default' }],
            ['classId', { flexGrow: 1 }]
          ]],
          // Hàng 3: Giới tính và Ngày sinh
          [{ flexDirection: 'row', flex: true }, [
            ['gender', { flexGrow: 1, marginRight: 'default' }],
            ['dateOfBirth', { flexGrow: 1 }]
          ]],
          // Hàng 4: Điện thoại và Trạng thái
          [{ flexDirection: 'row', flex: true }, [
            ['phone', { flexGrow: 1, marginRight: 'default' }],
            ['status', { flexGrow: 1 }]
          ]]
        ],
  before: async (request, context) => StudentResourceService.applyTeacherScopeToRequest(request, context)
      },
      new: {
        layout: [
          // Hàng 1: Mã SV và Họ tên
          [{ flexDirection: 'row', flex: true }, [
            ['studentCode', { flexGrow: 1, marginRight: 'default' }],
            ['fullName', { flexGrow: 1 }]
          ]],
          // Hàng 2: Email và Lớp
          [{ flexDirection: 'row', flex: true }, [
            ['email', { flexGrow: 1, marginRight: 'default' }],
            ['classId', { flexGrow: 1 }]
          ]],
          // Hàng 3: Giới tính và Ngày sinh
          [{ flexDirection: 'row', flex: true }, [
            ['gender', { flexGrow: 1, marginRight: 'default' }],
            ['dateOfBirth', { flexGrow: 1 }]
          ]],
          // Hàng 4: Điện thoại và Trạng thái
          [{ flexDirection: 'row', flex: true }, [
            ['phone', { flexGrow: 1, marginRight: 'default' }],
            ['status', { flexGrow: 1 }]
          ]]
        ]
      },
      show: {
        layout: [
          // Hàng 1: Mã SV và Họ tên
          [{ flexDirection: 'row', flex: true }, [
            ['studentCode', { flexGrow: 1, marginRight: 'default' }],
            ['fullName', { flexGrow: 1 }]
          ]],
          // Hàng 2: Email và Lớp
          [{ flexDirection: 'row', flex: true }, [
            ['email', { flexGrow: 1, marginRight: 'default' }],
            ['classId', { flexGrow: 1 }]
          ]],
          // Hàng 3: Giới tính và Ngày sinh
          [{ flexDirection: 'row', flex: true }, [
            ['gender', { flexGrow: 1, marginRight: 'default' }],
            ['dateOfBirth', { flexGrow: 1 }]
          ]],
          // Hàng 4: Điện thoại và Trạng thái
          [{ flexDirection: 'row', flex: true }, [
            ['phone', { flexGrow: 1, marginRight: 'default' }],
            ['status', { flexGrow: 1 }]
          ]]
        ]
      }
    }
  }
};

export default StudentResource;
