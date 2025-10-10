// StudentImportService.js
import { Student, Class } from '../database/index.js';

const StudentImportService = {
  async getClasses() {
    return await Class.findAll({ order: [['classCode', 'ASC']] });
  },

  async importStudents({ classId, students }) {
    // students: array of { studentCode, fullName, ... }
    if (!classId || !Array.isArray(students)) {
      throw new Error('Thiếu thông tin lớp hoặc danh sách sinh viên');
    }
    // Thêm từng sinh viên vào lớp
    const results = [];
    for (const s of students) {
      try {
        const [student, created] = await Student.findOrCreate({
          where: { studentCode: s.studentCode },
          defaults: { ...s, classId, status: 'active' }
        });
        results.push({ studentCode: s.studentCode, created });
      } catch (err) {
        results.push({ studentCode: s.studentCode, error: err.message });
      }
    }
    return results;
  }
};

export default StudentImportService;
