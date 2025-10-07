# Teacher Permission System - Implementation Summary

## 📋 Tổng quan

Hệ thống quản lý quyền nhập điểm cho giảng viên đã được triển khai thành công từ **Bước 1-6**.

## ✅ Các bước đã hoàn thành

### **BƯỚC 1: Database Migration** ✅
- ✅ Tạo bảng `teacher_permissions` với đầy đủ foreign keys
- ✅ Tạo bảng `permission_audit_logs` để tracking
- ✅ Chạy migration thành công: `node scripts/create-teacher-permissions-table.js`

**File:** `scripts/create-teacher-permissions-table.js`

**Cấu trúc bảng:**
```sql
teacher_permissions:
  - id (PK)
  - userId (FK → users.id)
  - classId (FK → Classes.id, NULL = tất cả)
  - subjectId (FK → Subjects.id, NULL = tất cả)
  - cohortId (FK → Cohorts.cohort_id, NULL = tất cả)
  - semesterId (FK → Semesters.semester_id, bắt buộc)
  - validFrom (DATE)
  - validTo (DATE)
  - status (ENUM: active/expired/revoked)
  - notes (TEXT)
  - createdBy (FK → users.id)
  - timestamps
```

---

### **BƯỚC 2: Sequelize Model** ✅
- ✅ Tạo model `TeacherPermission.js` với ES modules
- ✅ Định nghĩa associations với User, Class, Subject, Cohort, Semester
- ✅ Thêm instance methods: `isActive()`, `isExpired()`, `getScopeDescription()`
- ✅ Thêm class methods: `getActivePermissions()`, `checkPermission()`
- ✅ Import vào `src/backend/database/index.js`

**File:** `src/backend/database/models/TeacherPermission.js`

**Key Features:**
- NULL-based filtering (NULL = "tất cả")
- Auto-update status trong hooks
- Validation ngày tháng
- Foreign key references đúng tên bảng và cột

---

### **BƯỚC 3: Service Layer** ✅
- ✅ Tạo `TeacherPermissionService.js` với ES modules
- ✅ Implement các methods:
  - `checkGradeEntryPermission(userId, enrollmentId)` - Kiểm tra quyền cho 1 enrollment
  - `getPermittedEnrollments(userId, filters)` - Lấy danh sách enrollments có quyền
  - `createPermission(permissionData, createdBy)` - Tạo quyền mới
  - `updatePermission(permissionId, updateData)` - Cập nhật quyền
  - `revokePermission(permissionId)` - Thu hồi quyền
  - `getUserPermissions(userId, status)` - Lấy danh sách quyền của user
  - `checkAndUpdateExpiredPermissions()` - Tự động cập nhật quyền hết hạn

**File:** `src/services/TeacherPermissionService.js`

**Query Logic:**
```javascript
// Build điều kiện OR cho từng permission
const permissionConditions = permissions.map(perm => ({
  semesterId: perm.semesterId, // Luôn phải match
  ...(perm.classId && { classId: perm.classId }),
  ...(perm.subjectId && { subjectId: perm.subjectId }),
  ...(perm.cohortId && { cohortId: perm.cohortId })
}));

// Query enrollments
Enrollment.findAll({
  where: {
    status: 'active',
    [Op.or]: permissionConditions
  }
});
```

---

### **BƯỚC 4: Middleware** ✅
- ✅ Tạo `checkTeacherPermission.js` với 3 middlewares:
  1. `checkGradeEntryPermission` - Kiểm tra quyền cho enrollment cụ thể
  2. `checkHasAnyPermission` - Kiểm tra user có ít nhất 1 quyền
  3. `checkIsTeacher` - Kiểm tra role = teacher

**File:** `src/middleware/checkTeacherPermission.js`

**Usage:**
```javascript
// Protect grade update routes
router.put('/grades/:enrollmentId', checkGradeEntryPermission, controller.update);

// Protect list routes
router.get('/permitted-enrollments', checkHasAnyPermission, controller.list);

// Protect teacher-only routes
router.get('/my-permissions', checkIsTeacher, controller.myPermissions);
```

---

### **BƯỚC 5: AdminJS Resource** ✅
- ✅ Tạo `teacherPermission.resource.js`
- ✅ Cấu hình properties với validation
- ✅ Sử dụng DatePicker components (DatePickerFlatpickr, DateShowDDMMYYYY)
- ✅ Thêm custom actions: `checkExpired`
- ✅ Import vào `src/config/adminjs-v7.config.js`

**File:** `src/resources/teacherPermission.resource.js`

