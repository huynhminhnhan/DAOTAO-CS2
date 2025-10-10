import GradeApiService from '../services/grade.api.service.js';

const GradeApiController = {
  async getEnrolledStudents(req, res) {
    try {
      const data = await GradeApiService.getEnrolledStudents(req.query);
      return res.json({ success: true, message: `Tìm thấy ${data.length} sinh viên đã đăng ký môn học`, data, summary: { totalEnrolled: data.length, withGrades: data.filter(s => s.hasExistingGrade).length, withoutGrades: data.filter(s => !s.hasExistingGrade).length } });
    } catch (error) {
      console.error('GradeApiController.getEnrolledStudents error:', error);
      return res.status(error.status || 500).json({ success: false, message: error.message || 'Lỗi server khi tải danh sách sinh viên đã đăng ký', error: error.message });
    }
  },

  async getStudentsByClass(req, res) {
    try {
      const { classId } = req.params;
      const students = await GradeApiService.getStudentsByClass(classId);
      return res.json({ success: true, students, total: students.length });
    } catch (error) {
      console.error('GradeApiController.getStudentsByClass error:', error);
      return res.status(error.status || 500).json({ success: false, error: error.message || 'Không thể lấy danh sách sinh viên', details: error.message });
    }
  },

  async getClassGrades(req, res) {
    try {
      const { classId } = req.params;
      const { semester = 'HK1', year = '2024-25' } = req.query;
      const data = await GradeApiService.getClassGrades(classId, { semester, academicYear: year });
      return res.json({ class: data.class, semester, academicYear: year, students: data.students, subjects: data.subjects });
    } catch (error) {
      console.error('GradeApiController.getClassGrades error:', error);
      return res.status(error.status || 500).json({ error: error.message || 'Lỗi tải dữ liệu điểm' });
    }
  },

  async getTeacherClasses(req, res) {
    try {
      const { userPermissions } = req; // passed from middleware
      const classes = await GradeApiService.getTeacherClasses(userPermissions.teacherId);
      return res.json({ classes });
    } catch (error) {
      console.error('GradeApiController.getTeacherClasses error:', error);
      return res.status(error.status || 500).json({ error: error.message || 'Lỗi tải danh sách lớp' });
    }
  }
};

export default GradeApiController;
