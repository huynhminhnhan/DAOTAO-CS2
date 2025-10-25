// BulkEnrollmentService.js
import { Subject, Student, Class, Enrollment } from '../database/index.js';

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

    // Đăng ký từng sinh viên với retry logic cho Railway
    let enrolledCount = 0;
    let existingCount = 0;
    const errors = [];

    for (const studentId of studentIds) {
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;

      while (retryCount < maxRetries && !success) {
        try {
          // Kiểm tra sinh viên tồn tại và active
          const student = await Student.findOne({
            where: { id: studentId, status: 'active' },
            // Force refresh from database to avoid cache issues
            force: true
          });

          if (!student) {
            if (retryCount === maxRetries - 1) {
              errors.push(`Sinh viên ID ${studentId} không tồn tại hoặc không còn hoạt động (đã thử ${maxRetries} lần)`);
            }
            retryCount++;
            // Wait 100ms before retry
            await new Promise(resolve => setTimeout(resolve, 100));
            continue;
          }

          // Kiểm tra xem lớp đăng ký có phải là lớp học lại không (classCode bắt đầu với RT)
          const targetClass = await Class.findByPk(classIdVal);
          const isRetakeClass = targetClass && targetClass.classCode && targetClass.classCode.startsWith('RT');

          // Nếu không phải lớp học lại, kiểm tra sinh viên có thuộc lớp này không
          if (!isRetakeClass && student.classId !== parseInt(classIdVal)) {
            errors.push(`Sinh viên ID ${studentId} (${student.fullName}) không thuộc lớp này (Lớp của sinh viên: ${student.classId}, Lớp đăng ký: ${classIdVal})`);
            success = true; // Don't retry for this type of error
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

          if (created) {
            enrolledCount++;
            console.log(`✅ Đăng ký mới sinh viên ${studentId}`);
          } else {
            existingCount++;
            console.log(`ℹ️ Sinh viên ${studentId} đã đăng ký trước đó`);
          }

          success = true;

        } catch (error) {
          retryCount++;
          console.error(`❌ Lỗi đăng ký sinh viên ${studentId} (lần ${retryCount}):`, error.message);

          if (retryCount >= maxRetries) {
            errors.push(`Lỗi đăng ký sinh viên ID ${studentId}: ${error.message}`);
          } else {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 200 * retryCount));
          }
        }
      }
    }
  
    console.log('📊 Kết quả đăng ký:', { enrolledCount, existingCount, totalErrors: errors.length });
    return { enrolledCount, existingCount, errors };
  },

  async getStats({ classId, subjectId, semester }) {
    const totalStudents = await Student.count({ where: { classId, status: 'active' } });
    const enrolledStudents = await Enrollment.count({ where: { classId, subjectId, semester } });
    return { totalStudents, enrolledStudents, notEnrolledStudents: totalStudents - enrolledStudents };
  }
};

export default BulkEnrollmentService;
