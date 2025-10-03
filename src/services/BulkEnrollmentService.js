// BulkEnrollmentService.js
import { Subject, Student, Class, Enrollment } from '../backend/database/index.js';

const BulkEnrollmentService = {
  async getSubjects() {
    return await Subject.findAll({ order: [['subjectCode', 'ASC']] });
  },

  async bulkEnroll({ classId, subjectId, semester, cohortId, semesterId, studentIds }) {
    console.log('Raw BulkEnroll input:', { classId, subjectId, semester, cohortId, semesterId, studentIds });
    
    // Lấy value nếu là object { value, label }
    const classIdVal = typeof classId === 'object' ? classId.value : classId;
    const subjectIdVal = typeof subjectId === 'object' ? subjectId.value : subjectId;
    const cohortIdVal = typeof cohortId === 'object' ? cohortId.value : cohortId;
    const semesterIdVal = typeof semesterId === 'object' ? semesterId.value : semesterId;
    // const semesterVal = typeof semester === 'object' ? semester.value : semester;

    console.log('Processed BulkEnroll params:', { classIdVal, subjectIdVal, cohortIdVal, semesterIdVal, studentIds });

    if (!classIdVal || !subjectIdVal || !Array.isArray(studentIds)) {
      throw new Error('Thiếu thông tin cơ bản hoặc dữ liệu không hợp lệ');
    }

    // Kiểm tra có ít nhất một trong hai: semester hoặc semesterId (và không phải chuỗi rỗng)
    if ((!semesterIdVal || semesterIdVal === '')) {
      throw new Error(`Thiếu thông tin học kỳ. Vui lòng chọn khóa và học kỳ trước khi đăng ký, semesterIdVal: "${semesterIdVal}")`);
    }

    // Nếu không có cohortId, cảnh báo nhưng vẫn cho phép (để tương thích ngược)
    if (!cohortIdVal) {
      console.warn('Warning: cohortId not provided, enrollment may lack cohort information');
    }
  // Kiểm tra lớp và môn học
  const classExists = await Class.findByPk(classIdVal);
  if (!classExists) throw new Error('Lớp học không tồn tại');
  const subjectExists = await Subject.findByPk(subjectIdVal);
  if (!subjectExists) throw new Error('Môn học không tồn tại');
  // Đăng ký từng sinh viên
  let enrolledCount = 0;
  let existingCount = 0;
  const errors = [];
  for (const studentId of studentIds) {
    try {
      const student = await Student.findOne({ where: { id: studentId, classId: classIdVal, status: 'active' } });
      if (!student) {
        errors.push(`Sinh viên ID ${studentId} không tồn tại hoặc không thuộc lớp này`);
        continue;
      }
      // Tạo enrollment data
      const enrollmentData = {
        studentId,
        classId: classIdVal,
        subjectId: subjectIdVal,
        attempt: 1
      };

      // Thêm cohortId nếu có
      if (cohortIdVal) {
        enrollmentData.cohortId = cohortIdVal;
      }

      // Thêm semesterId nếu có
      if (semesterIdVal) {
        enrollmentData.semesterId = semesterIdVal;
      }
  

      const [enrollment, created] = await Enrollment.findOrCreate({
        where: {
          studentId,
          classId: classIdVal,
          subjectId: subjectIdVal,
          ...(semesterIdVal && { semesterId: semesterIdVal }),
          attempt: 1
        },
        defaults: {
          ...enrollmentData,
          status: 'active',
          enrollmentDate: new Date(),
          note: 'Đăng ký hàng loạt qua service'
        }
      });
      if (created) enrolledCount++; else existingCount++;
    } catch (error) {
      errors.push(`Lỗi đăng ký sinh viên ID ${studentId}: ${error.message}`);
    }
  }
  return { enrolledCount, existingCount, errors };
  },

  async getStats({ classId, subjectId, semester }) {
    const totalStudents = await Student.count({ where: { classId, status: 'active' } });
    const enrolledStudents = await Enrollment.count({ where: { classId, subjectId, semester } });
    return { totalStudents, enrolledStudents, notEnrolledStudents: totalStudents - enrolledStudents };
  }
};

export default BulkEnrollmentService;
