/**
 * Subject Resource Configuration
 * Cấu hình resource Subject theo chuẩn AdminJS
 */

import { Subject } from '../backend/database/index.js';
import { Components } from '../config/components.js';
import { getTeacherManagedSubjectIds } from '../middleware/teacherPermissions.js';

const SubjectResource = {
  resource: Subject,
  options: {
    parent: {
      name: 'Quản lý Môn học',
      icon: 'Book'
    },
    actions: {
      list: { 
        isAccessible: true, // Cho phép tất cả xem danh sách
        before: async (request, context) => {
          const { currentAdmin } = context;
          console.log('[SubjectResource] List action - User:', currentAdmin?.email, 'Role:', currentAdmin?.role);
          
          // Nếu là teacher, inject filter theo permissions
          if (currentAdmin?.role === 'teacher') {
            const allowedSubjectIds = await getTeacherManagedSubjectIds(currentAdmin.id);
            
            console.log('[SubjectResource] Teacher allowed subject IDs:', allowedSubjectIds);
            
            // Nếu không có quyền với tất cả môn học, thêm filter id
            if (allowedSubjectIds !== 'all') {
              const currentFilters = request.query?.filters || {};
              
              if (allowedSubjectIds.length === 0) {
                // Không có quyền - filter để không trả về record nào
                request.query = {
                  ...request.query,
                  filters: {
                    ...currentFilters,
                    id: '-999999' // ID không tồn tại
                  }
                };
                console.log('[SubjectResource] Teacher has NO permissions - filtering to empty');
              } else {
                // Có quyền với các môn học cụ thể - inject filter id
                request.query = {
                  ...request.query,
                  filters: {
                    ...currentFilters,
                    id: allowedSubjectIds.join(',') // VD: "12,13,14"
                  }
                };
                console.log('[SubjectResource] Applied id filter:', allowedSubjectIds.join(','));
              }
            } else {
              console.log('[SubjectResource] Teacher has access to ALL subjects');
            }
          }
          
          return request;
        },
        after: async (response, request, context) => {
          const { currentAdmin } = context;
          
          // FALLBACK: Nếu before hook filter không work, dùng after hook
          if (currentAdmin?.role === 'teacher') {
            const allowedSubjectIds = await getTeacherManagedSubjectIds(currentAdmin.id);
            
            console.log('[SubjectResource] After hook - Filtering records');
            console.log('[SubjectResource] Total records before filter:', response.records.length);
            
            if (allowedSubjectIds === 'all') {
              console.log('[SubjectResource] Teacher has access to ALL subjects');
              return response;
            }
            
            if (allowedSubjectIds.length === 0) {
              console.log('[SubjectResource] Teacher has NO permissions');
              response.records = [];
              response.meta.total = 0;
              return response;
            }
            
            // Filter records
            const allowedIdsSet = new Set(allowedSubjectIds);
            const filteredRecords = response.records.filter(record => {
              const subjectId = parseInt(record.params?.id || record.id);
              const isAllowed = allowedIdsSet.has(subjectId);
              
              if (!isAllowed) {
                console.log(`[SubjectResource] Filtering out subject ID ${subjectId}`);
              }
              
              return isAllowed;
            });
            
            console.log('[SubjectResource] Filtered records:', filteredRecords.length);
            console.log('[SubjectResource] Showing subject IDs:', filteredRecords.map(r => r.params?.id || r.id));
            
            response.records = filteredRecords;
            response.meta.total = filteredRecords.length;
          }
          
          return response;
        }
      },
      show: { isAccessible: true }, // Cho phép tất cả xem chi tiết
      new: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin' }, // Chỉ admin tạo mới
      edit: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin' }, // Chỉ admin sửa
      delete: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin' }, // Chỉ admin xóa
      // Custom action: Nhập điểm
      gradeEntry: {
        actionType: 'resource',
        icon: 'Edit',
        label: 'Nhập điểm',
        component: Components.GradeEntryPage,
        isAccessible: ({ currentAdmin }) => {
          // Chỉ admin mới có thể truy cập
          return currentAdmin && currentAdmin.role === 'admin';
        },
        handler: async (request, response, context) => {
          // Chỉ hiển thị component, logic xử lý sẽ được thực hiện trong component
          return {
            record: {}
          };
        }
      }
    },
    listProperties: ['id', 'subjectCode', 'subjectName', 'credits', 'category', 'isRequired'],
    properties: {
      subjectCode: { isTitle: true, isRequired: true },
      subjectName: { isRequired: true },
      credits: { isRequired: true, type: 'number', props: { min: 1, max: 10 } },
      isRequired: { type: 'boolean' }
    }
  }
};

export default SubjectResource;
