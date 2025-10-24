/**
 * AdminJS v7 Configuration with ESM
 * Cấu hình AdminJS v7+ theo tài liệu chính thức với ESM support
 */

import AdminJS, { ComponentLoader } from 'adminjs';
// Import Sequelize adapter cho AdminJS v7+
import * as AdminJSSequelize from '@adminjs/sequelize';

// Đăng ký adapter trước khi sử dụng
AdminJS.registerAdapter({
  Database: AdminJSSequelize.Database,
  Resource: AdminJSSequelize.Resource,
});

// Import resources
import StudentResource from '../resources/student.resource.js';
import UserResource from '../resources/user.resource.js';
import ClassResource from '../resources/class.resource.js';
import TeacherResource from '../resources/teacher.resource.js';
import SubjectResource from '../resources/subject.resource.js';
import ClassSubjectResource from '../resources/class-subject.resource.js';
import GradeResource from '../resources/grade-simple.resource.js';

/**
 * Create AdminJS v7 instance với ComponentLoader và localization v7
 */
export const createAdminJSConfig = () => {
  // Create ComponentLoader instance (required in v7)
  const componentLoader = new ComponentLoader();

  return new AdminJS({
    componentLoader,
    resources: [
      UserResource,
      StudentResource,
      ClassResource,
      TeacherResource, 
      SubjectResource,
      ClassSubjectResource,
      GradeResource,
      //gradeHistoryResource,
      //NotificationResource
    ],
    
    rootPath: '/admin',
    branding: {
      companyName: '🎓 Hệ thống Quản lý Điểm Sinh viên',
      softwareBrothers: false,
      logo: false
    },
    
    // Định nghĩa navigation structure
    navigation: {
      'quan-ly-he-thong': {
        name: 'Quản lý Hệ thống',
        icon: 'Settings'
      },
      'quan-ly-sinh-vien': {
        name: 'Quản lý Sinh viên',
        icon: 'User' 
      },
      'quan-ly-giao-vien': {
        name: 'Quản lý Giáo viên',
        icon: 'User'
      },
      'quan-ly-lop-hoc': {
        name: 'Quản lý Lớp học',
        icon: 'Home'
      },
      'quan-ly-mon-hoc': {
        name: 'Quản lý Môn học', 
        icon: 'Book'
      },
      'quan-ly-diem-so': {
        name: 'Quản lý Điểm số',
        icon: 'Edit'
      }
    },
    locale: {
      language: 'vi',
      availableLanguages: ['vi'], // only Vietnamese: hide language selector
      localeDetection: false,
      translations: {
        vi: {
          labels: {
            navigation: {
              'quan-ly-he-thong': 'Quản lý Hệ thống',
              'quan-ly-sinh-vien': 'Quản lý Sinh viên', 
              'quan-ly-giao-vien': 'Quản lý Giáo viên',
              'quan-ly-lop-hoc': 'Quản lý Lớp học',
              'quan-ly-mon-hoc': 'Quản lý Môn học',
              'quan-ly-diem-so': 'Quản lý Điểm số',
              'bao-cao-thong-ke': 'Báo cáo & Thống kê'
            }
          },
          resources: {
            'User': 'Người dùng',
            'Student': 'Sinh viên', 
            'Teacher': 'Giáo viên',
            'Class': 'Lớp học',
            'Subject': 'Môn học',
            'ClassSubject': 'Lịch học',
            'Grade': 'Điểm số'
          },
          properties: {
            // User properties
            id: 'ID',
            username: 'Tên đăng nhập',
            email: 'Email',
            fullName: 'Họ và tên',
            role: 'Vai trò',
            classSubjects: 'Lớp-Môn học',
            status: 'Trạng thái',
            lastLogin: 'Đăng nhập cuối',
            createdAt: 'Ngày tạo',
            updatedAt: 'Ngày cập nhật',
            // Student properties
            studentCode: 'Mã sinh viên',
            classId: 'Lớp học',
            gender: 'Giới tính',
            dateOfBirth: 'Ngày sinh',
            phone: 'Số điện thoại',
            // Class properties
            classCode: 'Mã lớp',
            className: 'Tên lớp',
            // Subject properties
            subjectCode: 'Mã môn học',
            subjectName: 'Tên môn học',
            credits: 'Số tín chỉ',
            // Grade properties
            semester: 'Học kỳ',
            academicYear: 'Năm học',
            txScore: 'Điểm TX',
            dkScore: 'Điểm ĐK',
            finalScore: 'Điểm thi cuối kỳ',
            tbktScore: 'Điểm TBKT',
            tbmhScore: 'Điểm TBMH',
            letterGrade: 'Điểm chữ',
            isPassed: 'Kết quả'
          },
          labels: {
            dashboard: 'Trang chủ',
            loginWelcome: 'Chào mừng đến với AdminJS'
          },
          buttons: {
            save: 'Lưu',
            cancel: 'Hủy',
            delete: 'Xóa',
            edit: 'Sửa',
            show: 'Xem',
            create: 'Tạo mới',
            filter: 'Lọc'
          },
          messages: {
            successfullyCreated: 'Tạo mới thành công',
            successfullyUpdated: 'Cập nhật thành công',
            successfullyDeleted: 'Xóa thành công'
          }
        },
        en: {
          properties: {
            id: 'ID',
            username: 'Username',
            email: 'Email',
            fullName: 'Full Name',
            role: 'Role',
            status: 'Status',
            lastLogin: 'Last Login',
            createdAt: 'Created At',
            updatedAt: 'Updated At',
            studentCode: 'Student Code',
            classId: 'Class',
            gender: 'Gender',
            dateOfBirth: 'Date of Birth',
            phone: 'Phone',
            classCode: 'Class Code',
            className: 'Class Name',
            subjectCode: 'Subject Code',
            subjectName: 'Subject Name',
            credits: 'Credits',
            semester: 'Semester',
            academicYear: 'Academic Year',
            txScore: 'TX Score',
            dkScore: 'DK Score',
            finalScore: 'Final Score',
            tbktScore: 'TBKT Score',
            tbmhScore: 'TBMH Score',
            letterGrade: 'Letter Grade',
            isPassed: 'Passed'
          }
        }
      }
    }
  });
};

export default { createAdminJSConfig };
