/**
 * Student Resource Configuration
 * Cấu hình resource Student với layout 2 cột thực sự
 * 
 * Note: Teacher permissions are now managed via TeacherPermission model.
 */
import { Student } from '../backend/database/index.js';
import { Components } from '../config/components.js';
import { getTeacherManagedStudentIds } from '../middleware/teacherPermissions.js';
import { Op } from 'sequelize';

// Tạo custom filter function cho Student resource
const createStudentQueryFilter = async (context) => {
  const { currentAdmin } = context;
  
  if (!currentAdmin || currentAdmin.role !== 'teacher') {
    return {}; // Admin thấy tất cả
  }
  
  const allowedStudentIds = await getTeacherManagedStudentIds(currentAdmin.id);
  
  console.log('[StudentResource] Creating query filter for teacher, allowed IDs:', allowedStudentIds);
  
  if (allowedStudentIds === 'all') {
    return {}; // Teacher có quyền tất cả
  }
  
  if (allowedStudentIds.length === 0) {
    return { id: { [Op.in]: [-999999] } }; // Không có quyền - return empty
  }
  
  return { id: { [Op.in]: allowedStudentIds } }; // Filter theo IDs
};

const StudentResource = {
  resource: Student,
  options: {
    // Custom query filter function được gọi mỗi khi load records
    queryFilter: async (query, context) => {
      const teacherFilter = await createStudentQueryFilter(context);
      
      if (Object.keys(teacherFilter).length > 0) {
        console.log('[StudentResource] Applying queryFilter:', teacherFilter);
        // Merge teacher filter vào query where clause
        query.where = {
          ...query.where,
          ...teacherFilter
        };
      }
      
      return query;
    },
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
          console.log('[StudentResource] ==================== LIST ACTION ====================');
          console.log('[StudentResource] User:', context.currentAdmin?.email, 'Role:', context.currentAdmin?.role);
          
          // Thêm custom Sequelize filter cho teacher
          const teacherFilter = await createStudentQueryFilter(context);
          
          if (Object.keys(teacherFilter).length > 0) {
            // Inject Sequelize where clause vào request
            // AdminJS sẽ merge này vào query
            request._sequelizeWhere = teacherFilter;
            console.log('[StudentResource] Applied Sequelize where:', teacherFilter);
          }
          
          return request;
        }
      },
      search: {
        before: async (request, context) => {
          const { currentAdmin } = context;
          
          console.log('[StudentResource] Search action - User:', currentAdmin?.email, 'Role:', currentAdmin?.role);
          
          // Nếu là teacher, lọc theo permissions
          if (currentAdmin?.role === 'teacher') {
            const teacherFilter = await getTeacherWhereClause(currentAdmin.id, 'student');
            
            console.log('[StudentResource] Teacher search filter:', teacherFilter);
            
            // Nếu có filter (không phải null), apply vào request
            if (teacherFilter !== null) {
              const currentFilters = request.query?.filters || {};
              request.query = {
                ...request.query,
                filters: {
                  ...currentFilters,
                  ...teacherFilter
                }
              };
            }
          }
          
          return request;
        }
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
        ]
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
