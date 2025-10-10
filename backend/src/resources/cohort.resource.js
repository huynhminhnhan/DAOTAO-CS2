import Cohort from '../backend/database/models/Cohort.js';
import { Components } from '../config/components.js';

const CohortResource = {
  resource: Cohort,
  options: {
    parent: {
      name: 'Cài đặt chung',
      icon: 'Layers'
    },
    listProperties: ['cohortId', 'name', 'startDate', 'endDate'],
    showProperties: ['cohortId', 'name', 'startDate', 'endDate', 'description', 'createdAt', 'updatedAt'],
    editProperties: ['name', 'startDate', 'endDate', 'description'],
    filterProperties: ['name', 'startDate', 'endDate'],
    properties: {
      cohortId: { 
        isVisible: { list: true, show: true, edit: false, filter: false },
        label: 'ID khóa học',
        description: 'Mã định danh khóa học'
      },
      name: { 
        isRequired: true, 
        position: 1,
        label: 'Tên khóa học',
        description: 'Tên của khóa học (VD: K2022, K2023)'
      },
      startDate: { 
        type: 'date', 
        position: 2,
        label: 'Ngày bắt đầu',
        description: 'Ngày bắt đầu khóa học',
        components: {
          show: Components.DateShowDDMMYYYY,
          edit: Components.DatePickerFlatpickr,
          new: Components.DatePickerFlatpickr
        }
      },
      endDate: { 
        type: 'date', 
        position: 3,
        label: 'Ngày kết thúc',
        description: 'Ngày kết thúc khóa học',
        components: {
          show: Components.DateShowDDMMYYYY,
          edit: Components.DatePickerFlatpickr,
          new: Components.DatePickerFlatpickr
        }
      },
      description: { 
        type: 'textarea', 
        position: 4,
        label: 'Mô tả khóa học',
        description: 'Thông tin mô tả chi tiết về khóa học'
      }
      },
      actions: {
        list: { isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher' },
        show: { isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher' },
        new: { isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher' },
        edit: { isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher' },
        delete: { isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher' },
        edit: {
          layout: [
            // Hàng 1: Tên và Mô tả
            [{ flexDirection: 'row', flex: true }, [
              ['name', { flexGrow: 1, marginRight: 'default' }],
              ['description', { flexGrow: 1 }]
            ]],
            // Hàng 2: Ngày bắt đầu và Ngày kết thúc (2 cột)
            [{ flexDirection: 'row', flex: true }, [
              ['startDate', { flexGrow: 1, marginRight: 'default' }],
              ['endDate', { flexGrow: 1 }]
            ]]
          ]
        },
        new: {
          layout: [
            // Hàng 1: Tên và Mô tả
            [{ flexDirection: 'row', flex: true }, [
              ['name', { flexGrow: 1, marginRight: 'default' }],
              ['description', { flexGrow: 1 }]
            ]],
            // Hàng 2: Ngày bắt đầu và Ngày kết thúc (2 cột)
            [{ flexDirection: 'row', flex: true }, [
              ['startDate', { flexGrow: 1, marginRight: 'default' }],
              ['endDate', { flexGrow: 1 }]
            ]]
          ]
        },
        show: {
          layout: [
            // Hàng 1: Tên và Mô tả
            [{ flexDirection: 'row', flex: true }, [
              ['name', { flexGrow: 1, marginRight: 'default' }],
              ['description', { flexGrow: 1 }]
            ]],
            // Hàng 2: Ngày bắt đầu và Ngày kết thúc (2 cột)
            [{ flexDirection: 'row', flex: true }, [
              ['startDate', { flexGrow: 1, marginRight: 'default' }],
              ['endDate', { flexGrow: 1 }]
            ]]
          ]
        }
      }
  }
};

export default CohortResource;
