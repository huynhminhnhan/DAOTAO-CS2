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
          return request;
        },
        after: async (response, request, context) => {
          const { currentAdmin } = context;
          
          // Nếu là teacher, lọc records dựa trên permissions
          if (currentAdmin?.role === 'teacher') {
            console.log('[SubjectResource] Applying teacher filter in AFTER hook');
            
            const allowedSubjectIds = await getTeacherManagedSubjectIds(currentAdmin.id);
            
            console.log('[SubjectResource] Allowed subject IDs:', allowedSubjectIds);
            console.log('[SubjectResource] Total records before filter:', response.records.length);
            
            // Debug: In ra structure của record đầu tiên
            if (response.records.length > 0) {
              console.log('[SubjectResource] First record keys:', Object.keys(response.records[0]));
            }
            
            // Nếu có quyền với tất cả
            if (allowedSubjectIds === 'all') {
              console.log('[SubjectResource] Teacher has access to ALL subjects');
              return response;
            }
            
            // Nếu không có quyền nào
            if (allowedSubjectIds.length === 0) {
              console.log('[SubjectResource] Teacher has NO permissions');
              response.records = [];
              response.meta.total = 0;
              return response;
            }
            
            // Filter records
            const allowedIdsSet = new Set(allowedSubjectIds);
            const filteredRecords = response.records.filter(record => {
              let subjectId = null;
              
              if (record.params && record.params.id) {
                subjectId = record.params.id;
              } else if (record.id) {
                subjectId = record.id;
              } else if (record._id) {
                subjectId = record._id;
              }
              
              // Convert to number để so sánh
              const subjectIdNum = parseInt(subjectId);
              const isAllowed = allowedIdsSet.has(subjectIdNum);
              
              console.log(`[SubjectResource] Checking record - ID: ${subjectId} (type: ${typeof subjectId}), Num: ${subjectIdNum}, Allowed: ${isAllowed}`);
              
              return isAllowed;
            });
            
            console.log('[SubjectResource] Filtered records:', filteredRecords.length);
            
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
