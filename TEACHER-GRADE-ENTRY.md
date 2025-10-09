# 👨‍🏫 Teacher Grade Entry Component - Nhập Điểm TX & ĐK

## 📋 Tổng quan

Component dành riêng cho **giáo viên** để nhập điểm **Thường Xuyên (TX)** và **Điều Kiện (ĐK)**. Giáo viên **KHÔNG** có quyền nhập điểm thi cuối kỳ (Final Score).

## 🎯 Tính năng chính

### ✅ Chức năng được phép:
1. **Chọn Khóa học** - Chỉ hiển thị các khóa mà giáo viên được phân công
2. **Chọn Lớp học** - Filter theo khóa đã chọn và quyền của giáo viên
3. **Chọn Môn học** - Theo lớp đã chọn và quyền của giáo viên
4. **Nhập điểm TX** (Thường Xuyên) - Dynamic columns (1-10 cột)
5. **Nhập điểm ĐK** (Điều Kiện) - Dynamic columns (1-10 cột)
6. **Xem TBKT** - Tự động tính toán: `TX × 40% + ĐK × 60%`
7. **Nhập ghi chú** cho từng sinh viên

### ❌ Chức năng KHÔNG được phép:
1. **Nhập điểm Thi Cuối Kỳ** - Chỉ Admin mới có quyền
2. **Xem/Nhập TBMH** - Chỉ tính khi có điểm thi (do Admin nhập)
3. **Nhập điểm cho lớp không được phân công**

## 🏗️ Kiến trúc

### Files liên quan:

```
src/
├── components/
│   └── TeacherGradeEntryComponent.jsx    # Main component
├── config/
│   ├── components.js                      # Component registration
│   ├── pages.config.js                    # Page configuration
│   └── locale.config.js                   # Vietnamese translation
└── routes/
    └── admin-api.routes.js                # API endpoints
```

### API Endpoints:

#### 1. Get Current User
```http
GET /admin-api/auth/current-user
Authorization: AdminJS Session Required

Response:
{
  "success": true,
  "user": {
    "id": 2,
    "email": "teacher@example.com",
    "username": "teacher",
    "role": "teacher"
  }
}
```

#### 2. Get Teacher's Cohorts
```http
GET /admin-api/teacher-permissions/my-cohorts
Authorization: AdminJS Session Required

Response:
{
  "success": true,
  "data": [
    {
      "cohortId": 1,
      "name": "K22CNTT",
      "startYear": 2022,
      "endYear": 2026,
      "description": "Khóa 22 Công nghệ thông tin"
    }
  ]
}
```

#### 3. Get Teacher's Classes by Cohort
```http
GET /admin-api/teacher-permissions/my-classes/:cohortId
Authorization: AdminJS Session Required

Response:
{
  "success": true,
  "data": [
    {
      "id": 12,
      "className": "22CNTT1",
      "classCode": "22CNTT1",
      "academicYear": "2024-25",
      "semester": "HK1",
      "cohortId": 1
    }
  ]
}
```

#### 4. Get Enrolled Students
```http
GET /admin-api/grade/enrolled-students?cohortId=1&classId=12&subjectId=5&semester=HK1&academicYear=2024-25
Authorization: AdminJS Session Required

Response:
{
  "success": true,
  "data": [
    {
      "studentId": 10,
      "studentCode": "22410001",
      "studentName": "Nguyễn Văn A",
      "enrollmentId": 100,
      "txScore": {"tx1": "8.5", "tx2": "9.0"},
      "dkScore": {"dk1": "8.0"},
      "tbktScore": 8.5,
      "gradeId": 50
    }
  ]
}
```

#### 5. Save Grades (Bulk)
```http
POST /admin-api/grade/save-bulk
Authorization: AdminJS Session Required
Content-Type: application/json

Request Body:
{
  "grades": [
    {
      "studentId": 10,
      "enrollmentId": 100,
      "cohortId": 1,
      "classId": 12,
      "subjectId": 5,
      "txScore": {"tx1": "8.5", "tx2": "9.0"},
      "dkScore": {"dk1": "8.0"},
      "finalScore": null,
      "tbktScore": 8.5,
      "tbmhScore": null,
      "notes": "",
      "semester": "HK1",
      "academicYear": "2024-25"
    }
  ],
  "cohortId": 1,
  "classId": 12,
  "subjectId": 5
}

Response:
{
  "success": true,
  "message": "Grades saved successfully"
}
```

## 🔒 Bảo mật & Phân quyền

### Teacher Permission Logic:

1. **Load Cohorts:**
   - Lấy tất cả `TeacherPermission` với `userId = currentUser.id` và `status = 'active'`
   - Filter theo `validFrom <= now <= validTo`
   - Lấy unique `classId` → tìm unique `cohortId`

2. **Load Classes:**
   - Filter classes theo `cohortId` đã chọn
   - Chỉ hiển thị classes mà teacher có permission

