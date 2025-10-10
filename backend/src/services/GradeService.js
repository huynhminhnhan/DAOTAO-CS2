/**
 * Grade Service - Business Logic Layer
 * Design Pattern: Service Layer + Strategy Pattern
 */

import { Grade, GradeHistory, Student, Subject, Class, User, Enrollment, sequelize } from '../backend/database/index.js';

class GradeService {
  /**
   * Tính toán điểm số theo yêu cầu tài liệu
   * TBKT = TX * 40% + DK * 60%
   * TBMH = TBKT * 40% + Final * 60%
   */
  static calculateGrades(txScore, dkScore, finalScore) {
    // Kiểm tra điểm hợp lệ
    const scores = [txScore, dkScore, finalScore];
    for (const score of scores) {
      if (score < 0 || score > 10) {
        throw new Error(`Điểm phải nằm trong khoảng 0-10. Nhận được: ${score}`);
      }
    }

    // Tính TBKT (Trung bình kiểm tra)
    const tbktScore = Math.round((txScore * 0.4 + dkScore * 0.6) * 100) / 100;

    // Tính TBMH (Trung bình môn học)
    const tbmhScore = Math.round((tbktScore * 0.4 + finalScore * 0.6) * 100) / 100;

    // Chuyển đổi điểm chữ
    const letterGrade = this.convertToLetterGrade(tbmhScore);

    return {
      tbktScore,
      tbmhScore,
      letterGrade
    };
  }

  /**
   * Chuyển đổi điểm số sang điểm chữ theo thang điểm Việt Nam
   */
  static convertToLetterGrade(score) {
  // Vietnamese categorical classification:
  // Xuất sắc: >= 8.5
  // Giỏi: >= 7.0 and < 8.5
  // Khá: >= 6.0 and < 7.0
  // Trung bình: >= 5.0 and < 6.0
  // Yếu: < 5.0
  if (score >= 9) return 'Xuất sắc';
  if (score >= 8) return 'Giỏi';
  if (score >= 7.0) return 'Khá';
  if (score >= 5.0) return 'Trung bình';
  return 'Yếu';
  }

  /**
   * Tạo điểm mới với validation và tính toán tự động
   */
  static async createGrade(gradeData, userId, meta = {}) {
    const { studentId, subjectId, classId, txScore, dkScore, finalScore } = gradeData;

    // Validation: Kiểm tra sinh viên, môn học, lớp tồn tại
    const [student, subject, classInfo] = await Promise.all([
      Student.findByPk(studentId),
      Subject.findByPk(subjectId),
      Class.findByPk(classId)
    ]);

    if (!student) throw new Error('Sinh viên không tồn tại');
    if (!subject) throw new Error('Môn học không tồn tại');
    if (!classInfo) throw new Error('Lớp học không tồn tại');

    // Kiểm tra điểm đã tồn tại
    const existingGrade = await Grade.findOne({
      where: { studentId, subjectId, classId }
    });

    if (existingGrade) {
      throw new Error('Điểm cho sinh viên này trong môn học và lớp này đã tồn tại');
    }

    // Tính toán điểm
    const calculatedGrades = this.calculateGrades(txScore, dkScore, finalScore);

    // Tạo điểm mới trong transaction và ghi history
    const created = await sequelize.transaction(async (t) => {
      const newGrade = await Grade.create({
        ...gradeData,
        ...calculatedGrades
      }, { transaction: t });

      await GradeHistory.create({
        gradeId: newGrade.id,
        studentId,
        subjectId,
        classId,
        previousValue: null,
        newValue: { ...newGrade.toJSON() },
        changeType: 'create',
        changedBy: meta.changedBy || userId,
        changedByRole: meta.changedByRole || (await User.findByPk(userId))?.role || 'unknown',
        reason: meta.reason || null,
        ipAddress: meta.ipAddress || null,
        userAgent: meta.userAgent || null,
        transactionId: meta.transactionId || null
      }, { transaction: t });

      return newGrade;
    });

    return await Grade.findByPk(created.id, {
      include: [
        { model: Student, as: 'student' },
        { model: Subject, as: 'subject' },
        { model: Class, as: 'class' }
      ]
    });
  }