**UI trong AdminJS:**
```
Quản lý quyền (Navigation menu)
├─ List: Danh sách quyền đã gán
├─ New: Form tạo quyền mới
│   ├─ User (dropdown - reference)
│   ├─ Semester (dropdown - required)
│   ├─ Class (dropdown - optional)
│   ├─ Subject (dropdown - optional)
│   ├─ Cohort (dropdown - optional)
│   ├─ Valid From (date picker)
│   ├─ Valid To (date picker)
│   ├─ Status (active/expired/revoked)
│   └─ Notes (textarea)
├─ Edit: Sửa quyền
├─ Show: Xem chi tiết quyền
└─ Actions:
    └─ Check Expired: Tự động cập nhật quyền hết hạn
```

---

### **BƯỚC 6: API Routes** ✅
- ✅ Tạo `teacher-permission.routes.js` với 4 endpoints:
  1. `GET /api/teacher-permissions/my-permissions` - Lấy quyền của user
  2. `GET /api/teacher-permissions/permitted-enrollments` - Lấy enrollments có quyền
  3. `GET /api/teacher-permissions/check/:enrollmentId` - Kiểm tra quyền
  4. `GET /api/teacher-permissions/stats` - Thống kê quyền
- ✅ Thêm routes vào `app.js`

**File:** `src/routes/teacher-permission.routes.js`

**API Endpoints:**
```
GET /api/teacher-permissions/my-permissions?status=active
Response: {
  success: true,
  data: [
    {
      id: 1,
      userId: 2,
      classId: 1,
      subjectId: 3,
      semesterId: 1,
      validFrom: "2025-01-01",
      validTo: "2025-06-30",
      status: "active",
      Class: { id: 1, className: "CNTT2024" },
      Subject: { id: 3, subjectName: "Lập trình Web" },
      Semester: { semester_id: 1, semesterName: "HK1 2024-25" }
    }
  ],
  count: 1
}

GET /api/teacher-permissions/permitted-enrollments?semesterId=1&classId=1
Response: {
  success: true,
  data: [...enrollments với đầy đủ Student, Class, Subject, Grade...],
  count: 30
}

GET /api/teacher-permissions/check/123
Response: {
  success: true,
  hasPermission: true,
  enrollmentId: 123
}

GET /api/teacher-permissions/stats
Response: {
  success: true,
  stats: {
    totalPermissions: 5,
    uniqueClasses: 2,
    uniqueSubjects: 3,
    uniqueSemesters: 1
  }
}
```

---

## 🎯 Workflow hoàn chỉnh

### **1. Admin gán quyền cho giảng viên**
```
1. Vào AdminJS → Quản lý quyền → New
2. Chọn User (giảng viên)
3. Chọn Semester (HK1 2024-25)
4. Chọn Class (CNTT2024) hoặc để trống = tất cả lớp
5. Chọn Subject (Lập trình Web) hoặc để trống = tất cả môn
6. Chọn Valid From/To
7. Save → Record được tạo trong teacher_permissions
```

### **2. Giảng viên login và nhập điểm**
```
Frontend (sẽ triển khai sau):
1. Login → JWT token
2. Call GET /api/teacher-permissions/permitted-enrollments?semesterId=1
3. Backend:
   - Middleware checkHasAnyPermission: Kiểm tra user có quyền không
   - Service getPermittedEnrollments: Query enrollments theo permissions
   - Return danh sách enrollments có quyền
4. Frontend hiển thị danh sách sinh viên có thể nhập điểm

Khi update điểm:
1. Call PUT /api/grades/:enrollmentId
2. Middleware checkGradeEntryPermission: Kiểm tra quyền cho enrollment này
3. Nếu có quyền → cho phép update
4. Nếu không → 403 Forbidden
```

### **3. Auto-expire quyền hết hạn (Cron job - tùy chọn)**
```javascript
// Chạy mỗi ngày lúc 00:00
import cron from 'node-cron';
import TeacherPermissionService from './src/services/TeacherPermissionService.js';

cron.schedule('0 0 * * *', async () => {
  await TeacherPermissionService.checkAndUpdateExpiredPermissions();
  console.log('✅ Đã cập nhật quyền hết hạn');
});
```

---

## 📂 File Structure