3. **Load Students:**
   - Chỉ load students trong enrollments của (cohort, class, subject) đã chọn
   - Sử dụng existing endpoint `/admin-api/grade/enrolled-students`

4. **Save Grades:**
   - `finalScore` và `tbmhScore` luôn = `null` (teacher không được nhập)
   - Chỉ save `txScore`, `dkScore`, `tbktScore`, `notes`

## 📊 Database Schema

### TeacherPermission Table:
```sql
CREATE TABLE TeacherPermissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,              -- Teacher's user ID
  classId INT,                      -- NULL = all classes
  subjectId INT,                    -- NULL = all subjects
  validFrom DATE NOT NULL,          -- Start date of permission
  validTo DATE NOT NULL,            -- End date of permission
  status ENUM('active', 'inactive'),
  FOREIGN KEY (userId) REFERENCES Users(id),
  FOREIGN KEY (classId) REFERENCES Classes(id),
  FOREIGN KEY (subjectId) REFERENCES Subjects(id)
);
```

### Grade Table (JSON columns):
```sql
CREATE TABLE Grades (
  gradeId INT PRIMARY KEY AUTO_INCREMENT,
  studentId INT NOT NULL,
  enrollmentId INT NOT NULL,
  cohortId INT NOT NULL,
  classId INT NOT NULL,
  subjectId INT NOT NULL,
  txScore JSON,                     -- {"tx1": "8.5", "tx2": "9.0"}
  dkScore JSON,                     -- {"dk1": "8.0", "dk2": "7.5"}
  finalScore DECIMAL(4,2),          -- NULL for teacher entry
  tbktScore DECIMAL(4,2),           -- Auto-calculated
  tbmhScore DECIMAL(4,2),           -- NULL for teacher entry
  letterGrade VARCHAR(5),
  isPassed BOOLEAN,
  notes TEXT,
  semester VARCHAR(10),
  academicYear VARCHAR(10),
  ...
);
```

## 🎨 UI Components

### 1. Header Section:
```jsx
<div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffc107' }}>
  <h1>👨‍🏫 Nhập Điểm Thường Xuyên & Điều Kiện</h1>
  <ul>
    <li>Giáo viên chỉ được nhập TX và ĐK</li>
    <li>TBKT tự động tính: TX × 40% + ĐK × 60%</li>
    <li>Điểm Thi Cuối Kỳ chỉ do Admin nhập</li>
  </ul>
</div>
```

### 2. Selection Form:
```jsx
<select>Khóa học</select>  // Filter by teacher permission
<select>Lớp học</select>   // Filter by cohort + teacher permission  
<select>Môn học</select>   // Filter by class
```

### 3. Dynamic Column Controls:
```jsx
<div>
  <label>Điểm TX:</label>
  <button onClick={removeTxColumn}>-</button>
  <span>{txColumns}</span>
  <button onClick={addTxColumn}>+</button>
</div>
```

### 4. Grade Table:
```jsx
<table>
  <thead>
    <tr>
      <th>STT</th>
      <th>Mã SV</th>
      <th>Họ tên</th>
      {/* TX Columns */}
      <th>TX1</th> <th>TX2</th> ...
      {/* DK Columns */}
      <th>ĐK1</th> <th>ĐK2</th> ...
      <th>TBKT</th> {/* Read-only, auto-calculated */}
      <th>Ghi chú</th>
    </tr>
  </thead>
  <tbody>
    {students.map(student => (
      <tr>
        <td>{index + 1}</td>
        <td>{student.studentCode}</td>
        <td>{student.fullName}</td>
        {/* TX Inputs */}
        <td><input type="number" min="0" max="10" /></td>
        {/* DK Inputs */}
        <td><input type="number" min="0" max="10" /></td>
        {/* TBKT Display */}
        <td style={{ fontWeight: 'bold' }}>{tbktScore}</td>
        {/* Notes */}
        <td><input type="text" /></td>
      </tr>
    ))}
  </tbody>
</table>
```

## 🧮 Calculation Logic

### TBKT Formula:
```javascript
import { calculateTBKT } from '../utils/gradeCalculation';

// Example:
const txScore = { tx1: "8.5", tx2: "9.0", tx3: "8.0" };
const dkScore = { dk1: "8.0", dk2: "7.5" };

const tbkt = calculateTBKT(txScore, dkScore);
// Calculate average TX: (8.5 + 9.0 + 8.0) / 3 = 8.5
// Calculate average DK: (8.0 + 7.5) / 2 = 7.75
// TBKT = 8.5 * 0.4 + 7.75 * 0.6 = 8.05
```

