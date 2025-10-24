'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    try {
      // Insert teachers; ignore duplicates so seeder is idempotent on MySQL
      await queryInterface.bulkInsert('teachers', [
        { teacherCode: 'GV001', fullName: 'Nguyễn Văn A', email: 'gv001@university.edu.vn', phone: '0123456789', department: 'Khoa CNTT', degree: 'Tiến sĩ', status: 'active', createdAt: now, updatedAt: now },
        { teacherCode: 'GV002', fullName: 'Trần Thị B', email: 'gv002@university.edu.vn', phone: '0123456790', department: 'Khoa CNTT', degree: 'Thạc sĩ', status: 'active', createdAt: now, updatedAt: now }
      ], { ignoreDuplicates: true });

      // Insert cohort (table name: Cohorts)
      await queryInterface.bulkInsert('Cohorts', [
        { name: 'Khóa 2022', startDate: '2022-09-01', endDate: '2026-06-30', createdAt: now, updatedAt: now }
      ], { ignoreDuplicates: true });

      // Insert subjects (table name: subjects)
      await queryInterface.bulkInsert('subjects', [
        { subjectCode: 'CNTT101', subjectName: 'Nhập môn lập trình', credits: 3, isRequired: true, createdAt: now, updatedAt: now }
      ], { ignoreDuplicates: true });

      // Insert admin user and a student user (table name: users)
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('123456', salt);
      await queryInterface.bulkInsert('users', [
        { username: 'admin', email: 'admin@university.edu.vn', password: hashedPassword, fullName: 'Quản trị viên', role: 'admin', status: 'active', createdAt: now, updatedAt: now },
        { username: 'sv001', email: 'sv001@student.edu.vn', password: hashedPassword, fullName: 'Sinh viên 001', role: 'student', status: 'active', createdAt: now, updatedAt: now }
      ], { ignoreDuplicates: true });

      // Ensure existing rows with plaintext passwords are updated to hashedPassword.
      // Only update if password doesn't look like a bcrypt hash (starts with $2)
      await queryInterface.sequelize.query(
        'UPDATE users SET password = ? WHERE username = ? AND password NOT LIKE ?;',
        { replacements: [hashedPassword, 'admin', '$2%'] }
      );
      await queryInterface.sequelize.query(
        'UPDATE users SET password = ? WHERE username = ? AND password NOT LIKE ?;',
        { replacements: [hashedPassword, 'sv001', '$2%'] }
      );

      // Fetch inserted teacher and cohort ids safely
      const [t1Rows] = await queryInterface.sequelize.query("SELECT id FROM teachers WHERE teacherCode = 'GV001' LIMIT 1;");
      const teacher1Id = t1Rows[0] ? t1Rows[0].id : null;
      const [t2Rows] = await queryInterface.sequelize.query("SELECT id FROM teachers WHERE teacherCode = 'GV002' LIMIT 1;");
      const teacher2Id = t2Rows[0] ? t2Rows[0].id : null;
      const [cRows] = await queryInterface.sequelize.query("SELECT cohort_id as cohortId FROM Cohorts WHERE name = 'Khóa 2022' LIMIT 1;");
      const cohortId = cRows[0] ? cRows[0].cohortId : null;
      const [uRows] = await queryInterface.sequelize.query("SELECT id as userId FROM users WHERE username = 'sv001' LIMIT 1;");
      const userId = uRows[0] ? uRows[0].userId : null;

      if (!teacher1Id || !teacher2Id || !cohortId || !userId) {
        console.warn('Seeder: missing FK ids, skipping classes/students insertion', { teacher1Id, teacher2Id, cohortId, userId });
        return;
      }

      // Insert class linking to teachers and cohort (use actual DB column name 'cohort_id')
      await queryInterface.bulkInsert('classes', [
        { classCode: 'K22CNTT1', className: 'Công nghệ thông tin K22 - Lớp 1', cohort_id: cohortId, homeroomTeacherId: teacher1Id, trainingTeacherId: teacher2Id, examTeacherId: teacher2Id, startYear: 2022, endYear: 2026, maxStudents: 40, currentStudents: 1, status: 'active', createdAt: now, updatedAt: now }
      ], { ignoreDuplicates: true });

      const [classRows] = await queryInterface.sequelize.query("SELECT id FROM classes WHERE classCode = 'K22CNTT1' LIMIT 1;");
      const classId = classRows[0] ? classRows[0].id : null;

      if (!classId) {
        console.warn('Seeder: class not found, skipping student insertion');
        return;
      }

      // Insert student linked to class and user
      await queryInterface.bulkInsert('students', [
        { studentCode: 'SV001', fullName: 'Nguyễn Văn Nam', email: 'sv001@student.edu.vn', gender: 'male', dateOfBirth: '2004-01-15', phone: '0987654321', classId: classId, userId: userId, status: 'active', createdAt: now, updatedAt: now }
      ], { ignoreDuplicates: true });

    } catch (err) {
      console.warn('Seeder up: error', err && err.message ? err.message : err);
      throw err;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove seeded data (use actual table names)
    await queryInterface.bulkDelete('students', { studentCode: 'SV001' }, {});
    await queryInterface.bulkDelete('classes', { classCode: 'K22CNTT1' }, {});
    await queryInterface.bulkDelete('users', { username: ['admin', 'sv001'] }, {});
    await queryInterface.bulkDelete('subjects', { subjectCode: 'CNTT101' }, {});
    await queryInterface.bulkDelete('Cohorts', { name: 'Khóa 2022' }, {});
    await queryInterface.bulkDelete('teachers', { teacherCode: ['GV001', 'GV002'] }, {});
  }
};
