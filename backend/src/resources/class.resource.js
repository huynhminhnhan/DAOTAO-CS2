/**
 * Class Resource Configuration
 * Cấu hình resource Class cho lớp học cố định suốt khóa
 */
import { Class } from '../database/index.js';
import { getTeacherManagedClassIds } from '../middleware/teacherPermissions.js';
import { Components } from '../config/components.js';

const ClassResource = {
  resource: Class,
  options: {
    parent: {
      name: '🏫 Quản lý Lớp học',
      icon: 'Home'
    },
    
    // Cấu hình hiển thị list
    listProperties: ['classCode', 'className', 'cohortId', 'homeroomTeacherId', 'startYear', 'endYear', 'currentStudents', 'maxStudents', 'status'],
    
    // Cấu hình edit/new form
    editProperties: [
      'classCode', 'className', 'cohortId', 'homeroomTeacherId', 'trainingTeacherId', 'examTeacherId',
      'startYear', 'endYear', 'maxStudents', 'status'
    ],
    
    // Cấu hình show (chi tiết)
    showProperties: [
      'classCode', 'className', 'cohortId', 'homeroomTeacherId', 'trainingTeacherId', 'examTeacherId',
      'startYear', 'endYear', 'maxStudents', 'currentStudents', 'status',
      'createdAt', 'updatedAt' 
    ],
    
    // Cấu hình filter
    filterProperties: ['classCode', 'className', 'cohortId', 'homeroomTeacherId', 'startYear', 'endYear', 'status'],
    
    // Cấu hình properties
    properties: {
      classCode: { 
        isTitle: true, 
        isRequired: true,
        position: 1,
        label: 'Mã lớp', 
        description: 'Mã lớp học duy nhất (VD: K22CNTT1)'
      },
      className: { 
        isRequired: true,
        isTitle: true,
        position: 2,
        label: 'Tên lớp', 
        description: 'Tên lớp học đầy đủ'
      },
      cohortId: {
        isRequired: true,
        position: 2.5,
        type: 'reference',
        reference: 'Cohorts',
        label: '🎓 Khóa học',
        description: 'Khóa học mà lớp này thuộc về',
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: true

        },
        // Custom options for better display
        availableValues: async () => {
          try {
            const { Cohort } = await import('../database/index.js');
            const cohorts = await Cohort.findAll({
              where: { status: 'active' },
              order: [['startYear', 'DESC'], ['name', 'ASC']]
            });
            console.log(cohorts);
            return cohorts.map(cohort => ({
              value: cohort.cohortId,
              label: `${cohort.name} (${cohort.startYear}-${cohort.endYear})`
            }));
          } catch (error) {
            console.error('Error loading cohorts:', error);
            return [];
          }
        }
      },
      homeroomTeacherId: { 
        isRequired: true,
        position: 3,
        label: 'Giáo viên chủ nhiệm',
        description: 'Giáo viên chủ nhiệm',
        reference: 'teachers'
      },
      trainingTeacherId: { 
        isRequired: true,
        position: 4,
        label: 'Giáo viên đào tạo',
        description: 'Giáo viên đào tạo',
        reference: 'teachers'
      },
      examTeacherId: { 
        isRequired: true,
        position: 5,
        label: 'Giáo viên khảo thí',
        description: 'Giáo viên khảo thí',
        reference: 'teachers'
      },
      startYear: {
        type: 'number',
        isRequired: true,
        position: 6,
        label: 'Năm bắt đầu',
        description: 'Năm bắt đầu khóa học'
      },
      endYear: {
        type: 'number',
        isRequired: true,
        position: 7,
        label: 'Năm kết thúc',
        description: 'Năm kết thúc khóa học'
      },
      maxStudents: {
        type: 'number',
        position: 8,
        label: 'Sĩ số tối đa',
        description: 'Số sinh viên tối đa'
      },
      currentStudents: {
        type: 'number',
        isVisible: { list: true, filter: false, show: true, edit: false },
        position: 9,
        label: 'Số sinh viên hiện tại',
        description: 'Số sinh viên hiện tại'
      },
      status: {
        type: 'select',
        availableValues: [
          { value: 'active', label: '✅ Đang hoạt động' },
          { value: 'inactive', label: '⏸️ Tạm nghỉ' },
          { value: 'graduated', label: '🎓 Đã tốt nghiệp' }
        ],
        position: 10,
        label: 'Trạng thái',
        description: 'Trạng thái lớp học'
      },
      createdAt: {
        isVisible: { list: false, filter: false, show: true, edit: false }
      },
      updatedAt: {
        isVisible: { list: false, filter: false, show: true, edit: false }
      }
    },
    
    // Layout form và custom actions
    actions: {
      list: {
        isAccessible: true, // Cho phép cả admin và teacher
        before: async (request, context) => {
          const { currentAdmin } = context;
          
          console.log('[ClassResource] List action - User:', currentAdmin?.email, 'Role:', currentAdmin?.role);
          
          // Teacher: Inject filter theo permissions
          if (currentAdmin?.role === 'teacher') {
            const allowedClassIds = await getTeacherManagedClassIds(currentAdmin.id);
            
            console.log('[ClassResource] Teacher allowed class IDs:', allowedClassIds);
            
            // Nếu không có quyền với tất cả lớp, thêm filter id
            if (allowedClassIds !== 'all') {
              const currentFilters = request.query?.filters || {};
              
              if (allowedClassIds.length === 0) {
                // Không có quyền - filter để không trả về record nào
                request.query = {
                  ...request.query,
                  filters: {
                    ...currentFilters,
                    id: '-999999' // ID không tồn tại
                  }
                };
                console.log('[ClassResource] Teacher has NO permissions - filtering to empty');
              } else {
                // Có quyền với các lớp cụ thể - inject filter id
                request.query = {
                  ...request.query,
                  filters: {
                    ...currentFilters,
                    id: allowedClassIds.join(',') // VD: "12,13,14"
                  }
                };
                console.log('[ClassResource] Applied id filter:', allowedClassIds.join(','));
              }
            } else {
              console.log('[ClassResource] Teacher has access to ALL classes');
            }
          } else {
            // Admin: Auto-filter by cohort if specified
            const { query } = request;
            if (query?.cohortFilter) {
              request.query = {
                ...request.query,
                'filters.cohortId': query.cohortFilter
              };
            }
          }
          
          return request;
        },
        after: async (response, request, context) => {
          const { currentAdmin } = context;
          
          // FALLBACK: Nếu before hook filter không work, dùng after hook
          if (currentAdmin?.role === 'teacher') {
            const allowedClassIds = await getTeacherManagedClassIds(currentAdmin.id);
            
            console.log('[ClassResource] After hook - Filtering records');
            console.log('[ClassResource] Total records before filter:', response.records.length);
            
            if (allowedClassIds === 'all') {
              console.log('[ClassResource] Teacher has access to ALL classes');
              return response;
            }
            
            if (allowedClassIds.length === 0) {
              console.log('[ClassResource] Teacher has NO permissions');
              response.records = [];
              response.meta.total = 0;
              return response;
            }
            
            // Filter records
            const allowedIdsSet = new Set(allowedClassIds);
            const filteredRecords = response.records.filter(record => {
              const classId = parseInt(record.params?.id || record.id);
              const isAllowed = allowedIdsSet.has(classId);
              
              if (!isAllowed) {
                console.log(`[ClassResource] Filtering out class ID ${classId}`);
              }
              
              return isAllowed;
            });
            
            console.log('[ClassResource] Filtered records:', filteredRecords.length);
            console.log('[ClassResource] Showing class IDs:', filteredRecords.map(r => r.params?.id || r.id));
            
            response.records = filteredRecords;
            response.meta.total = filteredRecords.length;
          }
          
          return response;
        }
      },
      // Search action for reference/autocomplete
      search: {
        before: async (request, context) => {
          // Teacher permissions now managed via TeacherPermission model
          // No filtering needed here
          return request;
        }
      },
      edit: {
        isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin',
        layout: [
          // Hàng 1: Mã lớp và Tên lớp
          [{ flexDirection: 'row', flex: true }, [
            ['classCode', { flexGrow: 1, marginRight: 'default' }],
            ['className', { flexGrow: 2 }]
          ]],
          // Hàng 2: Khóa học (riêng một hàng để nổi bật)
          [{ flexDirection: 'row', flex: true }, [
            ['cohortId', { flexGrow: 1 }]
          ]],
          // Hàng 3: Giáo viên chủ nhiệm và đào tạo
          [{ flexDirection: 'row', flex: true }, [
            ['homeroomTeacherId', { flexGrow: 1, marginRight: 'default' }],
            ['trainingTeacherId', { flexGrow: 1 }]
          ]],
          // Hàng 4: Giáo viên khảo thí và Năm bắt đầu
          [{ flexDirection: 'row', flex: true }, [
            ['examTeacherId', { flexGrow: 1, marginRight: 'default' }],
            ['startYear', { flexGrow: 1 }]
          ]],
          // Hàng 5: Năm kết thúc và Sĩ số tối đa
          [{ flexDirection: 'row', flex: true }, [
            ['endYear', { flexGrow: 1, marginRight: 'default' }],
            ['maxStudents', { flexGrow: 1 }]
          ]],
          // Hàng 6: Trạng thái
          [{ flexDirection: 'column', flex: true }, [
            ['status', { flexGrow: 1 }]
          ]]
        ]
      },
      new: {
        isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin',
        layout: [
          // Hàng 1: Khóa học (đầu tiên để auto-populate)
          [{ flexDirection: 'row', flex: true }, [
            ['cohortId', { flexGrow: 1 }]
          ]],
          // Hàng 2: Mã lớp và Tên lớp
          [{ flexDirection: 'row', flex: true }, [
            ['classCode', { flexGrow: 1, marginRight: 'default' }],
            ['className', { flexGrow: 2 }]
          ]],
          // Hàng 3: Giáo viên
          [{ flexDirection: 'row', flex: true }, [
            ['homeroomTeacherId', { flexGrow: 1, marginRight: 'default' }],
            ['trainingTeacherId', { flexGrow: 1 }]
          ]],
          // Hàng 4: Giáo viên khảo thí
          [{ flexDirection: 'row', flex: true }, [
            ['examTeacherId', { flexGrow: 1 }]
          ]],
          // Hàng 5: Năm học
          [{ flexDirection: 'row', flex: true }, [
            ['startYear', { flexGrow: 1, marginRight: 'default' }],
            ['endYear', { flexGrow: 1 }]
          ]],
          // Hàng 6: Khác
          [{ flexDirection: 'row', flex: true }, [
            ['maxStudents', { flexGrow: 1, marginRight: 'default' }],
            ['status', { flexGrow: 1 }]
          ]]
        ]
      },
      // Show action with custom component
      show: {
        isAccessible: true, // Allow both admin and teacher to view
        component: Components.ClassDetail, // Use custom component
        before: async (request, context) => {
          const { currentAdmin } = context;
          
          // Teacher: Verify access to this specific class
          if (currentAdmin?.role === 'teacher') {
            const classId = parseInt(request.params.recordId);
            const allowedClassIds = await getTeacherManagedClassIds(currentAdmin.id);
            
            if (allowedClassIds !== 'all' && !allowedClassIds.includes(classId)) {
              throw new Error('Bạn không có quyền xem lớp này');
            }
          }
          
          return request;
        }
      },
      // keep delete admin-only
      delete: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' }
    }
  }
};

export default ClassResource;
