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
      const { semesterId } = req.query;
      const userRole = req.session.adminUser?.role;
      const userId = req.session.adminUser?.id;

      let subjects;

      if (userRole === 'teacher') {
        // Teacher chỉ được xem subjects mà họ có quyền
        const TeacherPermissionService = (await import('../services/TeacherPermissionService.js')).default;
        subjects = await TeacherPermissionService.getPermittedSubjects(userId, classId, semesterId);
      } else {
        // ✅ Admin cũng phải filter theo semester để tránh lộn xộn subjects từ các semester khác
        // Nếu semesterId được chỉ định, chỉ trả về subjects của semester đó
        if (semesterId) {
          subjects = await AdminApiService.getSubjectsByClassAndSemester(classId, semesterId);
        } else {
          // Nếu không có semesterId, trả về tất cả subjects (legacy behavior)
          subjects = await AdminApiService.getSubjectsByClass(classId);
        }
      }

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
      const { TeacherPermission } = await import('../database/index.js');
      
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
  },

  async getStudentsByClass(req, res) {
    try {
      const { classId } = req.params;
      
      if (!classId) {
        return res.status(400).json({ 
          success: false, 
          message: 'classId là bắt buộc' 
        });
      }

      // Import Student model
      const { Student } = await import('../database/index.js');
      
      // Find all students in the class
      const students = await Student.findAll({
        where: { classId: parseInt(classId) },
        order: [['studentCode', 'ASC']],
        raw: true
      });
      
      return res.json({ 
        success: true, 
        students: students,
        total: students.length
      });
    } catch (err) {
      console.error('AdminApiController.getStudentsByClass error:', err);
      return res.status(500).json({ 
        success: false, 
        message: err.message 
      });
    }
  },

  async getCohortById(req, res) {
    try {
      const { cohortId } = req.params;
      
      if (!cohortId) {
        return res.status(400).json({ 
          success: false, 
          message: 'cohortId là bắt buộc' 
        });
      }

      // Import Cohort model
      const { Cohort } = await import('../database/index.js');
      
      // Find cohort by ID
      const cohort = await Cohort.findByPk(cohortId, { raw: true });
      
      if (!cohort) {
        return res.status(404).json({ 
          success: false, 
          message: 'Không tìm thấy khóa học' 
        });
      }
      
      return res.json({ 
        success: true, 
        data: cohort
      });
    } catch (err) {
      console.error('AdminApiController.getCohortById error:', err);
      return res.status(500).json({ 
        success: false, 
        message: err.message 
      });
    }
  },

  async getTeachersByIds(req, res) {
    try {
      const { ids } = req.query;
      
      if (!ids) {
        return res.status(400).json({ 
          success: false, 
          message: 'ids parameter là bắt buộc' 
        });
      }

      // Parse comma-separated IDs
      const teacherIds = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      
      if (teacherIds.length === 0) {
        return res.json({ 
          success: true, 
          teachers: []
        });
      }

      // Import Teacher model
      const { Teacher } = await import('../database/index.js');
      
      // Find teachers by IDs
      const teachers = await Teacher.findAll({
        where: { id: teacherIds },
        raw: true
      });
      
      return res.json({ 
        success: true, 
        teachers: teachers
      });
    } catch (err) {
      console.error('AdminApiController.getTeachersByIds error:', err);
      return res.status(500).json({ 
        success: false, 
        message: err.message 
      });
    }
  }
};

export default AdminApiController;
