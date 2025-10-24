/**
 * Student Resource Configuration
 * Cấu hình resource Student với layout 2 cột thực sự
 * 
 * Note: Teacher permissions are now managed via TeacherPermission model.
 */
import { Student } from '../database/index.js';
import { Components } from '../config/components.js';
import { getTeacherManagedClassIds } from '../middleware/teacherPermissions.js';

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
        isAccessible: true,
        before: async (request, context) => {
          const { currentAdmin } = context;
          console.log('[StudentResource] List action - User:', currentAdmin?.email, 'Role:', currentAdmin?.role);
          
          // Nếu là teacher, inject filter vào request để AdminJS query đúng từ đầu
          if (currentAdmin?.role === 'teacher') {
            const allowedClassIds = await getTeacherManagedClassIds(currentAdmin.id);
            
          
            
            // Nếu không có quyền với tất cả lớp, thêm filter classId
            if (allowedClassIds !== 'all') {
              const currentFilters = request.query?.filters || {};
              
              if (allowedClassIds.length === 0) {
                // Không có quyền - filter để không trả về record nào
                request.query = {
                  ...request.query,
                  filters: {
                    ...currentFilters,
                    classId: '-999999' // ID không tồn tại
                  }
                };
              
              } else {
                // Có quyền với các lớp cụ thể - inject filter classId
                // AdminJS hỗ trợ filter với comma-separated values cho "in" operator
                request.query = {
                  ...request.query,
                  filters: {
                    ...currentFilters,
                    classId: allowedClassIds.join(',') // VD: "12,13,14"
                  }
                };
              
              }
            } else {
              console.log('[StudentResource] Teacher has access to ALL classes');
            }
          }
          
          return request;
        },
        after: async (response, request, context) => {
          const { currentAdmin } = context;
          
          // FALLBACK: Nếu before hook filter không work, dùng after hook
          if (currentAdmin?.role === 'teacher') {
            const allowedClassIds = await getTeacherManagedClassIds(currentAdmin.id);
            
            console.log('[StudentResource] After hook - Filtering records');
            console.log('[StudentResource] Total records before filter:', response.records.length);
            
            if (allowedClassIds === 'all') {
              console.log('[StudentResource] Teacher has access to ALL students');
              return response;
            }
            
            if (allowedClassIds.length === 0) {
              console.log('[StudentResource] Teacher has NO permissions');
              response.records = [];
              response.meta.total = 0;
              return response;
            }
            
            // Filter records theo classId
            const allowedIdsSet = new Set(allowedClassIds);
            const filteredRecords = response.records.filter(record => {
              const classId = parseInt(record.params?.classId);
              const isAllowed = allowedIdsSet.has(classId);
              
              if (!isAllowed) {
                console.log(`[StudentResource] Filtering out student ID ${record.params?.id} (classId: ${classId})`);
              }
              
              return isAllowed;
            });
          
            
            response.records = filteredRecords;
            response.meta.total = filteredRecords.length;
          }
          
          return response;
        }
      },
      show: {
        isAccessible: true, // Cho phép tất cả xem chi tiết
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
      new: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin', // Chỉ admin tạo mới
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
      edit: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin', // Chỉ admin sửa
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
      delete: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin' // Chỉ admin xóa
      },
      importStudents: {
        actionType: 'resource',
        icon: 'Upload',
        label: 'Import sinh viên từ Excel',
        component: Components.StudentImportComponent,
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin', // Chỉ admin import
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
        isAccessible: true, // Cho phép tất cả xem bảng điểm
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
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin', // Chỉ admin xem lịch sử
        handler: async (request, response, context) => {
          const { record } = context;
          return {
            record: record.toJSON ? record.toJSON(context.currentAdmin) : record
          };
        }
      }
    }
  }
};

export default StudentResource;
