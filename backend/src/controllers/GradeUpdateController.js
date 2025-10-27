import { Grade, GradeRetake, Enrollment } from '../database/index.js';
import { Op } from 'sequelize';

/**
 * Controller để xử lý cập nhật điểm cho thi lại và học lại
 */
class GradeUpdateController {
  
  /**
   * Cập nhật điểm thi lại (chỉ cập nhật điểm thi cuối kỳ và TBMH)
   */
  static async updateRetakeExam(req, res) {
    const transaction = await Grade.sequelize.transaction();
    
    try {
      const { 
        gradeId, 
        studentId, 
        subjectId, 
        finalScore, 
        tbmhScore, 
        attemptNumber,
        retakeDate // Ngày thi lại từ frontend
      } = req.body;

      // Validation
      if (!gradeId || !studentId || !subjectId || finalScore === undefined || tbmhScore === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin bắt buộc'
        });
      }

      if (finalScore < 0 || finalScore > 10 || tbmhScore < 0 || tbmhScore > 10) {
        return res.status(400).json({
          success: false,
          message: 'Điểm phải nằm trong khoảng 0-10'
        });
      }

      // Lấy điểm hiện tại
      const currentGrade = await Grade.findByPk(gradeId, { transaction });
      if (!currentGrade) {
        throw new Error('Không tìm thấy bản ghi điểm');
      }

      // Sử dụng enrollmentId từ Grade record hiện tại
      const enrollmentId = currentGrade.enrollmentId;
      if (!enrollmentId) {
        throw new Error('Không tìm thấy enrollmentId trong bản ghi điểm hiện tại');
      }


      // Kiểm tra xem có record RETAKE_COURSE với FAIL_EXAM không
      const failedCourseRetake = await GradeRetake.findOne({
        where: { 
          studentId, 
          subjectId,
          retakeType: 'RETAKE_COURSE',
          resultStatus: 'FAIL_EXAM',
          isCurrent: true
        },
        transaction
      });

