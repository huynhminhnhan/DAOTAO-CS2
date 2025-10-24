import { Enrollment, Student, Grade, GradeRetake, Class, ClassSubject, Subject, Teacher, sequelize } from '../database/index.js';

const GradeRepository = {
  async findEnrollmentsWithGrades({ cohortId, classId, subjectId, semester, academicYear }) {
    console.log('🔍 GradeRepository.findEnrollmentsWithGrades received:', { 
      cohortId, 
      classId, 
      subjectId, 
      semester, 
      academicYear,
      types: {
        cohortId: typeof cohortId,
        classId: typeof classId,
        subjectId: typeof subjectId
      }
    });

    // Parse and validate IDs
    const parsedCohortId = parseInt(cohortId);
    const parsedClassId = parseInt(classId);
    const parsedSubjectId = parseInt(subjectId);

    if (isNaN(parsedCohortId) || isNaN(parsedClassId) || isNaN(parsedSubjectId)) {
      console.error('❌ Invalid ID parameters:', {
        cohortId: { original: cohortId, parsed: parsedCohortId },
        classId: { original: classId, parsed: parsedClassId },
        subjectId: { original: subjectId, parsed: parsedSubjectId }
      });
      throw new Error('Invalid ID parameters: one or more IDs are not valid numbers');
    }

    return Enrollment.findAll({
      where: {
        classId: parsedClassId,
        subjectId: parsedSubjectId,
        cohortId: parsedCohortId,
        status: 'active'
      },
      include: [
        { model: Student, as: 'student', attributes: ['id', 'studentCode', 'fullName', 'email', 'phone'] },
        { 
          model: Grade, 
          as: 'grades', 
          where: { semester, academicYear }, 
          required: false, 
          attributes: [
            'id',
            'txScore',
            'dkScore',
            'finalScore',
            'tbktScore',
            'tbmhScore',
            'letterGrade',
            'isPassed',
            'notes',
            // State management fields
            'gradeStatus',
            'lockStatus', // ✅ JSON field containing {txLocked, dkLocked, finalLocked}
            'submittedForReviewAt',
            'approvedAt',
            'createdAt',
            'updatedAt'
          ],
          include: [
            {
              model: GradeRetake,
              as: 'retakes',
              required: false,
              attributes: ['id', 'retakeType']
            }
          ]
        }
      ],
      order: [[{ model: Student, as: 'student' }, 'studentCode', 'ASC']]
    });
  },

  async findStudentsByClass(classId) {
    return Student.findAll({ where: { classId }, order: [['studentCode', 'ASC']] });
  },

  async findClassWithStudentsAndSubjects(classId, { semester, academicYear }) {
    return Class.findByPk(classId, {
      include: [
        { model: Student, as: 'students', where: { status: 'active' }, include: [{ model: Grade, as: 'grades', where: { semester, academicYear }, required: false } ] },
        { model: ClassSubject, as: 'classSubjects', where: { semester, academicYear }, include: [{ model: Subject, as: 'subject' }] }
      ]
    });
  },

  async findTeacherWithClasses(teacherId) {
    return Teacher.findByPk(teacherId, {
      include: [{ model: Class, as: 'trainingClasses', include: [{ model: Student, as: 'students', attributes: ['id'], where: { status: 'active' }, required: false }] }]
    });
  }
  ,
  // Additional helpers for bulk operations
  async findClassById(classId, options = {}) {
    return Class.findByPk(classId, options);
  },

  async findSubjectById(subjectId, options = {}) {
    return Subject.findByPk(subjectId, options);
  },

  async findStudentByIdAndClass(studentId, classId, options = {}) {
    // Changed: Don't check classId in Student table
    // Instead, just verify the student exists
    // The enrollment check will verify if student is in the class
    return Student.findByPk(studentId, options);
  },

  async findEnrollment({ studentId, classId, subjectId, cohortId }, options = {}) {
    return Enrollment.findOne({ where: { studentId, classId, subjectId, cohortId }, ...options });
  },

  async createEnrollment(data, options = {}) {
    return Enrollment.create(data, options);
  },

  async updateEnrollment(enrollment, data, options = {}) {
    return enrollment.update(data, options);
  },

  async findOrCreateGrade({ enrollmentId, semester, academicYear }, defaults = {}, options = {}) {
    const findOptions = { where: { enrollmentId, semester, academicYear }, defaults, ...options };
    return Grade.findOrCreate(findOptions);
  },

  async updateGrade(grade, updateData, options = {}) {
    return grade.update(updateData, options);
  }
};

export default GradeRepository;
