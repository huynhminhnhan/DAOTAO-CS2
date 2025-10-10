import StudentTranscriptService from '../services/studentTranscript.service.js';

const StudentTranscriptController = {
  async listStudents(req, res) {
    try {
      const data = await StudentTranscriptService.listStudents();
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error in StudentTranscriptController.listStudents:', error);
      res.status(error.status || 500).json({ success: false, message: error.message || 'Lỗi server' });
    }
  },

  async getTranscript(req, res) {
    try {
      const { studentCode } = req.params;
      const data = await StudentTranscriptService.getTranscriptByStudentCode(studentCode);
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error in StudentTranscriptController.getTranscript:', error);
      res.status(error.status || 500).json({ success: false, message: error.message || 'Lỗi server' });
    }
  }
};

export default StudentTranscriptController;