```
student-management-system/
├── scripts/
│   └── create-teacher-permissions-table.js  ✅ Migration
│
├── src/
│   ├── backend/database/models/
│   │   ├── TeacherPermission.js            ✅ Model
│   │   └── index.js                        ✅ Updated
│   │
│   ├── services/
│   │   └── TeacherPermissionService.js     ✅ Service
│   │
│   ├── middleware/
│   │   └── checkTeacherPermission.js       ✅ Middleware
│   │
│   ├── routes/
│   │   ├── teacher-permission.routes.js    ✅ Routes
│   │   └── grade-update.routes.js          ✅ Updated
│   │
│   ├── resources/
│   │   └── teacherPermission.resource.js   ✅ AdminJS Resource
│   │
│   └── config/
│       └── adminjs-v7.config.js            ✅ Updated
│
└── app.js                                   ✅ Updated
```

---

## 🧪 Testing

### **Test 1: Tạo quyền trong AdminJS**
```
1. Truy cập: http://localhost:3000/admin
2. Login: admin@university.edu.vn / 123456
3. Vào menu "Quản lý quyền"
4. Click "Create new"
5. Điền form:
   - User: Chọn giảng viên
   - Semester: Chọn HK1
   - Class: Chọn lớp hoặc để trống
   - Subject: Chọn môn hoặc để trống
   - Valid From: 2025-01-01
   - Valid To: 2025-06-30
6. Save → Kiểm tra record đã tạo
```

### **Test 2: API endpoints**
```bash
# Lấy danh sách quyền
curl http://localhost:3000/api/teacher-permissions/my-permissions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Lấy enrollments có quyền
curl http://localhost:3000/api/teacher-permissions/permitted-enrollments?semesterId=1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Kiểm tra quyền cho enrollment
curl http://localhost:3000/api/teacher-permissions/check/123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **Test 3: Check database**
```sql
-- Xem quyền đã tạo
SELECT 
  tp.*,
  u.email as user_email,
  c.className,
  s.subjectName,
  sem.semesterName
FROM teacher_permissions tp
LEFT JOIN users u ON tp.userId = u.id
LEFT JOIN Classes c ON tp.classId = c.id
LEFT JOIN Subjects s ON tp.subjectId = s.id
LEFT JOIN Semesters sem ON tp.semesterId = sem.semester_id;

-- Kiểm tra audit logs
SELECT * FROM permission_audit_logs;
```

---

## 🚀 Next Steps (Frontend Integration)

### **Bước 7: Frontend Integration** (chưa làm)

Cần tạo/sửa các components sau:

1. **GradeEntryPageComponent.jsx** - Sửa để load enrollments từ API có permission
   ```javascript
   // Thay vì load tất cả enrollments
   const response = await fetch('/api/teacher-permissions/permitted-enrollments?semesterId=1');
   const { data: enrollments } = await response.json();
   ```

2. **TeacherDashboard.jsx** (tùy chọn) - Dashboard cho giảng viên
   ```javascript
   // Hiển thị thống kê quyền
   const stats = await fetch('/api/teacher-permissions/stats');
   // Hiển thị danh sách lớp/môn được gán
   ```

3. **Permission Guard** - Component kiểm tra quyền trước khi render
   ```javascript
   <PermissionGuard enrollmentId={123}>
     <GradeInputField />
   </PermissionGuard>
   ```

---

## 📝 Notes

### **Lưu ý quan trọng:**
1. ✅ Middleware `checkTeacherPermission` đã sẵn sàng nhưng **chưa được apply** vào grade update routes
2. ✅ Frontend chưa tích hợp - vẫn load tất cả enrollments
3. ✅ Cần thêm JWT authentication middleware vào API routes
4. ✅ Cron job auto-expire chưa được setup (tùy chọn)

### **Security considerations:**
- Middleware kiểm tra quyền ở cả API level và Service level
- Foreign key constraints đảm bảo data integrity
- Status tracking (active/expired/revoked) cho audit trail
- Audit logs table sẵn sàng để tracking changes

### **Performance:**
- Indexes được tạo cho các query thường dùng
- NULL-based filtering giảm số records cần tạo
- Eager loading associations để giảm N+1 queries

---

## ✅ Summary

**Đã hoàn thành:**
- ✅ Database schema (2 bảng)
- ✅ Sequelize model với associations
- ✅ Service layer với 7 methods
- ✅ Middleware với 3 guards
- ✅ AdminJS resource với CRUD
- ✅ API routes với 4 endpoints
- ✅ Integration vào app.js

**Chưa làm (theo yêu cầu):**
- ⏳ Frontend integration (GradeEntryPage)
- ⏳ Apply middleware vào grade routes
- ⏳ Cron job auto-expire
- ⏳ Testing end-to-end

**Server status:** ✅ Đang chạy thành công tại http://localhost:3000

---

Generated: 2025-01-07
