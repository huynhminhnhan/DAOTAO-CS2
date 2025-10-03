/**
 * Class Resource Configuration
 * Cấu hình resource Class cho lớp học cố định suốt khóa
 */
import { Class } from '../backend/database/index.js';

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
            const { Cohort } = await import('../backend/database/index.js');
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
        isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher' || currentAdmin?.role === 'teacher',
        before: async (request, context) => {
          const { currentAdmin } = context;
          // If teacher, restrict to classes assigned to them
          if (currentAdmin?.role === 'teacher') {
            const { TeacherClassAssignment, Teacher } = await import('../backend/database/index.js');
            const teacher = await Teacher.findOne({ where: { email: currentAdmin.email } });
            if (teacher) {
              const assignments = await TeacherClassAssignment.findAll({ where: { teacherId: teacher.id } });
              const classIds = assignments.map(a => a.classId);
              request.query = {
                ...request.query,
                'filters.id': classIds
              };
            }
          } else {
            // Auto-filter by cohort if specified
            const { query } = request;
            if (query?.cohortFilter) {
              request.query = {
                ...request.query,
                'filters.cohortId': query.cohortFilter
              };
            }
          }
          return request;
        }
      },
      // Respect teacher scope for AdminJS reference/autocomplete searches
      search: {
        before: async (request, context) => {
          const { currentAdmin } = context;
          if (currentAdmin?.role === 'teacher') {
            const { TeacherClassAssignment, Teacher } = await import('../backend/database/index.js');
            const teacher = await Teacher.findOne({ where: { email: currentAdmin.email } });
            if (teacher) {
              const assignments = await TeacherClassAssignment.findAll({ where: { teacherId: teacher.id } });
              const classIds = assignments.map(a => a.classId);
              if (classIds.length > 0) {
                request.query = {
                  ...request.query,
                  'filters.id': classIds
                };
              }
            }
          }
          return request;
        }
      },
      new: {
        before: async (request, context) => {
          // Auto-populate cohort-related fields based on selected cohort
          
          if (request.payload?.cohortId) {
            const { Cohort } = await import('../backend/database/index.js');
            try {
              const cohort = await Cohort.findByPk(request.payload.cohortId);
              if (cohort) {
                // Auto-set startYear and endYear based on cohort
                console.log(cohort);
                request.payload.startYear = request.payload.startYear || cohort.startYear;
                request.payload.endYear = request.payload.endYear || cohort.endYear;
              }
            } catch (error) {
              console.error('Error loading cohort:', error);
            }
          }
          return request;
        },
        after: async (response, request, context) => {
          if (response.record && !response.record.errors) {
            response.notice = {
              message: `Lớp học đã được tạo thành công với khóa học!`,
              type: 'success'
            };
          }
          return response;
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
          // Hàng 3: Giáo viên khảo thí và Năm bắt đầu
          [{ flexDirection: 'row', flex: true }, [
            ['examTeacherId', { flexGrow: 1, marginRight: 'default' }],
            ['startYear', { flexGrow: 1 }]
          ]],
          // Hàng 4: Năm kết thúc và Sĩ số tối đa
          [{ flexDirection: 'row', flex: true }, [
            ['endYear', { flexGrow: 1, marginRight: 'default' }],
            ['maxStudents', { flexGrow: 1 }]
          ]],
          // Hàng 5: Trạng thái
          [{ flexDirection: 'column', flex: true }, [
            ['status', { flexGrow: 1 }]
          ]]
        ]
      },
      new: {
        isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin',
        layout: [
          // Hàng 1: Mã lớp và Tên lớp
          [{ flexDirection: 'row', flex: true }, [
            ['classCode', { flexGrow: 1, marginRight: 'default' }],
            ['className', { flexGrow: 2 }]
          ]],
          // Hàng 2: Giáo viên chủ nhiệm và đào tạo
          [{ flexDirection: 'row', flex: true }, [
            ['homeroomTeacherId', { flexGrow: 1, marginRight: 'default' }],
            ['trainingTeacherId', { flexGrow: 1 }]
          ]],
          // Hàng 3: Giáo viên khảo thí và Năm bắt đầu
          [{ flexDirection: 'row', flex: true }, [
            ['examTeacherId', { flexGrow: 1, marginRight: 'default' }],
            ['startYear', { flexGrow: 1 }]
          ]],
          // Hàng 4: Năm kết thúc và Sĩ số tối đa
          [{ flexDirection: 'row', flex: true }, [
            ['endYear', { flexGrow: 1, marginRight: 'default' }],
            ['maxStudents', { flexGrow: 1 }]
          ]],
          // Hàng 5: Trạng thái
          [{ flexDirection: 'column', flex: true }, [
            ['status', { flexGrow: 1 }]
          ]]
        ]
      },
      // keep delete admin-only
      delete: { isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin' },
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
      }
    }
  }
};

export default ClassResource;
