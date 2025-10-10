import Semester from '../database/models/Semester.js';
import Cohort from '../database/models/Cohort.js';
import { Components } from '../config/components.js';

const SemesterResource = {
  resource: Semester,
  options: {
    parent: {
      name: 'Cài đặt chung',
      icon: 'Layers'
    },
  listProperties: ['semesterId', 'displayName', 'academicYear', 'startDate', 'endDate', 'order'],
  showProperties: ['semesterId', 'name', 'academicYear', 'cohortId', 'startDate', 'endDate', 'order', 'createdAt', 'updatedAt'],
  editProperties: ['name', 'academicYear', 'cohortId', 'startDate', 'endDate', 'order'],
  filterProperties: ['name', 'academicYear', 'cohortId', 'order'],
    properties: {
      semesterId: { 
        isVisible: { list: true, show: true, edit: false, filter: false },
        label: 'ID học kỳ',
        description: 'Mã định danh học kỳ'
      },
      name: { 
        isRequired: true, 
        position: 1,
        label: 'Tên học kỳ',
        description: 'Tên học kỳ (VD: Học kỳ 1, Học kỳ 2)'
      },
      academicYear: {
        type: 'string',
        isRequired: true,
        position: 2,
        label: 'Năm học',
        description: 'Năm học (ví dụ: 2024-2025)'
      },
      cohortId: {
        type: 'reference',
        reference: 'Cohorts',
        isRequired: true,
        position: 3,
        label: 'Khóa học liên kết',
        description: 'Khóa học mà học kỳ này thuộc về'
      },
      startDate: { 
        type: 'date', 
        position: 3,
        label: 'Ngày bắt đầu',
        description: 'Ngày bắt đầu học kỳ'
      ,
        components: {
          show: Components.DateShowDDMMYYYY,
          edit: Components.DatePickerFlatpickr,
          new: Components.DatePickerFlatpickr
        }
      },
      endDate: { 
        type: 'date', 
        position: 4,
        label: 'Ngày kết thúc',
        description: 'Ngày kết thúc học kỳ'
      ,
        components: {
          show: Components.DateShowDDMMYYYY,
          edit: Components.DatePickerFlatpickr,
          new: Components.DatePickerFlatpickr
        }
      },
      order: { 
        type: 'number', 
        position: 6,
        label: 'Thứ tự học kỳ',
        description: 'Thứ tự học kỳ trong khóa học'
      },
      displayName: {
        isVisible: { list: true, show: true, edit: false, filter: false },
        label: 'Tên hiển thị',
        description: 'Tên hiển thị dạng "Khóa - Học kỳ"'
      }
    },
    
    // Include cohort data để tính displayName
    actions: {
      list: { isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher',
        before: async (request) => {
          request.query = {
            ...request.query,
            include: [{ model: Cohort, as: 'cohort' }]
          };
          return request;
        }
      },
      list: {
        before: async (request) => {
          request.query = {
            ...request.query,
            include: [{ model: Cohort, as: 'cohort' }]
          };
          return request;
        }
      },
      // Custom layouts to show dates side-by-side
      edit: {
        layout: [
          // Hàng 1: Tên học kỳ và Năm học
          [{ flexDirection: 'row', flex: true }, [
            ['name', { flexGrow: 1, marginRight: 'default' }],
            ['academicYear', { flexGrow: 1 }]
          ]],
          // Hàng 2: Khóa học liên kết và Thứ tự
          [{ flexDirection: 'row', flex: true }, [
            ['cohortId', { flexGrow: 1, marginRight: 'default' }],
            ['order', { flexGrow: 1 }]
          ]],
          // Hàng 3: Ngày bắt đầu và Ngày kết thúc (2 cột)
          [{ flexDirection: 'row', flex: true }, [
            ['startDate', { flexGrow: 1, marginRight: 'default' }],
            ['endDate', { flexGrow: 1 }]
          ]]
        ]
      },
      new: {
        layout: [
          // Hàng 1: Tên học kỳ và Năm học
          [{ flexDirection: 'row', flex: true }, [
            ['name', { flexGrow: 1, marginRight: 'default' }],
            ['academicYear', { flexGrow: 1 }]
          ]],
          // Hàng 2: Khóa học liên kết và Thứ tự
          [{ flexDirection: 'row', flex: true }, [
            ['cohortId', { flexGrow: 1, marginRight: 'default' }],
            ['order', { flexGrow: 1 }]
          ]],
          // Hàng 3: Ngày bắt đầu và Ngày kết thúc (2 cột)
          [{ flexDirection: 'row', flex: true }, [
            ['startDate', { flexGrow: 1, marginRight: 'default' }],
            ['endDate', { flexGrow: 1 }]
          ]]
        ]
      },
      show: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher',
        layout: [
          // Hàng 1: Tên học kỳ và Năm học
          [{ flexDirection: 'row', flex: true }, [
            ['name', { flexGrow: 1, marginRight: 'default' }],
            ['academicYear', { flexGrow: 1 }]
          ]],
          // Hàng 2: Khóa học liên kết và Thứ tự
          [{ flexDirection: 'row', flex: true }, [
            ['cohortId', { flexGrow: 1, marginRight: 'default' }],
            ['order', { flexGrow: 1 }]
          ]],
          // Hàng 3: Ngày bắt đầu và Ngày kết thúc (2 cột)
          [{ flexDirection: 'row', flex: true }, [
            ['startDate', { flexGrow: 1, marginRight: 'default' }],
            ['endDate', { flexGrow: 1 }]
          ]]
        ],
        before: async (request) => {
          request.query = {
            ...request.query,
            include: [{ model: Cohort, as: 'cohort' }]
          };
          return request;
        }
      }
      ,
      new: { isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher' },
      edit: { isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher' },
      delete: { isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher' }
    }
  }
};

export default SemesterResource;
