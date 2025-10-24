// BulkEnrollmentController.js
import BulkEnrollmentService from '../services/BulkEnrollmentService.js';

const BulkEnrollmentController = {
  async getSubjects(req, res) {
    try {
      const subjects = await BulkEnrollmentService.getSubjects();
      res.json({ success: true, data: subjects });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async bulkEnroll(req, res) {
    try {
      const { classId, subjectId, semester, cohortId, semesterId, studentIds } = req.body;
      
      console.log('Controller received:', { classId, subjectId, semester, cohortId, semesterId, studentIds });
      
      const result = await BulkEnrollmentService.bulkEnroll({ 
        classId, 
        subjectId, 
        semester, 
        cohortId, 
        semesterId, 
        studentIds 
      });
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async getStats(req, res) {
    try {
      const { classId, subjectId, semester } = req.params;
      const stats = await BulkEnrollmentService.getStats({ classId, subjectId, semester });
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

export default BulkEnrollmentController;