  /**
   * Cập nhật điểm với lịch sử thay đổi
   */
  static async updateGrade(gradeId, updateData, userId, meta = {}) {
    const grade = await Grade.findByPk(gradeId);
    if (!grade) {
      throw new Error('Điểm không tồn tại');
    }

    // Use transaction to update and write history atomically
    const updated = await sequelize.transaction(async (t) => {
      const oldSnapshot = grade.toJSON();

      // Nếu có thay đổi điểm số, tính toán lại
      const { txScore, dkScore, finalScore } = updateData;
      if (txScore !== undefined || dkScore !== undefined || finalScore !== undefined) {
        const newTxScore = txScore !== undefined ? txScore : grade.txScore;
        const newDkScore = dkScore !== undefined ? dkScore : grade.dkScore;
        const newFinalScore = finalScore !== undefined ? finalScore : grade.finalScore;

        const calculatedGrades = this.calculateGrades(newTxScore, newDkScore, newFinalScore);
        Object.assign(updateData, calculatedGrades);
      }

      await grade.update(updateData, { transaction: t });

      const newSnapshot = grade.toJSON();
      
      // Resolve studentId/subjectId/classId: prefer grade, then oldSnapshot, then enrollment
      let resolvedStudentId = grade.studentId || (oldSnapshot && oldSnapshot.studentId) || null;
      let resolvedSubjectId = grade.subjectId || null;
      let resolvedClassId = grade.classId || null;
      if ((!resolvedStudentId || !resolvedSubjectId || !resolvedClassId) && grade.enrollmentId) {
        try {
          const enrollment = await Enrollment.findByPk(grade.enrollmentId, { transaction: t });
          if (enrollment) {
            resolvedStudentId = resolvedStudentId || enrollment.studentId || null;
            resolvedSubjectId = resolvedSubjectId || enrollment.subjectId || null;
            resolvedClassId = resolvedClassId || enrollment.classId || null;
          }
        } catch (e) {
          // ignore resolution errors
        }
      }

     

      await GradeHistory.create({
        gradeId: grade.id,
        studentId: resolvedStudentId || null,
        subjectId: resolvedSubjectId || null,
        classId: resolvedClassId || null,
        previousValue: oldSnapshot,
        newValue: newSnapshot,
        changeType: 'update',
        changedBy:  userId,
        changedByRole: meta.changedByRole || (await User.findByPk(userId))?.role || 'unknown',
        reason: meta.reason || null,
        ipAddress: meta.ipAddress || null,
        userAgent: meta.userAgent || null,
        transactionId: meta.transactionId || null
      }, { transaction: t });

      return grade;
    });

    return await Grade.findByPk(updated.id, {
      include: [
        { model: Student, as: 'student' },
        { model: Subject, as: 'subject' },
        { model: Class, as: 'class' }
      ]
    });
  }

