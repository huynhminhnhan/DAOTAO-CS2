// StudentImportController.js
import StudentImportService from '../services/StudentImportService.js';

const StudentImportController = {
  async getClasses(req, res) {
    try {
      const classes = await StudentImportService.getClasses();
      res.json({ success: true, data: classes });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async importStudents(req, res) {
    try {
      const { classId, students } = req.body;
      const results = await StudentImportService.importStudents({ classId, students });
      
      // Đếm số lượng thành công và thất bại
      const successCount = results.filter(r => r.created === true || r.created === false).length;
      const errorCount = results.filter(r => r.error).length;
      
      // Lấy danh sách lỗi để hiển thị
      const errors = results
        .filter(r => r.error)
        .map(r => `${r.studentCode} - ${r.fullName || 'N/A'}: ${r.error}`)
        .slice(0, 10); // Chỉ lấy 10 lỗi đầu tiên để hiển thị
      
      const message = errorCount > 0 
        ? `✅ Import thành công ${successCount} sinh viên, ${errorCount} lỗi`
        : `✅ Import thành công ${successCount} sinh viên`;
      
      res.json({ 
        success: true, 
        message,
        results,
        details: {
          total: results.length,
          totalProcessed: results.length,
          successCount,
          errorCount,
          errors: errors.length > 0 ? errors : undefined
        }
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};

export default StudentImportController;
