import AcademicService from '../services/academic.service.js';

const AcademicController = {
  async listCohorts(req, res) {
    try {
      const cohorts = await AcademicService.listCohorts();
      return res.json({ success: true, data: cohorts, message: 'Lấy danh sách khóa học thành công' });
    } catch (error) {
      console.error('AcademicController.listCohorts error:', error);
      return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách khóa học', error: error.message });
    }
  },

  async listSemesters(req, res) {
    try {
      const semesters = await AcademicService.listSemesters();
      return res.json({ success: true, data: semesters, message: 'Lấy danh sách học kỳ thành công' });
    } catch (error) {
      console.error('AcademicController.listSemesters error:', error);
      return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách học kỳ', error: error.message });
    }
  },

  async listSemestersByCohort(req, res) {
    try {
      const { cohortId } = req.params;
      const semesters = await AcademicService.listSemestersByCohort(cohortId);
      return res.json({ success: true, data: semesters, message: `Lấy danh sách học kỳ khóa ${cohortId} thành công` });
    } catch (error) {
      console.error('AcademicController.listSemestersByCohort error:', error);
      return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách học kỳ theo khóa', error: error.message });
    }
  }
};

export default AcademicController;
