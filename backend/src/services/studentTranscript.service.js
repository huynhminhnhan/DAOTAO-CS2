import { Student, Grade, Subject, Class, Enrollment, Cohort, Semester } from '../backend/database/index.js';

const StudentTranscriptService = {
  async listStudents() {
    const students = await Student.findAll({
      attributes: ['studentCode', 'fullName', 'classId'],
      include: [
        { model: Class, as: 'class', attributes: ['className'] }
      ],
      order: [['studentCode', 'ASC']]
    });

    return students.map(student => ({
      studentCode: student.studentCode,
      fullName: student.fullName,
      className: student.class?.className || 'Chưa xác định'
    }));
  },

  async getTranscriptByStudentCode(studentCode) {
    const student = await Student.findOne({
      where: { studentCode },
      include: [
        { model: Class, as: 'class', attributes: ['className', 'cohortId'], include: [{ model: Cohort, as: 'cohort', attributes: ['name'] }] }
      ]
    });

    if (!student) {
      const err = new Error('Không tìm thấy sinh viên với mã: ' + studentCode);
      err.status = 404;
      throw err;
    }

    const enrollments = await Enrollment.findAll({
      where: { studentId: student.id },
      include: [
        { model: Subject, as: 'subject', attributes: ['subjectCode', 'subjectName', 'credits'] },
        { model: Grade, as: 'grades', required: false, attributes: ['txScore', 'dkScore1', 'dkScore2', 'dkScore3', 'finalScore', 'tbktScore', 'tbmhScore', 'letterGrade', 'isPassed','academicYear','semester'] },
        { model: Semester, as: 'semesterInfo', required: false, attributes: ['semesterId', 'name', 'academicYear', 'startDate', 'endDate'] }
      ],
      order: [['semesterId', 'ASC']]
    });

    const semesters = {};
    let totalCredits = 0;
    let completedCredits = 0;
    let totalGradePoints = 0;
    let totalValidCredits = 0;

    enrollments.forEach(enrollment => {
      const grade = enrollment.grades?.[0];
      const sem = enrollment.semesterInfo;
      const semIdentifier = sem?.semesterId || sem?.name || enrollment.semesterId || (grade ? `${grade.semester}_${grade.academicYear}` : null);
      const semesterKey = semIdentifier ? String(semIdentifier) : `unknown_semester_${enrollment.id || enrollment.enrollmentId || 'unknown'}`;

      const subject = enrollment.subject;

      if (!semesters[semesterKey]) {
        semesters[semesterKey] = { semesterName: sem?.name || grade?.semester || 'N/A', academicYear: sem?.academicYear || grade?.academicYear || 'N/A', subjects: [], totalCredits: 0, semesterGPA: 0 };
      }

      const credits = subject?.credits || 0;
      totalCredits += credits;

      const inferredIsPassed = (grade && grade.tbmhScore !== null && grade.tbmhScore !== undefined) ? (Number(grade.tbmhScore) >= 4.0) : false;
      const isPassed = (grade && (grade.isPassed === true || grade.isPassed === false)) ? !!grade.isPassed : inferredIsPassed;

      if (grade && isPassed) {
        completedCredits += credits;
      }

      if (grade && grade.tbmhScore != null && credits > 0) {
        totalGradePoints += Number(grade.tbmhScore) * credits;
        totalValidCredits += credits;
      }

      const subjectData = {
        subjectCode: subject?.subjectCode || '',
        subjectName: subject?.subjectName || '',
        credits: credits,
        thScore: '',
        qtScore: grade?.txScore || '',
        gkScore: grade?.dkScore1 || grade?.dkScore2 || grade?.dkScore3 || '',
        ckScore: grade?.finalScore || '',
        hpScore: grade?.tbmhScore || '',
        txScore: grade?.txScore || '',
        dkScore1: grade?.dkScore1 || '',
        dkScore2: grade?.dkScore2 || '',
        dkScore3: grade?.dkScore3 || '',
        finalScore: grade?.finalScore || '',
        tbktScore: grade?.tbktScore || '',
        tbmhScore: grade?.tbmhScore || '',
        letterGrade: grade?.letterGrade || '',
        isPassed: isPassed,
        enrollmentStatus: enrollment.status
      };

      semesters[semesterKey].subjects.push(subjectData);
      semesters[semesterKey].totalCredits += credits;
    });

    Object.keys(semesters).forEach(semester => {
      let semesterPoints = 0;
      let semesterCredits = 0;
      semesters[semester].subjects.forEach(subject => {
        if (subject.hpScore && subject.credits > 0) {
          semesterPoints += subject.hpScore * subject.credits;
          semesterCredits += subject.credits;
        }
      });
      semesters[semester].semesterGPA = semesterCredits > 0 ? semesterPoints / semesterCredits : 0;
    });

    const averageGPA = totalValidCredits > 0 ? totalGradePoints / totalValidCredits : 0;
    const completionRate = totalCredits > 0 ? (completedCredits / totalCredits) * 100 : 0;

    const transcriptData = {
      student: {
        studentCode: student.studentCode,
        fullName: student.fullName,
        dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('vi-VN') : '',
        gender: student.gender,
        className: student.class?.className || '',
        cohort: student.class?.cohort?.name || '',
        phone: student.phone || '',
        email: student.email || ''
      },
      semesters: semesters,
      summary: { totalCredits, completedCredits, averageGPA, completionRate }
    };

    return transcriptData;
  }
};

export default StudentTranscriptService;
