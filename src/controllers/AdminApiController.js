import AdminApiService from '../services/admin.api.service.js';

const AdminApiController = {
  async getClasses(req, res) {
    try {
      const classes = await AdminApiService.getClasses();
      return res.json({ success: true, data: classes });
    } catch (err) {
      console.error('AdminApiController.getClasses error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async getClassesByCohort(req, res) {
    try {
      const { cohortId } = req.params;
      const classes = await AdminApiService.getClassesByCohort(cohortId);
      return res.json({ success: true, data: classes });
    } catch (err) {
      console.error('AdminApiController.getClassesByCohort error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async getTeacherAssignments(req, res) {
    try {
      const classes = await AdminApiService.getTeacherAssignments({ email: req.query.email, userId: req.query.userId, session: req.session });
      return res.json({ success: true, data: classes });
    } catch (err) {
      console.error('AdminApiController.getTeacherAssignments error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async getCohorts(req, res) {
    try {
      const cohorts = await AdminApiService.getCohorts();
      return res.json({ success: true, data: cohorts });
    } catch (err) {
      console.error('AdminApiController.getCohorts error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async getSubjects(req, res) {
    try {
      const subjects = await AdminApiService.getSubjects();
      return res.json({ success: true, data: subjects });
    } catch (err) {
      console.error('AdminApiController.getSubjects error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async getSubjectsByClass(req, res) {
    try {
      const { classId } = req.params;
      const subjects = await AdminApiService.getSubjectsByClass(classId);
      return res.json({ success: true, data: subjects });
    } catch (err) {
      console.error('AdminApiController.getSubjectsByClass error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async getDashboardStats(req, res) {
    try {
      const data = await AdminApiService.getDashboardStats();
      return res.json({ success: true, data });
    } catch (err) {
      console.error('AdminApiController.getDashboardStats error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async createTeacherPermission(req, res) {
    try {
      const permissionData = req.body;
      
      // Validate required fields
      if (!permissionData.userId || !permissionData.semesterId) {
        return res.status(400).json({ 
          success: false, 
          message: 'userId và semesterId là bắt buộc' 
        });
      }

      // Import TeacherPermissionService
      const { default: TeacherPermissionService } = await import('../services/TeacherPermissionService.js');
      
      const permission = await TeacherPermissionService.createPermission(permissionData);
      
      return res.json({ 
        success: true, 
        data: permission,
        message: 'Tạo quyền thành công'
      });
    } catch (err) {
      console.error('AdminApiController.createTeacherPermission error:', err);
      return res.status(500).json({ 
        success: false, 
        message: err.message 
      });
    }
  }
};

export default AdminApiController;
