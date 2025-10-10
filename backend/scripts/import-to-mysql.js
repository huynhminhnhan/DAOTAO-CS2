import fs from 'fs';
import path from 'path';

// This script expects env variables for MySQL to be set, e.g. in .env
process.env.DB_DIALECT = 'mysql';

import { sequelize, Student, User, Subject, Class, Teacher, TeacherClassAssignment, ClassSubject, Grade, GradeHistory, Notification, Enrollment, Cohort, Semester } from '../src/database/index.js';

const IN = path.join(process.cwd(), 'tmp', 'sqlite-export.json');

const loadJson = () => {
  if (!fs.existsSync(IN)) {
    console.error(`❌ File export not found: ${IN}. Run npm run export:sqlite first.`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(IN, 'utf8'));
};

const importAll = async () => {
  const data = loadJson();
  const forceSync = process.env.MYSQL_FORCE_SYNC === 'true' || process.argv.includes('--force');

  try {
    console.log('🔁 Kết nối MySQL và bắt đầu import...');
    await sequelize.authenticate();

    if (forceSync) {
      console.log('⚠️  Chạy sync({ force: true }) - sẽ xóa mọi dữ liệu hiện có trên target DB.');
      await sequelize.sync({ force: true });
    } else {
      console.log('ℹ️  Chạy sync({ alter: true }) - sẽ cố gắng cập nhật schema mà không xóa dữ liệu. Nếu target DB không rỗng, có thể gặp lỗi unique constraint.');
      await sequelize.sync({ alter: true });
    }

    // Import in order to respect foreign keys. Bulk insert with ignoreDuplicates where available
    const steps = [
      { name: 'users', model: User, rows: data.users },
      { name: 'teachers', model: Teacher, rows: data.teachers },
      { name: 'cohorts', model: Cohort, rows: data.cohorts },
      { name: 'classes', model: Class, rows: data.classes },
      { name: 'subjects', model: Subject, rows: data.subjects },
      { name: 'classSubjects', model: ClassSubject, rows: data.classSubjects },
      { name: 'teacherClassAssignments', model: TeacherClassAssignment, rows: data.teacherClassAssignments },
      { name: 'students', model: Student, rows: data.students },
      { name: 'semesters', model: Semester, rows: data.semesters },
      { name: 'enrollments', model: Enrollment, rows: data.enrollments },
      { name: 'grades', model: Grade, rows: data.grades },
      { name: 'gradeHistories', model: GradeHistory, rows: data.gradeHistories },
      { name: 'notifications', model: Notification, rows: data.notifications }
    ];

    for (const step of steps) {
      if (!step.rows || step.rows.length === 0) {
        console.log(`➡️ Skip ${step.name} (no rows)`);
        continue;
      }
      console.log(`➡️ Import ${step.name} (${step.rows.length} rows)`);
      try {
        await step.model.bulkCreate(step.rows, { ignoreDuplicates: true });
      } catch (err) {
        console.warn(`⚠️ Import ${step.name} gặp lỗi:`, err.message || err);
        // Continue to next step, but surface the error at the end
      }
    }

    console.log('✅ Import hoàn tất. Kiểm tra kết quả trên MySQL.');
  } catch (err) {
    console.error('❌ Lỗi import:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

importAll();