### Auto-calculation on Input Change:
```javascript
const handleGradeChange = (studentId, field, value, scoreKey) => {
  setGrades(prevGrades => {
    const newGrades = { ...prevGrades };
    
    if (field === 'txScore') {
      newGrades[studentId].txScore[scoreKey] = value;
    } else if (field === 'dkScore') {
      newGrades[studentId].dkScore[scoreKey] = value;
    }
    
    // Auto-calculate TBKT if both TX and DK have data
    const txScore = newGrades[studentId].txScore || {};
    const dkScore = newGrades[studentId].dkScore || {};
    
    const hasTxData = Object.values(txScore).some(v => v !== '' && v !== null);
    const hasDkData = Object.values(dkScore).some(v => v !== '' && v !== null);
    
    if (hasTxData && hasDkData) {
      newGrades[studentId].tbktScore = calculateTBKT(txScore, dkScore);
    }
    
    return newGrades;
  });
};
```

## 🚀 Deployment & Access

### Access URL:
```
http://localhost:3000/admin/pages/teacher-grade-entry
```

### Navigation:
- Trong AdminJS sidebar, sẽ có menu item: **"Nhập điểm TX & ĐK"**
- Chỉ hiển thị khi user có `role = 'teacher'`

### Page Configuration:
```javascript
// src/config/pages.config.js
export const pagesConfig = {
  'teacher-grade-entry': {
    component: Components.TeacherGradeEntry,
    icon: 'Edit',
    handler: async (request, response, context) => {
      const currentAdmin = context.currentAdmin;
      if (!currentAdmin || currentAdmin.role !== 'teacher') {
        return {
          text: 'Access denied. This page is only for teachers.',
        };
      }
      return {};
    }
  }
};
```

## 📝 Usage Example

### Teacher Workflow:

1. **Login** với email giáo viên
2. **Click** "Nhập điểm TX & ĐK" trong sidebar
3. **Chọn** Khóa học (VD: K22CNTT)
4. **Chọn** Lớp học (VD: 22CNTT1)
5. **Chọn** Môn học (VD: Lập trình Web)
6. **Cấu hình** số cột TX và ĐK (nếu cần)
7. **Nhập điểm** TX và ĐK cho từng sinh viên
8. **Xem** TBKT tự động tính
9. **Nhập** ghi chú (nếu có)
10. **Click** "💾 Lưu điểm"

## ⚠️ Important Notes

1. **Teacher KHÔNG được nhập:**
   - Điểm Thi Cuối Kỳ (Final Score)
   - TBMH (Điểm Trung Bình Môn Học)
   - Điểm Chữ (Letter Grade)

2. **TBKT < 5:**
   - Sinh viên không đủ điều kiện thi cuối kỳ
   - Admin cũng không thể nhập điểm thi cho sinh viên này

3. **Permission Validation:**
   - Hệ thống check `validFrom` và `validTo` của permission
   - Nếu permission hết hạn → Teacher không thể load dữ liệu

4. **Dynamic Columns:**
   - Mỗi môn học có thể có số cột TX/ĐK khác nhau
   - Hệ thống tự động detect từ dữ liệu hiện có
   - Teacher có thể thêm/bớt cột khi cần

## 🐛 Troubleshooting

### Issue 1: "Không có lớp nào được phân công"
**Cause:** Teacher chưa được assign permission trong TeacherPermission table  
**Solution:** Admin cần tạo permission cho teacher trong resource "TeacherPermission"

### Issue 2: "Unknown column 'startYear' in field list"
**Cause:** Cohort model dùng `startDate`/`endDate`, không phải `startYear`/`endYear`  
**Solution:** API endpoint đã fix để extract year từ date fields

### Issue 3: TBKT không tự động tính
**Cause:** Thiếu data trong TX hoặc ĐK  
**Solution:** Đảm bảo nhập ít nhất 1 điểm TX và 1 điểm ĐK

### Issue 4: "Not authenticated" error
**Cause:** AdminJS session expired  
**Solution:** Login lại vào AdminJS

## 📚 Related Documentation

- [TEACHER-PERMISSION-IMPLEMENTATION.md](./TEACHER-PERMISSION-IMPLEMENTATION.md) - Teacher permission system
- [TEACHER-PERMISSION-VALIDATION.md](./TEACHER-PERMISSION-VALIDATION.md) - Login validation logic
- [DYNAMIC-GRADE-TABLE.md](./DYNAMIC-GRADE-TABLE.md) - Dynamic TX/DK columns
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall system architecture

## 🎯 Future Enhancements

1. **Export Excel:** Teacher có thể export bảng điểm ra Excel
2. **Import Excel:** Teacher có thể import điểm từ Excel template
3. **Grade History:** Xem lịch sử chỉnh sửa điểm
4. **Notification:** Thông báo khi có sinh viên điểm thấp (TBKT < 5)
5. **Statistics:** Thống kê phân bố điểm theo từng cột TX/ĐK
6. **Batch Actions:** Chọn nhiều sinh viên để thao tác cùng lúc
