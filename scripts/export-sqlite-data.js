import fs from 'fs';
import path from 'path';

// Ensure we run with the project's NODE env so models use sqlite config
process.env.DB_DIALECT = process.env.DB_DIALECT || 'sqlite';

import { sequelize, Student, User, Subject, Class, Teacher, TeacherClassAssignment, ClassSubject, Grade, GradeHistory, Notification, Enrollment, Cohort, Semester } from '../src/backend/database/index.js';

const OUT = path.join(process.cwd(), 'tmp', 'sqlite-export.json');

const ensureTmp = () => {
  const dir = path.dirname(OUT);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const exportAll = async () => {
  try {
    console.log('🔎 Kết nối DB (SQLite) và xuất dữ liệu...');
    await sequelize.authenticate();

    const tables = {
      users: await User.findAll({ raw: true }),
      students: await Student.findAll({ raw: true }),
      teachers: await Teacher.findAll({ raw: true }),
      classes: await Class.findAll({ raw: true }),
      subjects: await Subject.findAll({ raw: true }),
      classSubjects: await ClassSubject.findAll({ raw: true }),
      teacherClassAssignments: await TeacherClassAssignment.findAll({ raw: true }),
      cohorts: await Cohort.findAll({ raw: true }),
      semesters: await Semester.findAll({ raw: true }),
      enrollments: await Enrollment.findAll({ raw: true }),
      grades: await Grade.findAll({ raw: true }),
      gradeHistories: await GradeHistory.findAll({ raw: true }),
      notifications: await Notification.findAll({ raw: true })
    };

    ensureTmp();
    fs.writeFileSync(OUT, JSON.stringify(tables, null, 2), 'utf8');
    console.log(`✅ Xuất dữ liệu SQLite xong: ${OUT}`);
  } catch (err) {
    console.error('❌ Lỗi xuất dữ liệu:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

exportAll();
