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
  },

  async deleteTeacherPermission(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID quyền là bắt buộc' 
        });
      }

      // Import TeacherPermission model
      const { TeacherPermission } = await import('../backend/database/index.js');
      
      // Find the permission first
      const permission = await TeacherPermission.findByPk(id);
      
      if (!permission) {
        return res.status(404).json({ 
          success: false, 
          message: 'Không tìm thấy quyền này' 
        });
      }

      // Log who is deleting
      const adminEmail = req.session?.adminUser?.email || 'unknown';
      console.log(`🗑️ Admin ${adminEmail} đang xóa quyền #${id}`);
      
      // Delete the permission
      await permission.destroy();
      
      // Verify it's deleted
      const checkDeleted = await TeacherPermission.findByPk(id);
      if (checkDeleted) {
        console.error(`❌ Quyền #${id} vẫn tồn tại sau khi xóa!`);
        return res.status(500).json({ 
          success: false, 
          message: 'Không thể xóa quyền' 
        });
      }
      
      console.log(`✅ Đã xóa quyền #${id} thành công`);
      
      return res.json({ 
        success: true, 
        message: 'Đã xóa quyền thành công' 
      });
    } catch (err) {
      console.error('AdminApiController.deleteTeacherPermission error:', err);
      return res.status(500).json({ 
        success: false, 
        message: err.message 
      });
    }
  }
};

export default AdminApiController;
