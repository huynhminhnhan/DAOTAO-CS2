import AdminRepository from '../repositories/admin.repository.js';

const AdminApiService = {
  async getClasses() {
    return AdminRepository.findAllClasses();
  },

  async getClassesByCohort(cohortId) {
    return AdminRepository.findClassesByCohort(cohortId);
  },

  async getTeacherAssignments({ email, userId, session }) {
    let resolvedEmail = email || null;
    let resolvedUserId = userId || null;
    let isAdminSession = false;

    if (!resolvedEmail && !resolvedUserId && session) {
      const candidates = [session.adminUser, session.admin, session.currentAdmin, session.currentAdminUser, session.adminjs, session.user];
      for (const c of candidates) {
        if (!c) continue;
        if (typeof c === 'object') {
          if (c.role && String(c.role).toLowerCase() === 'admin') isAdminSession = true;
          if (c.email) resolvedEmail = resolvedEmail || c.email;
          if (c.id) resolvedUserId = resolvedUserId || c.id;
        }
      }
      if (!resolvedEmail && !resolvedUserId && session.passport && session.passport.user) resolvedUserId = session.passport.user;
    }

    if (!resolvedEmail && resolvedUserId) {
      const u = await AdminRepository.findTeacherByUserId(resolvedUserId);
      if (u) resolvedEmail = u.email;
    }

    if (isAdminSession) return AdminRepository.findAllClasses();

    let teacher = resolvedEmail ? await AdminRepository.findTeacherByEmail(resolvedEmail) : null;
    if (!teacher && resolvedUserId) teacher = await AdminRepository.findTeacherByUserId(resolvedUserId);
    const teacherIdToQuery = teacher ? teacher.id : (resolvedUserId ? Number(resolvedUserId) : null);
    if (!teacherIdToQuery) return [];

    const assignments = await AdminRepository.findAssignmentsByTeacherId(teacherIdToQuery);
    const classIds = assignments.map(a => a.classId);
    if (!classIds.length) return [];
    return AdminRepository.findClassesByIds(classIds);
  },

  async getCohorts() {
    return AdminRepository.findAllCohorts();
  },

  async getSubjects() {
    return AdminRepository.findAllSubjects();
  },

  async getSubjectsByClass(classId) {
    return AdminRepository.findSubjectsByClass(classId);
  },

  async getDashboardStats() {
    const { User, Student, Class, Subject, Grade, Teacher } = await import('../backend/database/index.js');
    const [usersCount, studentsCount, classesCount, subjectsCount, gradesCount, teachersCount] = await Promise.all([
      User.count(), Student.count(), Class.count(), Subject.count(), Grade.count(), Teacher.count()
    ]);
    return { users: usersCount, students: studentsCount, classes: classesCount, subjects: subjectsCount, grades: gradesCount, teachers: teachersCount, updatedAt: new Date() };
  }
};

export default AdminApiService;
