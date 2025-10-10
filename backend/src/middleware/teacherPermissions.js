/**
 * Teacher Permissions Middleware
 * Xử lý phân quyền dựa trên bảng teacher_permissions
 */

import { TeacherPermission, Class, Subject, Cohort, Semester, Enrollment } from '../backend/database/index.js';
import { Op } from 'sequelize';

/**
 * Lấy tất cả permissions active của teacher
 * @param {number} userId - ID của user (teacher)
 * @returns {Promise<Array>} Danh sách permissions
 */
export async function getTeacherActivePermissions(userId) {
  const now = new Date();
  
  const permissions = await TeacherPermission.findAll({
    where: {
      userId,
      status: 'active',
      validFrom: { [Op.lte]: now },
      validTo: { [Op.gte]: now }
    },
    include: [
      { model: Class, as: 'Class' },
      { model: Subject, as: 'Subject' },
      { model: Cohort, as: 'Cohort' },
      { model: Semester, as: 'Semester' }
    ]
  });

  return permissions;
}

/**
 * Lấy danh sách Class IDs mà teacher có quyền quản lý
 * @param {number} userId - ID của user (teacher)
 * @returns {Promise<Array<number>>} Danh sách class IDs
 */
export async function getTeacherManagedClassIds(userId) {
  const permissions = await getTeacherActivePermissions(userId);
  
  // Nếu có permission với classId = null, nghĩa là có quyền với TẤT CẢ lớp
  const hasAllClassPermission = permissions.some(p => p.classId === null);
  if (hasAllClassPermission) {
    return 'all'; // Trả về 'all' để biết có quyền tất cả
  }

  // Lọc các classId cụ thể
  const classIds = [...new Set(
    permissions
      .filter(p => p.classId !== null)
      .map(p => p.classId)
  )];

  return classIds;
}

/**
 * Lấy danh sách Subject IDs mà teacher có quyền quản lý
 * @param {number} userId - ID của user (teacher)
 * @returns {Promise<Array<number>>} Danh sách subject IDs
 */
export async function getTeacherManagedSubjectIds(userId) {
  const permissions = await getTeacherActivePermissions(userId);
  
  // Nếu có permission với subjectId = null, nghĩa là có quyền với TẤT CẢ môn
  const hasAllSubjectPermission = permissions.some(p => p.subjectId === null);
  if (hasAllSubjectPermission) {
    return 'all';
  }

  // Lọc các subjectId cụ thể
  const subjectIds = [...new Set(
    permissions
      .filter(p => p.subjectId !== null)
      .map(p => p.subjectId)
  )];

  return subjectIds;
}

/**
 * Lấy danh sách Cohort IDs mà teacher có quyền quản lý
 * @param {number} userId - ID của user (teacher)
 * @returns {Promise<Array<number>>} Danh sách cohort IDs
 */
export async function getTeacherManagedCohortIds(userId) {
  const permissions = await getTeacherActivePermissions(userId);
  
  const hasAllCohortPermission = permissions.some(p => p.cohortId === null);
  if (hasAllCohortPermission) {
    return 'all';
  }

  const cohortIds = [...new Set(
    permissions
      .filter(p => p.cohortId !== null)
      .map(p => p.cohortId)
  )];

  return cohortIds;
}

/**
 * Lấy danh sách Semester IDs mà teacher có quyền quản lý
 * @param {number} userId - ID của user (teacher)
 * @returns {Promise<Array<number>>} Danh sách semester IDs
 */
export async function getTeacherManagedSemesterIds(userId) {
  const permissions = await getTeacherActivePermissions(userId);
  
  const semesterIds = [...new Set(
    permissions.map(p => p.semesterId)
  )];

  return semesterIds;
}

/**
 * Lấy danh sách Student IDs mà teacher có quyền quản lý
 * Lọc dựa trên LỚP HỌC mà teacher được phân quyền
 * @param {number} userId - ID của user (teacher)
 * @returns {Promise<Array<number>|string>} Danh sách student IDs hoặc 'all'
 */
