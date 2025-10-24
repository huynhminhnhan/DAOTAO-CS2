import { Op } from 'sequelize';
import Student from '../database/models/Student.js';
import Grade from '../database/models/Grade.js';
import GradeRetake from '../database/models/GradeRetake.js';
import Enrollment from '../database/models/Enrollment.js';
import Subject from '../database/models/Subject.js';
import Semester from '../database/models/Semester.js';
import ClassModel from '../database/models/Class.js';

class SemesterGradeSummaryService {
  /**
   * Lấy điểm tổng kết theo học kỳ
   * @param {number} cohortId - ID khóa học
   * @param {number} classId - ID lớp
   * @param {number[]} semesterIds - Danh sách ID học kỳ
   * @returns {Promise<Object>} Dữ liệu bảng điểm tổng kết
   */
  async getSemesterSummary(cohortId, classId, semesterIds) {
    try {
      // 1. Lấy thông tin lớp và khóa
      // Find the class and ensure it belongs to the requested cohort
      const classInfo = await ClassModel.findOne({
        where: { id: classId, cohortId },
        include: [{
          model: Student,
          as: 'students',
          required: true,
          attributes: ['id', 'studentCode', 'fullName', 'dateOfBirth', 'gender']
        }]
      });

      if (!classInfo) {
        throw new Error('Không tìm thấy lớp học');
      }

      // 2. Lấy thông tin các học kỳ
      const semesters = await Semester.findAll({
        where: { semesterId: { [Op.in]: semesterIds } },
        order: [['order', 'ASC']]
      });

      // 3. Lấy tất cả enrollment của sinh viên trong lớp
      const studentIds = classInfo.students.map(s => s.id);
      const enrollments = await Enrollment.findAll({
        where: {
          studentId: { [Op.in]: studentIds },
          semesterId: { [Op.in]: semesterIds }
        },
        include: [{
          model: Subject,
          as: 'subject',
          attributes: ['id', 'subjectCode', 'subjectName', 'credits']
        }]
      });

      // 4. Lấy tất cả điểm của sinh viên
      const grades = await Grade.findAll({
        where: {
          studentId: { [Op.in]: studentIds },
          enrollmentId: { [Op.in]: enrollments.map(e => e.enrollmentId) }
        },
        include: [{
          model: Enrollment,
          as: 'enrollment',
          include: [{
            model: Subject,
            as: 'subject'
          }, {
            model: Semester,
            as: 'semesterInfo'
          }]
        }]
      });

      // 5. Lấy tất cả thông tin thi lại/học lại
      const gradeRetakes = await GradeRetake.findAll({
        where: {
          studentId: { [Op.in]: studentIds }
        },
        include: [{
          model: Subject,
          as: 'subject'
        }],
        order: [['attemptNumber', 'ASC']]
      });

      // 6. Xử lý dữ liệu
      const studentsData = await Promise.all(classInfo.students.map(async (student) => {
        const studentEnrollments = enrollments.filter(e => e.studentId === student.id);
        const studentGrades = grades.filter(g => g.studentId === student.id);
        const studentRetakes = gradeRetakes.filter(r => r.studentId === student.id);

        // Group grades by semester
        const gradesBySemester = {};
        semesters.forEach(sem => {
          gradesBySemester[sem.semesterId] = {};
        });

        // Populate grades
        studentGrades.forEach(grade => {
          const enrollment = grade.enrollment;
          if (enrollment && enrollment.semesterId) {
            const semesterId = enrollment.semesterId;
            const subjectId = enrollment.subjectId;
            
            if (gradesBySemester[semesterId]) {
              gradesBySemester[semesterId][subjectId] = {
                subjectCode: enrollment.subject.subjectCode,
                subjectName: enrollment.subject.subjectName,
                credits: enrollment.subject.credits,
                tbmhScore: grade.tbmhScore,
                gradeId: grade.id
              };
            }
          }
        });

        // Process retakes
        const retakeInfo = {};
        studentRetakes.forEach(retake => {
          const key = `${retake.subjectId}`;
          if (!retakeInfo[key]) {
            retakeInfo[key] = [];
          }
          
          retakeInfo[key].push({
            retakeType: retake.retakeType,
            attemptNumber: retake.attemptNumber,
            semester: retake.semester,
            academicYear: retake.academicYear,
            tbmhScore: retake.tbmhScore,
            resultStatus: retake.resultStatus,
            completedAt: retake.completed_at
          });
        });

        // Calculate ĐTBC for each semester
        const dtbcBySemester = {};
        semesters.forEach(sem => {
          const semesterGrades = gradesBySemester[sem.semesterId];
          let totalWeightedScore = 0;
          let totalCredits = 0;

          Object.values(semesterGrades).forEach(grade => {
            if (grade.tbmhScore && grade.credits) {
              totalWeightedScore += parseFloat(grade.tbmhScore) * parseFloat(grade.credits);
              totalCredits += parseFloat(grade.credits);
            }
          });

          dtbcBySemester[sem.semesterId] = totalCredits > 0 
            ? (totalWeightedScore / totalCredits).toFixed(2) 
            : null;
        });

        // Calculate overall ĐTBC (all semesters)
        let overallWeightedScore = 0;
        let overallCredits = 0;
        
        Object.values(gradesBySemester).forEach(semesterGrades => {
          Object.values(semesterGrades).forEach(grade => {
            if (grade.tbmhScore && grade.credits) {
              overallWeightedScore += parseFloat(grade.tbmhScore) * parseFloat(grade.credits);
              overallCredits += parseFloat(grade.credits);
            }
          });
        });

        const overallDtbc = overallCredits > 0 
          ? parseFloat((overallWeightedScore / overallCredits).toFixed(2))
          : null;

        // Classify student
        const classification = this.classifyStudent(overallDtbc);

        return {
          student: {
            id: student.id,
            studentCode: student.studentCode,
            fullName: student.fullName,
            dateOfBirth: student.dateOfBirth,
            gender: student.gender
          },
          gradesBySemester,
          retakeInfo,
          dtbcBySemester,
          overallDtbc,
          classification
        };
      }));

      // 7. Get all unique subjects across all semesters
      const allSubjects = {};
      enrollments.forEach(enrollment => {
        if (enrollment.subject) {
          allSubjects[enrollment.subject.id] = {
            id: enrollment.subject.id,
            subjectCode: enrollment.subject.subjectCode,
            subjectName: enrollment.subject.subjectName,
            credits: enrollment.subject.credits
          };
        }
      });

      return {
        classInfo: {
          classId: classInfo.id,
          className: classInfo.className,
          cohortId
        },
        semesters: semesters.map(s => ({
          semesterId: s.semesterId,
          name: s.name,
          academicYear: s.academicYear,
          order: s.order
        })),
        subjects: Object.values(allSubjects),
        studentsData
      };
    } catch (error) {
      console.error('Error in getSemesterSummary:', error);
      throw error;
    }
  }

  /**
   * Xếp loại sinh viên dựa vào ĐTBC
   * @param {number} dtbc - Điểm trung bình chung
   * @returns {string} Xếp loại
   */
  classifyStudent(dtbc) {
    if (dtbc === null || dtbc === undefined) return 'Chưa có';
    
    if (dtbc >= 9.0) return 'Xuất sắc';
    if (dtbc >= 8.0) return 'Giỏi';
    if (dtbc >= 7.0) return 'Khá';
    if (dtbc >= 5.0) return 'Trung bình';
    return 'Yếu';
  }
}

export default new SemesterGradeSummaryService();
