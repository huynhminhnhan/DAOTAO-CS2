# Routes Directory

## Cấu trúc Routes

Tất cả routes được quản lý tập trung từ file `index.js`.

## File chính

- **`index.js`** - Route Manager tập trung
  - Setup tất cả routes
  - Quản lý authentication middleware
  - Xử lý error handlers

## Các route modules

### Authentication
- `admin-api.routes.js` - AdminJS session-based routes

### Student Management
- `student-import.routes.js` - Import sinh viên từ Excel

### Grade Management
- `grade.routes.js` - Quản lý điểm chính
- `grade-update.routes.js` - Cập nhật điểm thi lại
- `grade-history.routes.js` - Lịch sử thay đổi điểm

### Enrollment
- `bulk-enrollment.routes.js` - Đăng ký môn học hàng loạt

### Retake System
- `retake.routes.js` - Legacy retake routes
- `retake-management.routes.js` - Hệ thống thi lại mới
- `retake-scoring.routes.js` - Nhập điểm thi lại

### Academic Data
- `academic.routes.js` - Khóa học, học kỳ
- `subjects.routes.js` - Môn học

### Transcripts
- `student-transcript.routes.js` - Bảng điểm sinh viên

### Permissions
- `teacher-permission.routes.js` - Quyền giảng viên

## Cách sử dụng

### Trong app.js
```javascript
import { setupRoutes } from './src/routes/index.js';
await setupRoutes(app);
```

### Thêm route mới

1. Tạo file mới: `src/routes/your-feature.routes.js`
2. Import trong `index.js`:
```javascript
const yourFeatureRoutes = (await import('./your-feature.routes.js')).default;
app.use('/api/your-feature', yourFeatureRoutes);
```

## Authentication

- **JWT** (`/api/*`): Yêu cầu token trong header
- **Session** (`/admin-api/*`): Yêu cầu AdminJS session

## Xem thêm

- [ROUTE-STRUCTURE-REFACTORED.md](../ROUTE-STRUCTURE-REFACTORED.md) - Tài liệu chi tiết
