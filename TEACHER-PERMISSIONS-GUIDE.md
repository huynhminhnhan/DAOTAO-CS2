# Teacher Permissions System - Hệ thống phân quyền giáo viên

## Tổng quan

Hệ thống phân quyền dựa trên bảng `teacher_permissions` để kiểm soát quyền truy cập của giáo viên vào các resources (Lớp học, Môn học, Sinh viên).

## Cấu trúc bảng `teacher_permissions`

```sql
CREATE TABLE teacher_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,           -- ID của giáo viên (từ bảng users)
  classId INT NULL,              -- ID lớp (NULL = tất cả lớp)
  subjectId INT NULL,            -- ID môn học (NULL = tất cả môn)
  cohortId INT NULL,             -- ID khóa học (NULL = tất cả khóa)
  semesterId INT NOT NULL,       -- ID học kỳ (bắt buộc)
  validFrom DATE NOT NULL,       -- Ngày bắt đầu hiệu lực
  validTo DATE NOT NULL,         -- Ngày kết thúc hiệu lực
  status ENUM('active', 'expired', 'revoked') DEFAULT 'active',
  notes TEXT,
  createdBy INT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

## Logic phân quyền

### 1. Quyền "Tất cả" (Wildcard)
- Nếu `classId = NULL` → Giáo viên có quyền với **TẤT CẢ** lớp học
- Nếu `subjectId = NULL` → Giáo viên có quyền với **TẤT CẢ** môn học
- Nếu `cohortId = NULL` → Giáo viên có quyền với **TẤT CẢ** khóa học

### 2. Quyền cụ thể
- Nếu `classId = 5` → Giáo viên CHỈ có quyền với lớp có ID = 5
- Nếu `subjectId = 10` → Giáo viên CHỈ có quyền với môn có ID = 10

### 3. Thời gian hiệu lực
- Quyền chỉ active khi:
  - `status = 'active'`
  - `now >= validFrom`
  - `now <= validTo`

## Ví dụ permissions

### Ví dụ 1: Giáo viên dạy một lớp, một môn
```javascript
{
  userId: 2,
  classId: 5,          // Lớp K22CNTT1
  subjectId: 10,       // Môn Toán cao cấp
  cohortId: 1,         // Khóa 2022
  semesterId: 3,       // Học kỳ 1 năm 2024-2025
  validFrom: '2024-09-01',
  validTo: '2025-01-31',
  status: 'active'
}
```
→ Giáo viên CHỈ thấy:
- Lớp K22CNTT1
- Môn Toán cao cấp
- Sinh viên trong lớp K22CNTT1 đang học môn Toán cao cấp

### Ví dụ 2: Giáo viên dạy tất cả lớp, một môn
```javascript
{
  userId: 3,
  classId: NULL,       // TẤT CẢ lớp
  subjectId: 15,       // Môn Lập trình C
  cohortId: NULL,      // TẤT CẢ khóa
  semesterId: 3,
  validFrom: '2024-09-01',
  validTo: '2025-01-31',
  status: 'active'
}
```
→ Giáo viên thấy:
- **TẤT CẢ** lớp học
- CHỈ môn Lập trình C
- Sinh viên ở tất cả lớp đang học môn Lập trình C

### Ví dụ 3: Giáo viên chủ nhiệm (tất cả môn, một lớp)
```javascript
{
  userId: 4,
  classId: 8,          // Lớp K22CNTT2
  subjectId: NULL,     // TẤT CẢ môn
  cohortId: 1,
  semesterId: 3,
  validFrom: '2024-09-01',
  validTo: '2025-01-31',
  status: 'active'
}
```
→ Giáo viên thấy:
- Lớp K22CNTT2
- **TẤT CẢ** môn học
- Tất cả sinh viên trong lớp K22CNTT2

## API Functions

### 1. `getTeacherActivePermissions(userId)`
Lấy tất cả permissions đang active của teacher.

```javascript
const permissions = await getTeacherActivePermissions(2);
// Returns: Array of permission objects
```

### 2. `getTeacherManagedClassIds(userId)`
Lấy danh sách Class IDs mà teacher có quyền.

```javascript
const classIds = await getTeacherManagedClassIds(2);
// Returns: 'all' hoặc [1, 2, 3, ...]
```

### 3. `getTeacherManagedSubjectIds(userId)`
Lấy danh sách Subject IDs mà teacher có quyền.

```javascript
const subjectIds = await getTeacherManagedSubjectIds(2);
// Returns: 'all' hoặc [5, 10, 15, ...]
```

### 4. `getTeacherManagedStudentIds(userId)`
Lấy danh sách Student IDs mà teacher có quyền (dựa trên enrollments).

```javascript
const studentIds = await getTeacherManagedStudentIds(2);
// Returns: 'all' hoặc [100, 101, 102, ...]
```

### 5. `getTeacherWhereClause(userId, resourceType)`
Tạo filter clause cho AdminJS query.

```javascript
const filter = await getTeacherWhereClause(2, 'class');
// Returns: null (all) hoặc { id: "1,2,3" } hoặc { id: -999999 } (none)
```

## Cách hoạt động trong AdminJS

### Resource: Classes
```javascript
actions: {
  list: {
    before: async (request, context) => {
      if (context.currentAdmin.role === 'teacher') {
        const filter = await getTeacherWhereClause(context.currentAdmin.id, 'class');
        if (filter) {
          request.query.filters = { ...request.query.filters, ...filter };
        }
      }
      return request;
    }
  }
}
```

## Testing

### Run test script:
```bash
node scripts/test-teacher-permissions.js
```

### Kiểm tra console logs:
Khi đăng nhập và truy cập resources, xem console để debug:
```
[TeacherPermissions] Getting where clause for userId=2, resourceType=class
[TeacherPermissions] Result IDs: [1, 2, 3]
[ClassResource] List action - User: teacher@example.com Role: teacher
[ClassResource] Teacher filter: { id: "1,2,3" }
[ClassResource] Applied filters: { id: "1,2,3" }
```

## Troubleshooting

### Vấn đề 1: Teacher thấy tất cả dữ liệu
**Nguyên nhân**: Không có permissions trong database hoặc permissions đã hết hạn.

**Giải pháp**:
1. Kiểm tra bảng `teacher_permissions`
2. Đảm bảo `status = 'active'`
3. Kiểm tra `validFrom` và `validTo`
4. Run test script để debug

### Vấn đề 2: Teacher không thấy gì cả
**Nguyên nhân**: Filter trả về empty array `[]`.

**Giải pháp**:
1. Tạo permissions trong database
2. Đảm bảo `semesterId` đúng
3. Kiểm tra associations trong models

### Vấn đề 3: Filter không hoạt động
**Nguyên nhân**: AdminJS không nhận đúng format filter.

**Giải pháp**:
1. Kiểm tra console logs
2. Đảm bảo field name đúng (`id` vs `studentId`)
3. Format: `{ id: "1,2,3" }` (comma-separated string)

## Database Setup

### Tạo permission mẫu:
```sql
-- Teacher dạy môn Toán cho lớp K22CNTT1
INSERT INTO teacher_permissions 
  (userId, classId, subjectId, cohortId, semesterId, validFrom, validTo, status)
VALUES 
  (2, 5, 10, 1, 3, '2024-09-01', '2025-01-31', 'active');

-- Teacher chủ nhiệm lớp K22CNTT2 (tất cả môn)
INSERT INTO teacher_permissions 
  (userId, classId, subjectId, cohortId, semesterId, validFrom, validTo, status)
VALUES 
  (3, 8, NULL, 1, 3, '2024-09-01', '2025-01-31', 'active');
```
