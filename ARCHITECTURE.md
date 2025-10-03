# Student Management System - AdminJS Official Template Architecture

Hệ thống quản lý điểm sinh viên được cấu trúc lại theo AdminJS Official Template Architecture.

## 🏗️ Cấu trúc Folder (AdminJS Template)

```
student-management-system/
├── src/
│   ├── config/                    # Cấu hình hệ thống
│   │   ├── adminjs.config.js      # Cấu hình AdminJS chính
│   │   └── server.config.js       # Cấu hình Express server
│   │
│   ├── resources/                 # Resource configurations
│   │   ├── user.resource.js       # User resource config
│   │   ├── student.resource.js    # Student resource config
│   │   ├── subject.resource.js    # Subject resource config  
│   │   ├── class.resource.js      # Class resource config
│   │   ├── grade.resource.js      # Grade resource với auto-calculation
│   │   ├── grade-history.resource.js # Grade history tracking
│   │   └── notification.resource.js  # Notification system
│   │
│   ├── backend/                   # Backend services
│   │   ├── database/              # Database models và connections
│   │   ├── middleware/            # Custom middleware
│   │   ├── controllers/           # API controllers (future)
│   │   ├── services/              # Business logic services (future)
│   │   └── utils/                 # Utility functions
│   │
│   └── frontend/                  # Frontend components (future)
│       └── components/            # React components
│
├── app.js                         # Main application entry
├── package.json                   # Dependencies và scripts
└── README.md                      # Documentation
```

## 🚀 Tính năng chính

### ✅ Modular Architecture
- **src/config/**: Tách biệt cấu hình AdminJS và server
- **src/resources/**: Mỗi resource một file riêng với cấu hình đầy đủ
- **src/backend/**: Tổ chức backend theo pattern MVC
- **Scalable**: Dễ dàng thêm resource và tính năng mới

### ✅ Resource Management
- **User Resource**: Quản lý người dùng với phân quyền
- **Student Resource**: Thông tin sinh viên
- **Subject Resource**: Môn học với tín chỉ
- **Class Resource**: Lớp học theo học kỳ
- **Grade Resource**: Điểm số với tự động tính toán
- **Grade History**: Lịch sử thay đổi điểm
- **Notification**: Hệ thống thông báo

### ✅ Auto-Calculation Engine
```
TX Score (40%) + DK Score (60%) = TBKT Score
TBKT Score (40%) + Final Score (60%) = TBMH Score
TBMH Score → Letter Grade (A, B+, B, C+, C, D+, D, F)
```

### ✅ Vietnamese Localization
- Toàn bộ interface bằng tiếng Việt
- Dropdown options với label tiếng Việt
- Resource names và descriptions địa phương hóa

### ✅ Advanced Features
- **Parent Grouping**: Resources được nhóm theo chủ đề
- **Custom Actions**: Bulk operations và custom handlers
- **Role-based Visibility**: Phân quyền xem/sửa theo role
- **Validation**: Input validation và business rules
- **History Tracking**: Audit trail cho các thay đổi quan trọng

## 🛠️ Cài đặt và Chạy

```bash
# Clone repository
git clone <repository-url>
cd student-management-system

# Install dependencies
npm install

# Start development server
npm start

# Access AdminJS
http://localhost:3000/admin
```

## 🔐 Tài khoản đăng nhập

```
Email: admin@studentms.com
Password: 123456
```

## 📋 Resources Overview

| Resource | File | Mục đích |
|----------|------|----------|
| User | `user.resource.js` | Quản lý người dùng, phân quyền |
| Student | `student.resource.js` | Thông tin sinh viên |
| Subject | `subject.resource.js` | Môn học, tín chỉ |
| Class | `class.resource.js` | Lớp học, học kỳ |
| Grade | `grade.resource.js` | Điểm số, tự động tính |
| GradeHistory | `grade-history.resource.js` | Lịch sử thay đổi |
| Notification | `notification.resource.js` | Thông báo hệ thống |

## 🏆 Ưu điểm Architecture

1. **Separation of Concerns**: Mỗi file có trách nhiệm rõ ràng
2. **Maintainability**: Dễ bảo trì và cập nhật
3. **Scalability**: Dễ mở rộng thêm tính năng
4. **Code Reusability**: Tái sử dụng code hiệu quả
5. **Team Collaboration**: Nhiều developer có thể làm việc đồng thời
6. **Standard Compliance**: Tuân thủ AdminJS best practices

## 🔄 Migration từ cấu trúc cũ

Đã thực hiện:
- ✅ Tạo cấu trúc folder theo AdminJS template
- ✅ Tách config AdminJS và server thành file riêng
- ✅ Tạo 7 resource files với cấu hình đầy đủ
- ✅ Di chuyển database models vào src/backend/
- ✅ Cập nhật app.js sử dụng modular imports
- ✅ Giữ nguyên tính năng auto-calculation
- ✅ Maintain Vietnamese localization

## 📝 Next Steps (Tương lai)

- [ ] Tạo controllers cho API endpoints
- [ ] Thêm services layer cho business logic
- [ ] Tạo React components tùy chỉnh
- [ ] Thêm middleware authentication/authorization
- [ ] Unit tests cho từng module
- [ ] API documentation với Swagger

---

*Được xây dựng theo AdminJS Official Template: https://github.com/SoftwareBrothers/adminjs*
