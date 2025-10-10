import GradeBulkService from '../services/grade.bulk.service.js';

const GradeBulkController = {
  async saveBulk(req, res) {
    try {
      const { grades, cohortId, classId, subjectId } = req.body;
      const session = req.session || {};
      const meta = { ipAddress: req.ip, userAgent: req.get('user-agent') };

      const result = await GradeBulkService.saveBulk({ grades, cohortId, classId, subjectId }, session, meta);

      const response = {
        success: true,
        message: `Đã xử lý ${result.results.length} bản ghi điểm và đăng ký học`,
        results: {
          processed: result.results.length,
          errors: result.errors.length,
          details: result.results,
          errorMessages: result.errors,
          summary: {
            gradesCreated: result.results.filter(r => r.gradeAction === 'created').length,
            gradesUpdated: result.results.filter(r => r.gradeAction === 'updated').length,
            enrollmentsProcessed: result.results.length
          }
        }
      };

      if (result.errors.length > 0) {
        response.message += ` (có ${result.errors.length} lỗi)`;
      }

      res.json(response);
    } catch (error) {
      console.error('❌ Error in GradeBulkController.saveBulk:', error);
      res.status(error.status || 500).json({ success: false, message: error.message || 'Lỗi server khi lưu điểm', error: error.message });
    }
  }
};

export default GradeBulkController;