export async function getTeacherManagedStudentIds(userId) {
  try {
    const classIds = await getTeacherManagedClassIds(userId);

    console.log('[getTeacherManagedStudentIds] Teacher managed classIds:', classIds);

    // Nếu có quyền với TẤT CẢ lớp, trả về 'all'
    if (classIds === 'all') {
      console.log('[getTeacherManagedStudentIds] Has permission for ALL students');
      return 'all';
    }

    // Nếu không có quyền lớp nào, trả về empty array
    if (classIds.length === 0) {
      console.log('[getTeacherManagedStudentIds] No class permissions, no students');
      return [];
    }

    // Import Student model
    const { Student } = await import('../backend/database/index.js');

    // Lấy tất cả sinh viên trong các lớp được phân quyền
    const students = await Student.findAll({
      where: {
        classId: { [Op.in]: classIds }
      },
      attributes: ['id'],
      raw: true
    });

    const studentIds = students.map(s => s.id);
    
    console.log('[getTeacherManagedStudentIds] Found students:', studentIds.length);
    console.log('[getTeacherManagedStudentIds] First 10 IDs:', studentIds.slice(0, 10));
    
    return studentIds;
  } catch (error) {
    console.error('[getTeacherManagedStudentIds] Error:', error);
    return []; // Trả về empty array nếu có lỗi
  }
}

/**
 * Kiểm tra xem teacher có quyền truy cập một resource cụ thể không
 * @param {number} userId - ID của user (teacher)
 * @param {Object} resource - Resource cần kiểm tra {classId?, subjectId?, cohortId?, semesterId?}
 * @returns {Promise<boolean>} true nếu có quyền
 */
export async function hasTeacherPermission(userId, resource) {
  const permissions = await getTeacherActivePermissions(userId);
  
  if (permissions.length === 0) return false;

  // Kiểm tra từng permission
  for (const perm of permissions) {
    let hasPermission = true;

    // Kiểm tra classId
    if (resource.classId !== undefined) {
      if (perm.classId !== null && perm.classId !== resource.classId) {
        hasPermission = false;
      }
    }

    // Kiểm tra subjectId
    if (resource.subjectId !== undefined) {
      if (perm.subjectId !== null && perm.subjectId !== resource.subjectId) {
        hasPermission = false;
      }
    }

    // Kiểm tra cohortId
    if (resource.cohortId !== undefined) {
      if (perm.cohortId !== null && perm.cohortId !== resource.cohortId) {
        hasPermission = false;
      }
    }

    // Kiểm tra semesterId (bắt buộc)
    if (resource.semesterId !== undefined) {
      if (perm.semesterId !== resource.semesterId) {
        hasPermission = false;
      }
    }

    if (hasPermission) return true;
  }

  return false;
}

/**
 * Tạo filter cho AdminJS query dựa trên permissions
 * @param {number} userId - ID của user (teacher)
 * @param {string} resourceType - Loại resource: 'class', 'subject', 'student', 'cohort'
 * @returns {Promise<Object|null>} Filter object cho AdminJS hoặc null nếu có quyền tất cả
 */
export async function getTeacherWhereClause(userId, resourceType) {
  console.log(`[TeacherPermissions] Getting where clause for userId=${userId}, resourceType=${resourceType}`);
  
  let ids = [];
  let fieldName = 'id';

  switch (resourceType) {
    case 'class':
      ids = await getTeacherManagedClassIds(userId);
      fieldName = 'id';
      break;

    case 'subject':
      ids = await getTeacherManagedSubjectIds(userId);
      fieldName = 'id';
      break;

    case 'student':
      ids = await getTeacherManagedStudentIds(userId);
      fieldName = 'id'; // Student model sử dụng 'id' không phải 'studentId'
      break;

    case 'cohort':
      ids = await getTeacherManagedCohortIds(userId);
      fieldName = 'cohort_id';
      break;

    default:
      console.log(`[TeacherPermissions] Unknown resource type: ${resourceType}`);
      return null;
  }

  console.log(`[TeacherPermissions] Result IDs:`, ids);

  // Nếu có quyền tất cả, không cần filter
  if (ids === 'all') {
    console.log(`[TeacherPermissions] Has permission for ALL ${resourceType}s`);
    return null;
  }

  // Nếu không có quyền nào, trả về empty array (sẽ filter tất cả)
  if (ids.length === 0) {
    console.log(`[TeacherPermissions] NO permissions found for ${resourceType}`);
    return [];
  }

  // Trả về danh sách IDs để filter
  console.log(`[TeacherPermissions] Filtering by IDs:`, ids);
  return ids;
}

export default {
  getTeacherActivePermissions,
  getTeacherManagedClassIds,
  getTeacherManagedSubjectIds,
  getTeacherManagedCohortIds,
  getTeacherManagedSemesterIds,
  getTeacherManagedStudentIds,
  hasTeacherPermission,
  getTeacherWhereClause
};
