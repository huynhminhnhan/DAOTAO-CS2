/**
 * AdminJS Locale Configuration
 * Cấu hình đa ngôn ngữ và Vietnamese localization
 */

export const localeConfig = {
  language: 'vi',
  availableLanguages: ['vi'],
  localeDetection: false,
  translations: {
    vi: {
      actions: {
        new: 'Tạo mới',
        edit: 'Chỉnh sửa',
        show: 'Xem chi tiết',
        delete: 'Xóa',
        bulkDelete: 'Xóa tất cả',
        list: 'Danh sách'
      },
      buttons: {
        save: 'Lưu',
        addNewItem: 'Thêm mục mới',
        filter: 'Lọc',
        logout: 'Đăng xuất',
        login: 'Đăng nhập',
        cancel: 'Hủy',
        confirm: 'Xác nhận'
      },
      labels: {
        navigation: 'Điều hướng',
        pages: 'Trang',
        'Học tập': 'Học tập'
      },
      pages: {
        'test-simple': 'Test Component',
        'nhap-diem': 'Nhập điểm'
      },
      messages: {
        successfullyCreated: 'Đã tạo thành công',
        successfullyUpdated: 'Đã cập nhật thành công',
        successfullyDeleted: 'Đã xóa thành công',
        loginWelcome: 'Chào mừng đến AdminJS',
        componentNotFound_title: 'Component không tìm thấy',
        componentNotFound_subtitle: 'Không thể tải component. Vui lòng kiểm tra đường dẫn và cấu hình.'
      },
      resources: {
        users: {
          name: 'Người dùng',
          properties: {
            username: 'Tên đăng nhập',
            email: 'Email',
            role: 'Vai trò',
            fullName: 'Họ và tên',
            status: 'Trạng thái',
            lastLogin: 'Lần đăng nhập cuối',
          }
        },
        students: {
          name: 'Sinh viên',
          properties: {
            studentCode: 'Mã sinh viên',
            fullName: 'Họ và tên',
            email: 'Email',
            classId: 'Lớp',
            gender: 'Giới tính',
            viewTranscript: 'Xem bảng điểm'
          }
        },
        teachers: {
          name: 'Giáo viên',
          properties: {
            teacherCode: 'Mã giáo viên',
            fullName: 'Họ và tên',
            email: 'Email',
            phone: 'Số điện thoại',
            department: 'Khoa/Bộ môn/Phòng ban',
            degree: 'Học vị',
            status: 'Trạng thái',
            lastLogin: 'Lần đăng nhập cuối',
          }
        },
        classes: {
          name: 'Lớp học',
          properties: {
          className: 'Tên lớp',
          classCode: 'Mã lớp',
          homeroomTeacherId: 'Giáo viên chủ nhiệm',
          trainingTeacherId: 'Giáo viên đào tạo',
          examTeacherId: 'Giáo viên khảo thí',
          startYear: 'Năm bắt đầu',
          endYear: 'Năm kết thúc',
          maxStudents: 'Sĩ số tối đa',
          currentStudents: 'Số sinh viên hiện tại',
          status: 'Trạng thái',
          cohortId: 'Khóa'
          }
        },
        subjects: {
          name: 'Môn học',
          properties: {
            subjectCode: 'Mã môn',
            subjectName: 'Tên môn học',
            credits: 'Số tín chỉ',
            category: 'Danh mục'
          }
        },
        grades: {
          name: 'Điểm số',
          properties: {
            txScore: 'Điểm TX',
            dkScore: 'Điểm ĐK',
            finalScore: 'Điểm thi',
            tbktScore: 'TBKT',
            tbmhScore: 'TBMH',
            letterGrade: 'Xếp loại'
          }
        },
        gradeHistory: {
          name: 'Lịch sử điểm',
          properties: {
            id: 'ID',
            gradeId: 'ID Điểm',
            studentId: 'Sinh viên',
            classId: 'Lớp',
            subjectId: 'Môn học',
            previousValue: 'Giá trị trước',
            newValue: 'Giá trị sau',
            changeType: 'Loại thay đổi',
            changedBy: 'Người thay đổi',
            changedByRole: 'Vai trò người thay đổi',
            reason: 'Lý do',
            ipAddress: 'Địa chỉ IP',
            userAgent: 'User-Agent',
            transactionId: 'Mã giao dịch',
            createdAt: 'Ngày tạo',
            updatedAt: 'Ngày cập nhật',
            changedByName: 'Người thực hiện',
            gradeHistoryTab: 'Xem lịch sử điểm',
            studentName: 'Sinh viên',
            subjectName: 'Môn học',
            className:  'Lớp'
          }
        },
        GradeHistory: {
          name: 'Lịch sử điểm',
          properties: {
            id: 'ID',
            gradeId: 'ID Điểm',
            studentId: 'Sinh viên',
            classId: 'Lớp',
            subjectId: 'Môn học',
            previousValue: 'Giá trị trước',
            newValue: 'Giá trị sau',
            changeType: 'Loại thay đổi',
            changedBy: 'Người thay đổi',
            changedByRole: 'Vai trò người thay đổi',
            reason: 'Lý do',
            ipAddress: 'Địa chỉ IP',
            userAgent: 'User-Agent',
            transactionId: 'Mã giao dịch',
            createdAt: 'Ngày tạo',
            updatedAt: 'Ngày cập nhật',
            changedByName: 'Người thực hiện',
            gradeHistoryTab: 'Xem lịch sử điểm',
            studentName: 'Sinh viên',
            subjectName: 'Môn học',
            className:  'Lớp'
          }
        },
        Cohorts: {
          name: 'Khóa học',
          properties: {
            cohortId: 'ID khóa học',
            name: 'Tên khóa học',
            startDate: 'Ngày bắt đầu',
            endDate: 'Ngày kết thúc',
            description: 'Mô tả khóa học'
          }
        },
        Semesters: {
          name: 'Học kỳ',
          properties: {
            semesterId: 'ID học kỳ',
            name: 'Tên học kỳ',
            cohortId: 'Khóa học liên kết',
            startDate: 'Ngày bắt đầu',
            endDate: 'Ngày kết thúc',
            order: 'Thứ tự học kỳ',
            displayName: 'Tên hiển thị',
            academicYear: 'Năm học'
          }
        },
        Enrollments: {
          name: 'Đăng ký học',
          properties: {
            enrollmentId: 'ID đăng ký học',
            studentId: 'Sinh viên',
            classId: 'Lớp học',
            subjectId: 'Môn học',
            semester: 'Học kỳ',
            semesterId: 'Học kỳ',
            attempt: 'Lần học',
            note: 'Ghi chú',
            enrollmentDate: 'Ngày đăng ký',
            status: 'Trạng thái',
            bulkEnroll: 'Đăng ký môn học theo lớp',
            cohortId: 'Khóa'
          }
        }
      }
    }
  }
};