      // Nếu có record học lại FAIL_EXAM, tạo record THI LẠI (RETAKE_EXAM) riêng
      if (failedCourseRetake) {
        // Đánh dấu record học lại cũ không còn current
        await failedCourseRetake.update({
          isCurrent: false,
          updatedAt: new Date()
        }, { transaction });

        // Tạo record THI LẠI (RETAKE_EXAM) mới - để phân biệt với học lại
        const newAttemptNumber = Math.max(2, attemptNumber);
        await GradeRetake.create({
          originalGradeId: gradeId,
          studentId,
          subjectId,
          enrollmentId: enrollmentId,
          retakeType: 'RETAKE_EXAM', // ← Đổi thành RETAKE_EXAM để phân biệt
          retakeReason: `Thi lại sau học lại lần ${newAttemptNumber - 1} - Điểm thi cũ: ${failedCourseRetake.finalScore}`,
          attemptNumber: newAttemptNumber,
          // Giữ nguyên TX, DK, TBKT từ lần học lại, chỉ thay điểm thi
          txScore: failedCourseRetake.txScore,
          dkScore: failedCourseRetake.dkScore,
          tbktScore: failedCourseRetake.tbktScore,
          finalScore,
          tbmhScore,
          semester: failedCourseRetake.semester,
          academicYear: failedCourseRetake.academicYear,
          isCurrent: true,
          resultStatus: finalScore < 5 ? 'FAIL_EXAM' : (tbmhScore >= 5 ? 'PASS' : 'FAIL_EXAM'),
          completed_at: retakeDate || new Date().toISOString().split('T')[0] // Lưu dạng YYYY-MM-DD
        }, { transaction });

        // Cập nhật Grade (bảng chính)
        await currentGrade.update({
          finalScore,
          tbmhScore,
          attemptNumber: Math.max(2, attemptNumber),
          updatedAt: new Date()
        }, { transaction });
      } else {
        // Không có FAIL_EXAM từ học lại → xử lý thi lại bình thường
        
        // Kiểm tra xem đã có record retake EXAM nào chưa
        const existingRetakeExam = await GradeRetake.findOne({
          where: { 
            studentId, 
            subjectId,
            retakeType: 'RETAKE_EXAM'
          },
          transaction
        });

        // Nếu chưa có record nào, lưu điểm cũ (điểm gốc) vào GradeRetake
        if (!existingRetakeExam) {
          await GradeRetake.create({
            originalGradeId: gradeId,
            studentId,
            subjectId,
            enrollmentId: enrollmentId,
            retakeType: 'RETAKE_EXAM',
            retakeReason: `[ĐIỂM GỐC] Điểm ban đầu khiến phải thi lại - Điểm thi: ${currentGrade.finalScore}`,
            attemptNumber: 2, // Min validation là 2
            // Điểm cũ (điểm gốc khiến phải thi lại)
            txScore: currentGrade.txScore,
            dkScore: currentGrade.dkScore,
            tbktScore: currentGrade.tbktScore,
            finalScore: currentGrade.finalScore,
            tbmhScore: currentGrade.tbmhScore,
            semester: currentGrade.semester || 'HK1',
            academicYear: currentGrade.academicYear || '2024-25',
            isCurrent: false,
            resultStatus: currentGrade.finalScore < 5 ? 'FAIL_EXAM' : (currentGrade.tbmhScore >= 5 ? 'PASS' : 'FAIL_EXAM')
          }, { transaction });
        }

        // Đánh dấu các retake cũ không còn current
        await GradeRetake.update(
          { isCurrent: false },
          {
            where: {
              studentId,
              subjectId,
              id: { [Grade.sequelize.Sequelize.Op.ne]: newRecord.id }
            },
            transaction
          }
        );

        // Cập nhật điểm mới vào Grade (bảng chính)
        await currentGrade.update({
          finalScore,
          tbmhScore,
          attemptNumber: Math.max(2, attemptNumber),
          updatedAt: new Date()
        }, { transaction });

        // Tạo record mới trong GradeRetake cho lần thi mới
        const newAttemptNumber = Math.max(2, attemptNumber);
        await GradeRetake.create({
          originalGradeId: gradeId,
          studentId,
          subjectId,
          enrollmentId: enrollmentId,
          retakeType: 'RETAKE_EXAM',
          retakeReason: `Thi lại lần ${newAttemptNumber - 1}`,
          attemptNumber: newAttemptNumber, // Min là 2 cho retake
          // Điểm mới (giữ nguyên TX, DK, TBKT)
          txScore: currentGrade.txScore,
          dkScore: currentGrade.dkScore,
          tbktScore: currentGrade.tbktScore,
          finalScore,
          tbmhScore,
          semester: currentGrade.semester || 'HK1',
          academicYear: currentGrade.academicYear || '2024-25',
          isCurrent: true,
          resultStatus: finalScore < 5 ? 'FAIL_EXAM' : (tbmhScore >= 5 ? 'PASS' : 'FAIL_EXAM'),
          completed_at: retakeDate || new Date().toISOString().split('T')[0] // Lưu dạng YYYY-MM-DD
        }, { transaction });
      }

      await transaction.commit();

