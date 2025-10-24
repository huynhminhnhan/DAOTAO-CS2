/**
 * Grade Controller - MVC Pattern
 * Xử lý các request liên quan đến điểm số
 */

const GradeService = require('../services/GradeService');

class GradeController {
  /**
   * GET /api/grades
   * Lấy danh sách điểm với pagination và filter
   */
  static async getGrades(req, res, next) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        studentId, 
        subjectId, 
        classId, 
        semester, 
        academicYear 
      } = req.query;

      // Build filter conditions
      const filters = {};
      if (studentId) filters.studentId = studentId;
      if (subjectId) filters.subjectId = subjectId;
      if (classId) filters.classId = classId;
      if (semester) filters.semester = semester;
      if (academicYear) filters.academicYear = academicYear;

      // Role-based filtering
      if (req.user.role === 'student') {
        // Students can only see their own grades
        filters.studentId = req.user.studentProfile?.id;
      }

      const offset = (page - 1) * limit;
      const { Grade, Student, Subject, Class } = require('../../database');

      const { count, rows } = await Grade.findAndCountAll({
        where: filters,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          { model: Student, as: 'student' },
          { model: Subject, as: 'subject' },
          { model: Class, as: 'class' }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          grades: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/grades/:id
   * Lấy chi tiết một điểm
   */
  static async getGradeById(req, res, next) {
    try {
      const { id } = req.params;
      const { Grade, Student, Subject, Class } = require('../../database');

      const grade = await Grade.findByPk(id, {
        include: [
          { model: Student, as: 'student' },
          { model: Subject, as: 'subject' },
          { model: Class, as: 'class' }
        ]
      });

      if (!grade) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy điểm'
        });
      }

      // Role-based access control
      if (req.user.role === 'student' && grade.student.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền xem điểm này'
        });
      }

      res.json({
        success: true,
        data: grade
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/grades
   * Tạo điểm mới (admin, teacher)
   */
  static async createGrade(req, res, next) {
    try {
      // Check permission
      if (!['admin', 'teacher'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền tạo điểm'
        });
      }

      const gradeData = req.body;
      const userId = req.user.id;

  const meta = { ipAddress: req.ip, userAgent: req.get('user-agent'), reason: req.body.reason || null };
  const result = await GradeService.createGrade(gradeData, userId, meta);

      res.status(201).json({
        success: true,
        message: 'Tạo điểm thành công',
        data: result
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/grades/:id
   * Cập nhật điểm (admin, teacher)
   */
  static async updateGrade(req, res, next) {
    try {
      // Check permission
      if (!['admin', 'teacher'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền cập nhật điểm'
        });
      }

      const { id } = req.params;
      const updateData = req.body;
      console.log('Update data received:', updateData); // Debug log
      console.log(req);
      const userId = req.user.id;

  const meta = { ipAddress: req.ip, userAgent: req.get('user-agent'), reason: req.body.reason || null };
  const result = await GradeService.updateGrade(id, updateData, userId, meta);

      res.json({
        success: true,
        message: 'Cập nhật điểm thành công',
        data: result
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/grades/:id
   * Xóa điểm (chỉ admin)
   */
  static async deleteGrade(req, res, next) {
    try {
      // Check permission
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền xóa điểm'
        });
      }

      const { id } = req.params;
      const { Grade } = require('../../database');

      const grade = await Grade.findByPk(id);
      if (!grade) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy điểm'
        });
      }

      await grade.destroy();

      res.json({
        success: true,
        message: 'Xóa điểm thành công'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/grades/student/:studentId/report
   * Báo cáo điểm của sinh viên
   */
  static async getStudentGradeReport(req, res, next) {
    try {
      const { studentId } = req.params;

      // Role-based access control
      if (req.user.role === 'student') {
        const { Student } = require('../../database');
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student || student.id !== parseInt(studentId)) {
          return res.status(403).json({
            success: false,
            message: 'Không có quyền xem báo cáo này'
          });
        }
      }

      const report = await GradeService.getStudentGradeReport(studentId);

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/grades/subject/:subjectId/statistics
   * Thống kê điểm của môn học
   */
  static async getSubjectGradeStatistics(req, res, next) {
    try {
      // Check permission
      if (!['admin', 'teacher'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền xem thống kê'
        });
      }

      const { subjectId } = req.params;
      const statistics = await GradeService.getSubjectGradeStatistics(subjectId);

      res.json({
        success: true,
        data: statistics
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/grades/:id/recalculate
   * Tính lại điểm (admin, teacher)
   */
  static async recalculateGrade(req, res, next) {
    try {
      // Check permission
      if (!['admin', 'teacher'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền tính lại điểm'
        });
      }

      const { id } = req.params;
      const { Grade } = require('../../database');

      const grade = await Grade.findByPk(id);
      if (!grade) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy điểm'
        });
      }

      // Recalculate using service
      const calculatedGrades = GradeService.calculateGrades(
        grade.txScore,
        grade.dkScore,
        grade.finalScore
      );

      await grade.update(calculatedGrades);

      // Create history
      await GradeService.createGradeHistory(
        grade.id,
        req.user.id,
        'recalculate',
        null,
        null,
        null,
        { ipAddress: req.ip, userAgent: req.get('user-agent'), reason: 'Recalculate requested via API' }
      );

      res.json({
        success: true,
        message: 'Tính lại điểm thành công',
        data: await Grade.findByPk(id, {
          include: [
            { model: require('../../database').Student, as: 'student' },
            { model: require('../../database').Subject, as: 'subject' },
            { model: require('../../database').Class, as: 'class' }
          ]
        })
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = GradeController;
