import { sequelize } from './config.js';
import User from './models/User.js';
import Student from './models/Student.js';
import Subject from './models/Subject.js';
import Class from './models/Class.js';
import Teacher from './models/Teacher.js';
import ClassSubject from './models/ClassSubject.js';
import Grade from './models/Grade.js';
import GradeHistory from './models/GradeHistory.js';
import GradeRetake from './models/GradeRetake.js';
import Notification from './models/Notification.js';
import Enrollment from './models/Enrollment.js';
import Cohort from './models/Cohort.js';
import Semester from './models/Semester.js';
import TeacherPermission from './models/TeacherPermission.js';

const models = { User, Student, Subject, Class, Teacher, ClassSubject, Grade, GradeHistory, GradeRetake, Notification, Enrollment, Cohort, Semester, TeacherPermission };

Object.values(models).forEach((m) => {
  if (m && typeof m.associate === 'function') m.associate(models);
});

const syncDatabase = async (force = true) => {
  try {
    console.log('🔄 Syncing database...');
    if (force) {
      console.log('⚠️ Forcing sync (dropping tables)');
      await sequelize.sync({ force: true });
    } else {
      await sequelize.sync({ alter: true });
    }
    console.log('✅ Database synced');
  } catch (err) {
    console.error('❌ Sync failed:', err);
    throw err;
  }
};

export {
  sequelize,
  User,
  Student,
  Subject,
  Class,
  Teacher,
  ClassSubject,
  Grade,
  GradeHistory,
  GradeRetake,
  Notification,
  Enrollment,
  Cohort,
  Semester,
  TeacherPermission,
  syncDatabase
};

