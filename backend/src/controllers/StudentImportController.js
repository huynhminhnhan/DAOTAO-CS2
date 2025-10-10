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
      res.json({ success: true, results });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};

export default StudentImportController;
