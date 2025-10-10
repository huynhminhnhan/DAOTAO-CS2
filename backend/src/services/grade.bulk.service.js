import GradeRepository from '../repositories/grade.repository.js';
import GradeService from './GradeService.js';
import { sequelize } from '../database/index.js';

const GradeBulkService = {
    async saveBulk({ grades, cohortId, classId, subjectId }, session, reqMeta = {}) {
        if (!grades || !Array.isArray(grades) || grades.length === 0) {
            const err = new Error('Dữ liệu điểm không hợp lệ hoặc rỗng'); err.status = 400; throw err;
        }
        if (!cohortId || !classId || !subjectId) {
            const err = new Error('Thiếu thông tin khóa học, lớp hoặc môn học'); err.status = 400; throw err;
        }

        const classExists = await GradeRepository.findClassById(classId);
        const subjectExists = await GradeRepository.findSubjectById(subjectId);
        if (!classExists) { const err = new Error(`Không tìm thấy lớp với ID: ${classId}`); err.status = 404; throw err; }
        if (!subjectExists) { const err = new Error(`Không tìm thấy môn học với ID: ${subjectId}`); err.status = 404; throw err; }

        // Run whole bulk operation inside a single transaction to make it atomic
        const results = [];
        const errors = [];

        await sequelize.transaction(async (t) => {
            for (const gradeData of grades) {
                const txOptions = { transaction: t };
                try {
                    const { studentId, txScore, dkScore, finalScore, tbktScore, tbmhScore, isRetake, notes, semester = 'HK1', academicYear = '2024-25' } = gradeData;

                    const student = await GradeRepository.findStudentByIdAndClass(studentId, classId, txOptions);
                    if (!student) { throw new Error(`Sinh viên ID ${studentId} không tồn tại trong hệ thống`); }

                    let enrollment = await GradeRepository.findEnrollment({ studentId, classId, subjectId, cohortId }, txOptions);
                    if (!enrollment) {
                        enrollment = await GradeRepository.createEnrollment({ studentId, classId, subjectId, cohortId, attempt: isRetake ? 2 : 1, note: `Đăng ký môn học ${subjectExists.subjectName}`, status: 'active' }, txOptions);
                    } else {
                        if (enrollment.status !== 'active') {
                            await GradeRepository.updateEnrollment(enrollment, { status: 'active', attempt: isRetake ? enrollment.attempt + 1 : enrollment.attempt, note: `Cập nhật trạng thái đăng ký: ${notes || 'Active'}` }, txOptions);
                        }
                    }

                    // Use new JSON format for txScore and dkScore
                    const [grade, created] = await GradeRepository.findOrCreateGrade(
                        { enrollmentId: gradeData.enrollmentId || enrollment.enrollmentId, semester, academicYear }, 
                        { 
                            studentId, 
                            enrollmentId: gradeData.enrollmentId || enrollment.enrollmentId, 
                            semester, 
                            academicYear, 
                            txScore: txScore || null, // JSON format: {tx1: 8.5}
                            dkScore: dkScore || null, // JSON format: {dk1: 8.0, dk2: 7.5}
                            finalScore, 
                            tbktScore, 
                            tbmhScore, 
                            isRetake: isRetake || false, 
                            notes: notes || null 
                        }, 
                        txOptions
                    );

                    if (!created) {
                        const oldSnapshot = grade.toJSON();
                        await GradeRepository.updateGrade(grade, { 
                            txScore: txScore || null, // JSON format
                            dkScore: dkScore || null, // JSON format
                            finalScore, 
                            tbktScore, 
                            tbmhScore, 
                            isRetake: isRetake || false, 
                            notes: notes || null, 
                            updatedAt: new Date() 
                        }, txOptions);
                        await GradeService.createGradeHistory(grade.id, session?.adminUser?.id, 'update', null, oldSnapshot, grade.toJSON(), { ipAddress: reqMeta.ipAddress, userAgent: reqMeta.userAgent, changedByRole: session?.adminUser?.role, reason: `${session?.adminUser?.username} đã cập nhật điểm`, transaction: t });
                    } else {
                        await GradeService.createGradeHistory(grade.id, session?.adminUser?.id, 'create', null, null, grade.toJSON(), { ipAddress: reqMeta.ipAddress, userAgent: reqMeta.userAgent, changedByRole: session?.adminUser?.role, reason: `${session?.adminUser?.username} đã tạo điểm mới`, transaction: t });
                    }

                    results.push({ studentId, studentCode: student.studentCode, studentName: student.fullName, gradeAction: created ? 'created' : 'updated', gradeId: grade.id, enrollmentId: enrollment.enrollmentId, enrollmentStatus: enrollment.status, attempt: enrollment.attempt });
                } catch (error) {
                    console.error(`Error processing grade for student ${gradeData.studentId}:`, error);
                    // rethrow to cause transaction rollback and propagate error to caller
                    throw error;
                }
            }
        });

        return { results, errors };
    }
};

export default GradeBulkService;
