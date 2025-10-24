import SemesterGradeSummaryService from '../services/SemesterGradeSummaryService.js';

class SemesterGradeSummaryController {
  /**
   * GET /admin-api/grade/semester-summary
   * Lấy bảng điểm tổng kết theo học kỳ
   */
  async getSemesterSummary(req, res) {
    try {
      const { cohortId, classId, semesterIds } = req.query;

      // Validate input
      if (!cohortId || !classId) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn khóa và lớp học'
        });
      }

      if (!semesterIds || (Array.isArray(semesterIds) && semesterIds.length === 0)) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn ít nhất một học kỳ'
        });
      }

      // Convert semesterIds to array if string
      let semesterIdArray = Array.isArray(semesterIds) 
        ? semesterIds.map(id => parseInt(id))
        : [parseInt(semesterIds)];

      const result = await SemesterGradeSummaryService.getSemesterSummary(
        parseInt(cohortId),
        parseInt(classId),
        semesterIdArray
      );

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error in getSemesterSummary controller:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy bảng điểm tổng kết'
      });
    }
  }
}

export default new SemesterGradeSummaryController();