  /**
   * Tạo lịch sử thay đổi điểm
   */
  static async createGradeHistory(gradeId, userId, action, fieldName = null, oldValue = null, newValue = null, meta = {}) {
    // Backward-compatible helper (creates a compact row)
    // Try to resolve subjectId/classId from Grade -> Enrollment if possible
    let subjectId = null;
    let classId = null;
    let studentId = null;
    try {
      const grade = await Grade.findByPk(gradeId);
      if (grade) {
        subjectId = grade.subjectId || null;
        classId = grade.classId || null;
        studentId = grade.studentId || null;
        if ((!subjectId || !classId || !studentId) && grade.enrollmentId) {
          const enrollment = await Enrollment.findByPk(grade.enrollmentId);
          if (enrollment) {
            subjectId = subjectId || enrollment.subjectId || null;
            classId = classId || enrollment.classId || null;
            studentId = studentId || enrollment.studentId || null;
          }
        }
      }
    } catch (e) {
      // ignore resolution errors
    }
    // Detect whether anything meaningful changed. If both oldValue and newValue are snapshots,
    // only create a GradeHistory row when any of the watched score fields actually changed.
    const createOptions = {};
    if (meta && meta.transaction) createOptions.transaction = meta.transaction;

    // Normalize snapshots: if caller passed a single fieldName/oldValue pair, wrap into objects
    const prevSnapshot = (oldValue && typeof oldValue === 'object') ? oldValue : (fieldName ? { [fieldName]: oldValue } : null);
    const nextSnapshot = (newValue && typeof newValue === 'object') ? newValue : (fieldName ? { [fieldName]: newValue } : null);

    // Fields we consider meaningful for history creation
    const watchedFields = ['txScore', 'dkScore1', 'dkScore2', 'dkScore3', 'finalScore', 'tbktScore', 'tbmhScore', 'letterGrade', 'isRetake', 'notes'];

    let shouldCreate = false;

    if (!prevSnapshot && nextSnapshot) {
      // creation or first snapshot — record it
      shouldCreate = true;
    } else if (prevSnapshot && nextSnapshot) {
      for (const f of watchedFields) {
        const a = prevSnapshot[f] === undefined ? null : prevSnapshot[f];
        const b = nextSnapshot[f] === undefined ? null : nextSnapshot[f];
        // Normalize numbers vs strings
        const na = (a !== null && !isNaN(a)) ? Number(a) : a;
        const nb = (b !== null && !isNaN(b)) ? Number(b) : b;
        if (na !== nb) { shouldCreate = true; break; }
      }
    } else if (prevSnapshot && !nextSnapshot) {
      // previous exists but new is missing — treat as change
      shouldCreate = true;
    }

    if (!shouldCreate) {
      // nothing to record
      return null;
    }

    return await GradeHistory.create({
      gradeId,
      studentId: studentId || null,
      subjectId,
      classId,
      previousValue: fieldName ? { [fieldName]: oldValue } : (oldValue || null),
      newValue: fieldName ? { [fieldName]: newValue } : (newValue || null),
      changeType: action,
      changedBy: meta.changedBy || userId,
      changedByRole: meta.changedByRole || (await User.findByPk(userId))?.role || 'unknown',
      reason: meta.reason || `${action} grade ${fieldName ? `field: ${fieldName}` : ''}`,
      ipAddress: meta.ipAddress || null,
      userAgent: meta.userAgent || null,
      transactionId: meta.transactionId || null
    }, createOptions);
  }

