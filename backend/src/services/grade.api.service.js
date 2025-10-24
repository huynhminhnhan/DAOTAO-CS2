import GradeRepository from '../repositories/grade.repository.js';

const GradeApiService = {
  async getEnrolledStudents(query) {
    const { cohortId, classId, subjectId, semester = 'HK1', academicYear = '2024-25' } = query;
    console.log('🔍 GradeApiService.getEnrolledStudents received:', { cohortId, classId, subjectId, subjectType: typeof subjectId });
    
    if (!cohortId || !classId || !subjectId) {
      const err = new Error('Thiếu thông tin cohortId, classId, hoặc subjectId');
      err.status = 400;
      throw err;
    }

    const enrolledStudents = await GradeRepository.findEnrollmentsWithGrades({ cohortId, classId, subjectId, semester, academicYear });

    const transformedData = enrolledStudents.map(enrollment => {
      const existingGrade = enrollment.grades && enrollment.grades.length > 0 ? enrollment.grades[0] : null;
      
      // Kiểm tra có bản ghi trong GradeRetakes hay không
      const hasRetake = existingGrade?.retakes && existingGrade.retakes.length > 0;
      
      return {
        enrollmentId: enrollment.enrollmentId,
        studentId: enrollment.student.id,
        studentCode: enrollment.student.studentCode,
        studentName: enrollment.student.fullName,
        email: enrollment.student.email,
        phone: enrollment.student.phone,
        attempt: enrollment.attempt || 1,
        enrollmentStatus: enrollment.status,
        hasExistingGrade: !!existingGrade,
        hasRetake: hasRetake, // Flag để highlight row
        gradeId: existingGrade?.id || null,
        // Return JSON objects directly for frontend
        txScore: existingGrade?.txScore || {},
        dkScore: existingGrade?.dkScore || {},
        finalScore: existingGrade?.finalScore || '',
        tbktScore: existingGrade?.tbktScore || null,
        tbmhScore: existingGrade?.tbmhScore || null,
        letterGrade: existingGrade?.letterGrade || '',
        isPassed: existingGrade?.isPassed || null,
        notes: existingGrade?.notes || '',
        lastUpdated: existingGrade?.updatedAt || null,
        // State management fields
        gradeStatus: existingGrade?.gradeStatus || null,
        // lockStatus - Sequelize auto-parses JSON, ensure it's always an object
        lockStatus: (() => {
          if (!existingGrade?.lockStatus) {
            return { txLocked: false, dkLocked: false, finalLocked: false };
          }
          // If it's a string (shouldn't happen with Sequelize JSON type, but safety check)
          if (typeof existingGrade.lockStatus === 'string') {
            try {
              return JSON.parse(existingGrade.lockStatus);
            } catch (e) {
              console.error('Failed to parse lockStatus:', existingGrade.lockStatus);
              return { txLocked: false, dkLocked: false, finalLocked: false };
            }
          }
          return existingGrade.lockStatus;
        })(),
        // Flat fields for easier frontend access (backward compatibility)
        txLocked: existingGrade?.lockStatus?.txLocked || false,
        dkLocked: existingGrade?.lockStatus?.dkLocked || false,
        finalLocked: existingGrade?.lockStatus?.finalLocked || false,
        submittedForReviewAt: existingGrade?.submittedForReviewAt || null,
        approvedAt: existingGrade?.approvedAt || null
      };
    });

    return transformedData;
  },

  async getStudentsByClass(classId) {
    const students = await GradeRepository.findStudentsByClass(classId);
    return students.map(student => ({ id: student.id, params: { studentCode: student.studentCode, fullName: student.fullName, email: student.email, classId: student.classId, gender: student.gender, dateOfBirth: student.dateOfBirth, phone: student.phone, status: student.status } }));
  },

  async getClassGrades(classId, options) {
    const classInfo = await GradeRepository.findClassWithStudentsAndSubjects(classId, options);
    if (!classInfo) {
      const err = new Error('Không tìm thấy lớp');
      err.status = 404;
      throw err;
    }
    return {
      class: { id: classInfo.id, name: classInfo.className, code: classInfo.classCode },
      students: classInfo.students,
      subjects: classInfo.classSubjects
    };
  },

  async getTeacherClasses(teacherId) {
    const teacher = await GradeRepository.findTeacherWithClasses(teacherId);
    if (!teacher) {
      const err = new Error('Teacher not found');
      err.status = 404;
      throw err;
    }
    return teacher.trainingClasses.map(cls => ({ id: cls.id, name: cls.className, code: cls.classCode, studentCount: cls.students.length }));
  }
};

export default GradeApiService;
