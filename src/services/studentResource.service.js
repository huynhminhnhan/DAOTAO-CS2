import { Teacher, TeacherClassAssignment } from '../backend/database/index.js';

const StudentResourceService = {
  async getTeacherClassIdsByAdmin(currentAdmin) {
    if (!currentAdmin || currentAdmin.role !== 'teacher') return null;
    try {
      const teacher = await Teacher.findOne({ where: { email: currentAdmin.email } });
      if (!teacher) return null;
      const assignments = await TeacherClassAssignment.findAll({ where: { teacherId: teacher.id } });
      return assignments.map(a => a.classId);
    } catch (err) {
      console.warn('StudentResourceService.getTeacherClassIdsByAdmin error:', err && err.message);
      return null;
    }
  },

  async applyTeacherScopeToRequest(request, context) {
    const { currentAdmin } = context || {};
    if (!currentAdmin || currentAdmin.role !== 'teacher') return request;
    const classIds = await this.getTeacherClassIdsByAdmin(currentAdmin);
    if (classIds && classIds.length > 0) {
      request.query = { ...request.query, 'filters.classId': classIds };
    }
    return request;
  }
};

export default StudentResourceService;