  /**
   * Revert a grade using a GradeHistory row (apply previousValue into Grade)
   */
  static async revertGradeFromHistory(historyRow, actorId, meta = {}) {
    if (!historyRow || !historyRow.gradeId) throw new Error('Invalid history row');

    const gradeId = historyRow.gradeId;

    return await sequelize.transaction(async (t) => {
      const grade = await Grade.findByPk(gradeId, { transaction: t });
      if (!grade) throw new Error('Grade not found');

      const prev = historyRow.previousValue;
      if (!prev) throw new Error('No previous snapshot to revert to');

      // Update grade fields with previous snapshot (only allowed fields)
      const allowed = ['txScore', 'dkScore', 'finalScore', 'tbktScore', 'tbmhScore', 'letterGrade'];
      const updateData = {};
      for (const key of allowed) {
        if (prev[key] !== undefined) updateData[key] = prev[key];
      }

      await grade.update(updateData, { transaction: t });

      // Create history row describing the revert
      // resolve student/subject/class similar to update path
      let resolvedStudentId = grade.studentId || null;
      let resolvedSubjectId = grade.subjectId || null;
      let resolvedClassId = grade.classId || null;
      if ((!resolvedStudentId || !resolvedSubjectId || !resolvedClassId) && grade.enrollmentId) {
        try {
          const enrollment = await Enrollment.findByPk(grade.enrollmentId, { transaction: t });
          if (enrollment) {
            resolvedStudentId = resolvedStudentId || enrollment.studentId || null;
            resolvedSubjectId = resolvedSubjectId || enrollment.subjectId || null;
            resolvedClassId = resolvedClassId || enrollment.classId || null;
          }
        } catch (e) {}
      }

      const revertedRow = await GradeHistory.create({
        gradeId: grade.id,
        studentId: resolvedStudentId || null,
        subjectId: resolvedSubjectId || null,
        classId: resolvedClassId || null,
        previousValue: historyRow.newValue || null,
        newValue: grade.toJSON(),
        changeType: 'revert',
        changedBy: meta.changedBy || actorId,
        changedByRole: meta.changedByRole || (await User.findByPk(actorId))?.role || 'unknown',
        reason: meta.reason || `Reverted historyId=${historyRow.id}`,
        ipAddress: meta.ipAddress || null,
        userAgent: meta.userAgent || null,
        transactionId: meta.transactionId || null
      }, { transaction: t });

      return { grade: grade.toJSON(), history: revertedRow };
    });
  }

  /**
   * Lấy báo cáo điểm của sinh viên
   */
  static async getStudentGradeReport(studentId) {
    const grades = await Grade.findAll({
      where: { studentId },
      include: [
        { model: Subject, as: 'subject' },
        { model: Class, as: 'class' }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Tính toán thống kê
    const totalCredits = grades.reduce((sum, grade) => sum + grade.subject.credits, 0);
    const weightedSum = grades.reduce((sum, grade) => 
      sum + (grade.tbmhScore * grade.subject.credits), 0);
    const gpa = totalCredits > 0 ? Math.round((weightedSum / totalCredits) * 100) / 100 : 0;

    const gradeCounts = grades.reduce((counts, grade) => {
      counts[grade.letterGrade] = (counts[grade.letterGrade] || 0) + 1;
      return counts;
    }, {});

    return {
      studentId,
      totalSubjects: grades.length,
      totalCredits,
      gpa,
      letterGrade: this.convertToLetterGrade(gpa),
      gradeCounts,
      grades
    };
  }

  /**
   * Lấy thống kê điểm của môn học
   */
  static async getSubjectGradeStatistics(subjectId) {
    const grades = await Grade.findAll({
      where: { subjectId },
      include: [
        { model: Student, as: 'student' },
        { model: Class, as: 'class' }
      ]
    });

    if (grades.length === 0) {
      return {
        subjectId,
        totalStudents: 0,
        statistics: null
      };
    }

    const scores = grades.map(g => g.tbmhScore);
    const average = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);

    const gradeCounts = grades.reduce((counts, grade) => {
      counts[grade.letterGrade] = (counts[grade.letterGrade] || 0) + 1;
      return counts;
    }, {});

    const passRate = ((grades.filter(g => g.tbmhScore >= 4.0).length / grades.length) * 100).toFixed(2);

    return {
      subjectId,
      totalStudents: grades.length,
      statistics: {
        average,
        highest,
        lowest,
        passRate: `${passRate}%`,
        gradeCounts
      },
      grades
    };
  }

  /**
   * Import điểm từ Excel (sẵn sàng cho tương lai)
   */
  static async importGradesFromExcel(filePath, userId) {
    // TODO: Implement Excel import logic
    // This would use libraries like xlsx or exceljs
    throw new Error('Excel import feature will be implemented in future version');
  }

  /**
   * Export điểm ra Excel (sẵn sàng cho tương lai)  
   */
  static async exportGradesToExcel(filters = {}) {
    // TODO: Implement Excel export logic
    throw new Error('Excel export feature will be implemented in future version');
  }
}

export default GradeService;
