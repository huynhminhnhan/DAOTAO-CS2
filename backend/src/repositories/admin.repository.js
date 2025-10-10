import { Class, Teacher, User, Cohort, Subject } from '../database/index.js';

const AdminRepository = {
  async findAllClasses(options = {}) {
    return Class.findAll({ order: [['classCode', 'ASC']], ...options });
  },

  async findClassesByCohort(cohortId) {
    return Class.findAll({ 
      where: { cohortId },
      order: [['classCode', 'ASC']] 
    });
  },

  async findTeacherByEmail(email) {
    return Teacher.findOne({ where: { email } });
  },

  async findTeacherByUserId(userId) {
    // Attempt to resolve teacher via User -> Teacher relationship if present
    const user = await User.findByPk(userId);
    if (!user) return null;
    return Teacher.findOne({ where: { email: user.email } });
  },

  async findClassesByIds(ids) {
    if (!ids || ids.length === 0) return [];
    return Class.findAll({ where: { id: ids } });
  },

  async findAllCohorts() {
    return Cohort.findAll({ order: [['startDate', 'DESC']] });
  },

  async findAllSubjects() {
    return Subject.findAll({ order: [['subjectCode', 'ASC']] });
  },

  async findSubjectsByClass(classId) {
    const { Enrollment } = await import('../database/index.js');
    
    // Tìm tất cả subjects đã được đăng ký trong lớp này từ bảng Enrollments
    const enrollments = await Enrollment.findAll({
      where: { classId: parseInt(classId) },
      include: [{ 
        model: Subject, 
        as: 'subject',
        attributes: ['id', 'subjectCode', 'subjectName', 'credits', 'description', 'category', 'isRequired'] 
      }],
      attributes: ['subjectId'],
      order: [['subject', 'subjectCode', 'ASC']]
    });
    
    // Loại bỏ duplicate subjects bằng cách filter unique subjectId
    const uniqueSubjects = [];
    const seenSubjectIds = new Set();
    
    enrollments.forEach(enrollment => {
      if (enrollment.subject && !seenSubjectIds.has(enrollment.subjectId)) {
        seenSubjectIds.add(enrollment.subjectId);
        uniqueSubjects.push(enrollment);
      }
    });
    
    return uniqueSubjects;
  }
};

export default AdminRepository;
