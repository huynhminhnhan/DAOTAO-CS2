/**
 * RetakeController - Controller xử lý API cho thi lại và học lại
 */

import RetakeManagementService from '../services/RetakeManagementService.js';
import { Grade, GradeRetake, Student, Subject, Enrollment } from '../database/index.js';

const RetakeController = {
  
  /**
   * GET /api/retake/analyze/:gradeId
   * Phân tích trạng thái điểm và gợi ý hành động
   */
  async analyzeGrade(req, res) {
    try {
      const { gradeId } = req.params;
      
      const grade = await Grade.findByPk(gradeId, {
        include: [
          { model: Student, as: 'student' },
          { 
            model: Enrollment, 
            as: 'enrollment',
            include: [{ model: Subject, as: 'subject' }]
          }
        ]
      });
      
      if (!grade) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bản ghi điểm'
        });
      }
      
      const analysis = await RetakeManagementService.analyzeGradeStatus({
        tbktScore: grade.tbktScore,
        finalScore: grade.finalScore,
        tbmhScore: grade.tbmhScore,
        attemptNumber: grade.attemptNumber
      });
      
      res.json({
        success: true,
        data: {
          grade,
          analysis,
          student: grade.student,
          subject: grade.enrollment.subject
        }
      });
      
    } catch (error) {
      console.error('Error analyzing grade:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi phân tích điểm: ' + error.message
      });
    }
  },

  /**
   * POST /api/retake/create-course
   * Tạo đăng ký học lại (RETAKE_COURSE)
   */
  async createRetakeCourse(req, res) {
    try {
      const { 
        originalGradeId, 
        studentId, 
        subjectId, 
        reason, 
        semester, 
        academicYear 
      } = req.body;
      
      if (!originalGradeId || !studentId || !subjectId) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin bắt buộc: originalGradeId, studentId, subjectId'
        });
      }
      
      const result = await RetakeManagementService.createRetakeCourse(
        originalGradeId,
        studentId,
        subjectId,
        reason || 'TBKT < 5',
        semester || 'HK1',
        academicYear || '2024-25'
      );
      
      res.json({
        success: true,
        data: result,
        message: 'Đã tạo đăng ký học lại thành công'
      });
      
    } catch (error) {
      console.error('Error creating retake course:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi tạo đăng ký học lại: ' + error.message
      });
    }
  },

  /**
   * POST /api/retake/create-exam
   * Tạo đăng ký thi lại (RETAKE_EXAM)
   */
  async createRetakeExam(req, res) {
    try {
      const { 
        originalGradeId, 
        studentId, 
        subjectId, 
        reason, 
        semester, 
        academicYear 
      } = req.body;
      
      if (!originalGradeId || !studentId || !subjectId) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin bắt buộc: originalGradeId, studentId, subjectId'
        });
      }
      
      const result = await RetakeManagementService.createRetakeExam(
        originalGradeId,
        studentId,
        subjectId,
        reason || 'Điểm thi < 5',
        semester || 'HK1',
        academicYear || '2024-25'
      );
      
      res.json({
        success: true,
        data: result,
        message: 'Đã tạo đăng ký thi lại thành công'
      });
      
    } catch (error) {
      console.error('Error creating retake exam:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi tạo đăng ký thi lại: ' + error.message
      });
    }
  },

  /**
   * GET /api/retake/history/:studentId/:subjectId
   * Lấy lịch sử thi lại/học lại của sinh viên
   */
  async getRetakeHistory(req, res) {
    try {
      const { studentId, subjectId } = req.params;
      
      const history = await RetakeManagementService.getRetakeHistory(
        parseInt(studentId),
        parseInt(subjectId)
      );
      
      res.json({
        success: true,
        data: history
      });
      
    } catch (error) {
      console.error('Error getting retake history:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi lấy lịch sử thi lại: ' + error.message
      });
    }
  },

  /**
   * PUT /api/retake/update-result/:retakeId
   * Cập nhật kết quả thi lại/học lại
   */
  async updateRetakeResult(req, res) {
    try {
      const { retakeId } = req.params;
      const scoreData = req.body;
      
      const result = await RetakeManagementService.updateRetakeResult(
        parseInt(retakeId),
        scoreData
      );
      
      res.json({
        success: true,
        data: result,
        message: 'Đã cập nhật kết quả thi lại thành công'
      });
      
    } catch (error) {
      console.error('Error updating retake result:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi cập nhật kết quả thi lại: ' + error.message
      });
    }
  },

  /**
   * GET /api/retake/students-need-retake/:classId/:subjectId
   * Lấy danh sách sinh viên cần thi lại/học lại
   */
  async getStudentsNeedingRetake(req, res) {
    try {
      const { classId, subjectId } = req.params;
      
      const students = await RetakeManagementService.getStudentsNeedingRetake(
        parseInt(classId),
        parseInt(subjectId)
      );
      
      res.json({
        success: true,
        data: students,
        summary: {
          total: students.length,
          needRetakeCourse: students.filter(s => s.analysis.actionType === 'RETAKE_COURSE').length,
          needRetakeExam: students.filter(s => s.analysis.actionType === 'RETAKE_EXAM').length,
          hasActiveRetake: students.filter(s => s.hasActiveRetake).length
        }
      });
      
    } catch (error) {
      console.error('Error getting students needing retake:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi lấy danh sách sinh viên cần thi lại: ' + error.message
      });
    }
  },

  /**
   * GET /api/retake/stats
   * Thống kê thi lại/học lại tổng quan
   */
  async getRetakeStats(req, res) {
    try {
      // Thống kê từ GradeRetake
      const retakeStats = await GradeRetake.getRetakeStats();
      
      // Thống kê grades cần xử lý
      const gradesNeedAction = await Grade.findAll({
        where: {
          [Grade.sequelize.Sequelize.Op.or]: [
            { tbktScore: { [Grade.sequelize.Sequelize.Op.lt]: 5 } },
            { finalScore: { [Grade.sequelize.Sequelize.Op.lt]: 5 } },
            { tbmhScore: { [Grade.sequelize.Sequelize.Op.lt]: 5 } }
          ]
        },
        include: [
          { model: Student, as: 'student' },
          { 
            model: Enrollment, 
            as: 'enrollment',
            include: [{ model: Subject, as: 'subject' }]
          }
        ]
      });
      
      res.json({
        success: true,
        data: {
          retakeStats,
          gradesNeedAction: gradesNeedAction.length,
          details: gradesNeedAction.map(grade => ({
            gradeId: grade.id,
            student: grade.student,
            subject: grade.enrollment.subject,
            tbktScore: grade.tbktScore,
            finalScore: grade.finalScore,
            tbmhScore: grade.tbmhScore
          }))
        }
      });
      
    } catch (error) {
      console.error('Error getting retake stats:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi lấy thống kê thi lại: ' + error.message
      });
    }
  },

  /**
   * POST /api/retake/bulk-create
   * Tạo hàng loạt đăng ký thi lại/học lại cho nhiều sinh viên
   */
  async bulkCreateRetake(req, res) {
    try {
      const { gradeIds, retakeType, reason, semester, academicYear } = req.body;
      
      if (!gradeIds || !Array.isArray(gradeIds) || gradeIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu danh sách gradeIds'
        });
      }
      
      const results = [];
      const errors = [];
      
      for (const gradeId of gradeIds) {
        try {
          const grade = await Grade.findByPk(gradeId, {
            include: [{ model: Enrollment, as: 'enrollment' }]
          });
          
          if (!grade) {
            errors.push(`Grade ID ${gradeId}: Không tìm thấy`);
            continue;
          }
          
          let result;
          if (retakeType === 'RETAKE_COURSE') {
            result = await RetakeManagementService.createRetakeCourse(
              gradeId,
              grade.studentId,
              grade.enrollment.subjectId,
              reason,
              semester,
              academicYear
            );
          } else if (retakeType === 'RETAKE_EXAM') {
            result = await RetakeManagementService.createRetakeExam(
              gradeId,
              grade.studentId,
              grade.enrollment.subjectId,
              reason,
              semester,
              academicYear
            );
          } else {
            errors.push(`Grade ID ${gradeId}: Loại thi lại không hợp lệ`);
            continue;
          }
          
          results.push({
            gradeId,
            studentId: grade.studentId,
            result
          });
          
        } catch (error) {
          errors.push(`Grade ID ${gradeId}: ${error.message}`);
        }
      }
      
      res.json({
        success: true,
        data: {
          successful: results.length,
          failed: errors.length,
          results,
          errors
        },
        message: `Đã tạo ${results.length} đăng ký thi lại/học lại, ${errors.length} lỗi`
      });
      
    } catch (error) {
      console.error('Error bulk creating retakes:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi tạo hàng loạt đăng ký thi lại: ' + error.message
      });
    }
  }
};

export default RetakeController;