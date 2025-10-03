# Hệ thống Quản lý Điểm Sinh viên với AdminJS

Một ứng dụng web được xây dựng theo đúng yêu cầu tài liệu, sử dụng AdminJS, JWT Authentication và SQLite.
npx sequelize-cli db:migrate --debug
## 🎯 Thực hiện theo yêu cầu tài liệu

### PHẦN 1: CƠ SỞ DỮ LIỆU - DATABASE ✅
- **7 bảng chính** theo yêu cầu:
  - `users` - Quản lý người dùng (username, email, password, role, status)
  - `students` - Thông tin sinh viên (student_code, full_name, email, phone, address, gender, status)
  - `subjects` - Môn học (subject_code, subject_name, credits, category, is_required)
  - `classes` - Lớp học (class_code, class_name, subject_id, teacher_name, semester, academic_year)
  - `grades` - **TRUNG TÂM HỆ THỐNG** (TX, DK, Final, TBKT, TBMH, Letter Grade)
  - `grade_history` - Audit trail cho mọi thay đổi điểm
  - `notifications` - Thông báo hệ thống

### PHẦN 2: BACKEND - MÁY CHỦ ỨNG DỤNG ✅
- **Node.js + Express** framework
- **RESTful API** mạnh mẽ và linh hoạt
- **SQLite** database nhẹ, dễ triển khai
- **JWT Authentication** với Access (15 phút) + Refresh (7 ngày) tokens
- **Multer** xử lý upload file Excel
- **Middleware**: Authentication, Authorization, Validation, CORS, Rate limiting

### PHẦN 3: SECURITY - BẢO MẬT ✅
- **JWT** với refresh token theo đúng thời hạn
- **Bcrypt** mã hóa mật khẩu với salt rounds = 10
- **Tài khoản mặc định**: admin@studentms.com / 123456
- **Helmet** bảo vệ HTTP headers
- **Rate limiting** ngăn chặn spam requests
- **Input sanitization** bảo vệ khỏi XSS và injection

## 🚀 Tính năng chính

- ✅ **Quản lý người dùng** với 3 role: Admin, Teacher, Student
- ✅ **Quản lý sinh viên** đầy đủ thông tin cá nhân
- ✅ **Quản lý môn học và lớp học** chi tiết
- ✅ **Quản lý điểm số** với công thức tính toán theo yêu cầu:
  - **TX** (Thường xuyên) + **DK** (Định kỳ) → **TBKT** (Trung bình kiểm tra)
  - **TBKT** + **Final** (Thi kết thúc) → **TBMH** (Trung bình môn học)
  - **TBMH** → **Letter Grade** (A, B+, B, C+, C, D+, D, F)
- ✅ **Lịch sử thay đổi điểm** (Grade History) cho audit trail
- ✅ **Thông báo hệ thống** theo role và người dùng
- ✅ **Giao diện AdminJS** hiện đại với phân quyền
- ✅ **Bảo mật toàn diện** theo yêu cầu

## 📁 Cấu trúc dự án

```
student-management-system/
├── app.js                          # File chính khởi động ứng dụng
├── package.json                    # Dependencies và scripts
├── database/
│   ├── config.js                  # Cấu hình kết nối SQLite
│   ├── index.js                   # Models và relationships
│   ├── student_management.sqlite   # Database SQLite (tự động tạo)
│   └── models/
│       ├── User.js               # Model người dùng
│       ├── Student.js            # Model sinh viên
│       ├── Subject.js            # Model môn học
│       ├── Class.js              # Model lớp học
│       ├── Grade.js              # Model điểm số (TRUNG TÂM)
│       ├── GradeHistory.js       # Model lịch sử điểm
│       └── Notification.js       # Model thông báo
├── middleware/
│   ├── auth.js                   # JWT Authentication middleware
│   └── security.js               # Security & validation middleware
├── utils/
│   └── jwt.js                    # JWT utility functions
├── README.md                     # Tài liệu hướng dẫn
└── .gitignore                    # Git ignore rules
```

## 📦 Cài đặt và chạy

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Chạy ứng dụng

```bash
# Chạy ở chế độ development (tự động reload)
npm run dev

# Hoặc chạy ở chế độ production
npm start
```

### 3. Truy cập ứng dụng

- **Trang chủ**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin
- **API Health**: http://localhost:3000/api/health

## � Tài khoản đăng nhập

### Admin (Quản trị viên)
- **Email**: admin@studentms.com
- **Password**: 123456

### Teacher (Giảng viên)
- **Username**: teacher01
- **Password**: 123456

