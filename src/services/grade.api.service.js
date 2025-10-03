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
      
      return {
        enrollmentId: enrollment.enrollmentId,
        studentId: enrollment.student.id,
        studentCode: enrollment.student.studentCode,
        studentName: enrollment.student.fullName,
        email: enrollment.student.email,
        phone: enrollment.student.phone,
        attempt: enrollment.attempt,
        enrollmentStatus: enrollment.status,
        hasExistingGrade: !!existingGrade,
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
        lastUpdated: existingGrade?.updatedAt || null
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