      res.json({
        success: true,
        message: `Cập nhật điểm thi lại thành công. TBMH mới: ${tbmhScore}`,
        data: {
          gradeId,
          finalScore,
          tbmhScore,
          attemptNumber
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error updating retake exam score:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi cập nhật điểm thi lại'
      });
    }
  }

  /**
   * Cập nhật điểm học lại (cập nhật toàn bộ điểm)
   */
  static async updateRetakeCourse(req, res) {
    const transaction = await Grade.sequelize.transaction();
    
    try {
      const { 
        gradeId, 
        studentId, 
        subjectId, 
        txScore,
        dkScore,
        tbktScore,
        finalScore, 
        tbmhScore, 
        attemptNumber,
        retakeDate // Ngày học lại từ frontend
      } = req.body;

      // Debug: Log retakeDate để kiểm tra
      console.log('🔍 [updateRetakeCourse] retakeDate received:', retakeDate);
      console.log('🔍 [updateRetakeCourse] retakeDate type:', typeof retakeDate);
      if (retakeDate) {
        console.log('🔍 [updateRetakeCourse] retakeDate converted:', new Date(retakeDate));
      }

      // Validation
      if (!gradeId || !studentId || !subjectId || 
          txScore === undefined || dkScore === undefined || 
          tbktScore === undefined || finalScore === undefined || tbmhScore === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin bắt buộc'
        });
      }

      // Validate score ranges
      const scores = [txScore, dkScore, tbktScore, finalScore, tbmhScore];
      if (scores.some(score => score < 0 || score > 10)) {
        return res.status(400).json({
          success: false,
          message: 'Tất cả điểm phải nằm trong khoảng 0-10'
        });
      }

      // Lấy điểm hiện tại
      const currentGrade = await Grade.findByPk(gradeId, { transaction });
      if (!currentGrade) {
        throw new Error('Không tìm thấy bản ghi điểm');
      }

      // Lấy điểm hiện tại cho học lại
      const currentCourseGrade = await Grade.findByPk(gradeId, { transaction });
      if (!currentCourseGrade) {
        throw new Error('Không tìm thấy bản ghi điểm');
      }

      // Sử dụng enrollmentId từ Grade record hiện tại
      const enrollmentId = currentCourseGrade.enrollmentId;
      if (!enrollmentId) {
        throw new Error('Không tìm thấy enrollmentId trong bản ghi điểm hiện tại');
      }

      console.log('Using enrollmentId from Grade:', enrollmentId); // Debug log

      // QUAN TRỌNG: Kiểm tra xem có record RETAKE_COURSE với FAIL_EXAM đang active không
      // Nếu có → đang thi lại sau học lại → nên tạo RETAKE_EXAM thay vì RETAKE_COURSE mới
      const failedCourseRetake = await GradeRetake.findOne({
        where: {
          originalGradeId: gradeId,
          studentId,
          subjectId,
          retakeType: 'RETAKE_COURSE',
          resultStatus: 'FAIL_EXAM',
          isCurrent: true
        },
        transaction
      });

      if (failedCourseRetake) {
        // Trường hợp: đã học lại nhưng điểm thi không đạt → giờ đang thi lại
        // → Nên tạo record RETAKE_EXAM thay vì RETAKE_COURSE
        console.log('Detected failed course retake, creating RETAKE_EXAM record instead');

        // Đánh dấu record RETAKE_COURSE cũ là không còn current
        failedCourseRetake.isCurrent = false;
        await failedCourseRetake.save({ transaction });

        // Cập nhật bảng Grade chính với điểm mới
        await currentCourseGrade.update({
          tbktScore,
          finalScore,
          tbmhScore
        }, { transaction });

        // Xác định resultStatus cho lần thi lại
        let newResultStatus;
        if (tbmhScore >= 5) {
          newResultStatus = 'PASS';
        } else if (tbktScore >= 5 && finalScore < 5) {
          newResultStatus = 'FAIL_EXAM';
        } else {
          newResultStatus = 'FAIL_TBKT';
        }

        // Tạo record RETAKE_EXAM (lần thi lại sau học lại)
        const newAttemptNumber = failedCourseRetake.attemptNumber + 1;
        const retakeExamRecord = await GradeRetake.create({
          originalGradeId: gradeId,
          studentId,
          subjectId,
          enrollmentId: enrollmentId,
          retakeType: 'RETAKE_EXAM',
          retakeReason: `Thi lại sau học lại lần ${newAttemptNumber - 1} (điểm thi không đạt)`,
          attemptNumber: newAttemptNumber,
          // Giữ nguyên TX và DK từ lần học lại
          txScore: failedCourseRetake.txScore,
          dkScore: failedCourseRetake.dkScore,
          // Cập nhật điểm thi mới
          tbktScore,
          finalScore,
          tbmhScore,
          semester: currentCourseGrade.semester || 'HK1',
          academicYear: currentCourseGrade.academicYear || '2024-25',
          isCurrent: true,
          resultStatus: newResultStatus,
          completed_at: retakeDate || new Date().toISOString().split('T')[0] // Lưu dạng YYYY-MM-DD
        }, { transaction });

        await transaction.commit();

        return res.json({
          success: true,
          message: `Cập nhật điểm thi lại sau học lại thành công. TBMH mới: ${tbmhScore}`,
          data: {
            gradeId,
            tbmhScore,
            finalScore,
            tbktScore,
            resultStatus: newResultStatus,
            retakeRecord: retakeExamRecord
          }
        });
      }

      // Logic bình thường cho học lại (chưa có lần học lại nào hoặc đã có nhưng chưa fail exam)
      // Kiểm tra xem đã có record retake nào chưa
      const existingRetake = await GradeRetake.findOne({
        where: { 
          studentId, 
          subjectId,
          retakeType: 'RETAKE_COURSE'
        },
        transaction
      });

      // Nếu chưa có record nào, lưu điểm cũ (điểm gốc) vào GradeRetake
      if (!existingRetake) {
        await GradeRetake.create({
          originalGradeId: gradeId,
          studentId,
          subjectId,
          enrollmentId: enrollmentId,
          retakeType: 'RETAKE_COURSE',
          retakeReason: `[ĐIỂM GỐC] Điểm ban đầu khiến phải học lại - TBKT: ${currentCourseGrade.tbktScore}`,
          attemptNumber: 2, // Min validation là 2
          // Điểm cũ (điểm gốc khiến phải học lại)
          txScore: currentCourseGrade.txScore,
          dkScore: currentCourseGrade.dkScore,
          tbktScore: currentCourseGrade.tbktScore,
          finalScore: currentCourseGrade.finalScore,
          tbmhScore: currentCourseGrade.tbmhScore,
          semester: currentCourseGrade.semester || 'HK1',
          academicYear: currentCourseGrade.academicYear || '2024-25',
          isCurrent: false,
          resultStatus: currentCourseGrade.finalScore < 5 ? 'FAIL_EXAM' : (currentCourseGrade.tbmhScore >= 5 ? 'PASS' : (currentCourseGrade.tbktScore < 5 ? 'FAIL_TBKT' : 'FAIL_EXAM'))
        }, { transaction });
      }

        // Đánh dấu các retake cũ không còn current
        await GradeRetake.update(
          { isCurrent: false },
          {
            where: {
              studentId,
              subjectId,
              id: { [Grade.sequelize.Sequelize.Op.ne]: newRecord.id }
            },
            transaction
          }
        );      // Cập nhật toàn bộ điểm mới vào Grade (bảng chính)
      await currentCourseGrade.update({
        txScore,
        dkScore,
        tbktScore,
        finalScore,
        tbmhScore,
        attemptNumber: Math.max(2, attemptNumber), // Đảm bảo attemptNumber >= 2
        updatedAt: new Date()
      }, { transaction });

      // Xác định resultStatus dựa trên điểm
      let resultStatus;
      
      if (tbmhScore >= 5) {
        resultStatus = 'PASS';
      } else if (tbktScore >= 5 && (finalScore < 5 || tbmhScore < 5)) {
        // TBKT đạt nhưng điểm thi hoặc TBMH < 5 → học lại nhưng vẫn chưa đạt
        resultStatus = 'FAIL_EXAM';
      } else {
        // TBKT không đạt → vẫn cần học lại tiếp
        resultStatus = 'FAIL_TBKT';
      }

      // Tạo record mới trong GradeRetake cho lần học mới
      const newAttemptNumber = Math.max(2, attemptNumber);
      const retakeCourseRecord = await GradeRetake.create({
        originalGradeId: gradeId,
        studentId,
        subjectId,
        enrollmentId: enrollmentId,
        retakeType: 'RETAKE_COURSE',
        retakeReason: `Học lại lần ${newAttemptNumber - 1}`,
        attemptNumber: newAttemptNumber, // Min là 2 cho retake
        // Điểm mới (toàn bộ)
        txScore,
        dkScore,
        tbktScore,
        finalScore,
        tbmhScore,
        semester: currentCourseGrade.semester || 'HK1',
        academicYear: currentCourseGrade.academicYear || '2024-25',
        isCurrent: true, // Luôn là current (không tự động tạo record mới)
        resultStatus,
        completed_at: retakeDate || new Date().toISOString().split('T')[0] // Lưu dạng YYYY-MM-DD
      }, { transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: `Cập nhật điểm học lại thành công. TBMH mới: ${tbmhScore}`,
        data: {
          gradeId,
          txScore,
          dkScore,
          tbktScore,
          finalScore,
          tbmhScore,
          attemptNumber
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error updating retake course score:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi cập nhật điểm học lại'
      });
    }
  }

  /**
   * Lấy lịch sử cập nhật điểm của một sinh viên cho một môn học
   */
  static async getGradeUpdateHistory(req, res) {
    try {
      const { studentId, subjectId } = req.params;

      if (!studentId || !subjectId) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu studentId hoặc subjectId'
        });
      }

      // Lấy điểm hiện tại từ Grade
      const currentGrade = await Grade.findOne({
        where: { studentId, subjectId }
      });

      // Lấy lịch sử từ GradeRetake
      const retakeHistory = await GradeRetake.findAll({
        where: { studentId, subjectId },
        order: [['attemptNumber', 'ASC'], ['createdAt', 'ASC']]
      });

      res.json({
        success: true,
        data: {
          currentGrade,
          retakeHistory,
          totalAttempts: retakeHistory.length > 0 ? Math.max(...retakeHistory.map(r => r.attemptNumber)) : 1
        }
      });

    } catch (error) {
      console.error('Error getting grade update history:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi lấy lịch sử cập nhật điểm'
      });
    }
  }
}

export default GradeUpdateController;