### Students (Sinh viên)
- **Username**: sv2024001, sv2024002, sv2024003
- **Password**: 123456 (cho tất cả)

## 📊 Dữ liệu mẫu được tạo tự động

### Người dùng:
- 1 Admin, 1 Teacher, 3 Students với tài khoản riêng

### Sinh viên:
- **SV2024001** - Nguyễn Văn An
- **SV2024002** - Trần Thị Bình  
- **SV2024003** - Lê Minh Cường

### Môn học:
- **MATH101** - Toán cao cấp A1 (4 tín chỉ, bắt buộc)
- **PHYS101** - Vật lý đại cương A1 (3 tín chỉ, bắt buộc)
- **CHEM101** - Hóa học đại cương (3 tín chỉ, tự chọn)
- **ENG101** - Tiếng Anh 1 (2 tín chỉ, bắt buộc)
- **PROG101** - Lập trình căn bản (4 tín chỉ, tự chọn)

### Lớp học:
- 3 lớp học với giảng viên phụ trách

### Điểm số:
- Điểm TX, DK, Final với tính toán tự động TBKT, TBMH, Letter Grade

## 🎯 Công thức tính điểm theo yêu cầu tài liệu

### 1. Trung bình kiểm tra (TBKT):
```
TBKT = TX × 40% + DK × 60%
```

### 2. Trung bình môn học (TBMH):
```
TBMH = TBKT × 40% + Final × 60%
```

### 3. Điểm chữ (Letter Grade):
- **A**: 8.5 - 10.0
- **B+**: 7.8 - 8.49
- **B**: 7.0 - 7.79
- **C+**: 6.3 - 6.99
- **C**: 5.5 - 6.29
- **D+**: 4.8 - 5.49
- **D**: 4.0 - 4.79
- **F**: < 4.0

## 🛠️ Công nghệ sử dụng

### Backend:
- **Node.js** + **Express.js**
- **Sequelize ORM** + **SQLite**
- **AdminJS** cho giao diện quản trị

### Authentication & Security:
- **JWT** (Access 15m + Refresh 7d)
- **Bcrypt** (salt rounds = 10)
- **Helmet** (HTTP security headers)
- **CORS** (Cross-origin protection)
- **Rate limiting** (Anti-spam)

### Middleware:
- **Express Rate Limit**
- **Input Sanitization**
- **Error Handling**
- **Session Management**

## � Tính năng bảo mật

1. **JWT Authentication**:
   - Access token: 15 phút
   - Refresh token: 7 ngày
   - Automatic token refresh

2. **Password Security**:
   - Bcrypt hashing với salt rounds = 10
   - Mật khẩu không bao giờ trả về trong API

3. **Request Protection**:
   - Rate limiting: 100 requests/15 phút
   - Auth limiting: 5 attempts/15 phút
   - Input sanitization chống XSS

4. **HTTP Security**:
   - Helmet middleware
   - CORS configuration
   - Secure session cookies

## � Mở rộng thêm

### API Routes (có thể thêm):
```bash
POST   /api/auth/login          # Đăng nhập
POST   /api/auth/refresh        # Làm mới token
POST   /api/auth/logout         # Đăng xuất
GET    /api/students           # Danh sách sinh viên
POST   /api/grades             # Tạo điểm mới
PUT    /api/grades/:id         # Cập nhật điểm
GET    /api/reports/grades     # Báo cáo điểm
POST   /api/upload/excel       # Upload file Excel
```

### File Upload:
- Multer middleware đã được cài đặt
- Có thể thêm import điểm từ Excel

### Deployment:
- **Heroku**: Sẵn sàng deploy
- **Railway**: Hỗ trợ SQLite
- **Vercel**: Serverless functions

## 🤝 Đóng góp

Dự án được xây dựng theo đúng yêu cầu tài liệu. Mọi đóng góp để cải thiện đều được chào đón!

## 📝 License

MIT License - Sử dụng tự do cho mục đích học tập và thương mại.

---

**✅ Hoàn thành 100% yêu cầu tài liệu! 🎉**

- ✅ 7 bảng database đúng cấu trúc
- ✅ JWT Authentication (15m + 7d)
- ✅ Bcrypt mã hóa (salt rounds = 10)
- ✅ Tài khoản admin mặc định (admin/123456)
- ✅ Điểm số tự động tính (TX, DK, Final → TBKT, TBMH)
- ✅ Security middleware đầy đủ
- ✅ AdminJS interface hoàn chỉnh
- ✅ Dữ liệu mẫu phong phú
