# Hệ thống Quản lý Điểm Sinh viên - Schema Database

## Tổng quan về Schema mới

Dựa trên yêu cầu của bạn, tôi đã thiết kế lại database schema với các đặc điểm sau:

### 1. Cấu trúc chính

#### **Teacher** - Bảng Giáo viên
- `teacherCode`: Mã giáo viên duy nhất
- `fullName`, `email`, `phone`: Thông tin cá nhân
- `department`: Khoa/Bộ môn
- `degree`: Học vị (Cử nhân, Thạc sĩ, Tiến sĩ, PGS, GS)
- `status`: Trạng thái (active, inactive, retired)

#### **Class** - Bảng Lớp học cố định
- `classCode`: Mã lớp (VD: K22CNTT1)
- `className`: Tên lớp đầy đủ
- `homeroomTeacherId`: Giáo viên chủ nhiệm
- `trainingTeacherId`: Giáo viên đào tạo  
- `examTeacherId`: Giáo viên khảo thí
- `startYear`, `endYear`: Năm bắt đầu và kết thúc khóa
- `maxStudents`, `currentStudents`: Sĩ số

#### **Student** - Bảng Sinh viên
- `studentCode`: Mã sinh viên
- `classId`: ID lớp cố định (FK đến Class)
- `fullName`, `email`, `phone`, `gender`, `dateOfBirth`: Thông tin cá nhân
- `status`: Trạng thái học tập

#### **ClassSubject** - Bảng Lịch học lớp-môn theo kỳ
- `classId`: ID lớp học (FK)
- `subjectId`: ID môn học (FK)
- `teacherId`: ID giáo viên đứng lớp (FK)
- `semester`: Học kỳ (HK1, HK2, HK3)
- `academicYear`: Năm học (VD: 2023-24)
- `startDate`, `endDate`: Thời gian học
- `status`: Trạng thái (scheduled, active, completed, cancelled)

#### **Grade** - Bảng Điểm số theo kỳ
- `studentId`: ID sinh viên (FK)
- `classSubjectId`: ID lớp-môn học (FK đến ClassSubject)
- `semester`, `academicYear`: Thông tin kỳ học
- `txScore`, `dkScore`, `finalScore`: Các loại điểm
- `tbktScore`, `tbmhScore`: Điểm trung bình (tự động tính)
- `letterGrade`: Xếp loại (A+, A, B+, B, C+, C, D+, D, F)
- `isPassed`: Đã đạt môn hay chưa
- `isRetake`, `retakeCount`: Thông tin học lại

### 2. Quan hệ chính

```
Student -----> Class (Many-to-One) // Sinh viên thuộc 1 lớp cố định
  |
  v
Grade -----> ClassSubject (Many-to-One) // Điểm thuộc lớp-môn-kỳ

Class -----> Teacher (3 quan hệ) // Mỗi lớp có 3 loại GV
  |
  v  
ClassSubject -----> Subject (Many-to-One) // Lịch học theo môn
ClassSubject -----> Teacher (Many-to-One) // GV đứng lớp
```

### 3. Tính năng đặc biệt

#### **Lớp học cố định suốt khóa**
- Mỗi sinh viên thuộc 1 lớp từ năm 1 đến tốt nghiệp
- Lớp có 3 loại giáo viên: chủ nhiệm, đào tạo, khảo thí (bắt buộc khác nhau)

#### **Lịch học linh hoạt**
- Mỗi kỳ, lớp học nhiều môn khác nhau
- Mỗi môn có giáo viên đứng lớp riêng
- Tại 1 thời điểm chỉ học 1 môn (quản lý qua startDate/endDate)

#### **Điểm số theo kỳ và hỗ trợ học lại**
- Điểm lưu theo từng kỳ học cụ thể
- Hỗ trợ sinh viên học lại môn trượt
- Tự động tính điểm TB và xếp loại

### 4. AdminJS Resources

Đã tạo các resource với giao diện tiếng Việt:
- **👤 Quản lý User**: Tài khoản hệ thống
- **👥 Quản lý Sinh viên**: Thông tin sinh viên + lớp
- **🏫 Quản lý Lớp học**: Lớp cố định + 3 loại GV
- **👨‍🏫 Quản lý Giáo viên**: Thông tin GV + học vị
- **📚 Quản lý Môn học**: Danh mục môn học
- **📅 Quản lý Lịch học**: Lớp-môn theo kỳ
- **📊 Quản lý Điểm số**: Điểm theo kỳ + học lại
- **📜 Quản lý Lịch sử**: Lịch sử thay đổi điểm
- **🔔 Quản lý Thông báo**: Thông báo hệ thống

### 5. Cách chạy

```bash
# Đồng bộ database (giữ dữ liệu cũ)
node sync-db.js

# Tạo lại database (xóa dữ liệu cũ)
node sync-db.js --force

# Khởi chạy server
npm start
```

### 6. Dữ liệu mẫu

Khi chạy với `--force`, hệ thống sẽ tạo:
- 3 giáo viên mẫu
- 1 lớp K22CNTT1 với 3 GV riêng biệt
- 2 môn học cơ sở
- Lịch học cho 2 môn
- 1 sinh viên và tài khoản admin

Schema này hoàn toàn đáp ứng các yêu cầu bạn đã nêu và có thể mở rộng dễ dàng trong tương lai.
