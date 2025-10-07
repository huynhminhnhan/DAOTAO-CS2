# Vấn đề: Enrollment không hiển thị ở trang nhập điểm

## 🔍 Triệu chứng

- Đăng ký hàng loạt thành công: "Tất cả 3 sinh viên đã được đăng ký trước đó"
- Database có enrollment records
- Nhưng trang nhập điểm không hiển thị sinh viên

## 🎯 Nguyên nhân

### 1. **Status = NULL trong Enrollments**

**Dữ liệu database:**
```sql
SELECT status FROM Enrollments WHERE class_id = 12 AND subject_id = 6;
-- Kết quả: status = NULL
```

**Query từ trang nhập điểm:**
```javascript
// GradeRepository.findEnrollmentsWithGrades
where: {
  classId: 12,
  subjectId: 6,
  cohortId: 1,
  status: 'active'  // ← Yêu cầu status = 'active'
}
```

**Vấn đề:** Enrollments cũ có `status = NULL`, không match với query `status = 'active'`

### 2. **Format academicYear không khớp**

**Dữ liệu trong Semesters:**
```
academicYear = '2024-2025'
```

**Validation trong Grade model:**
```javascript
academicYear: {
  validate: {
    is: /^\d{4}-\d{2}$/  // Format: YYYY-YY
  }
}
```

**Query từ trang nhập điểm:**
```javascript
// GradeApiService.getEnrolledStudents
academicYear = '2024-25'  // Format: YYYY-YY
```

**Vấn đề:** Database có `2024-2025` nhưng query tìm `2024-25`

## ✅ Giải pháp

### 1. **Fix Status = NULL**

```sql
-- Update tất cả enrollment có status NULL thành active
UPDATE Enrollments 
SET status = 'active' 
WHERE status IS NULL OR status = '';

-- Kết quả: 295 rows affected
```

### 2. **Chuẩn hóa academicYear**

```sql
-- Update tất cả semester về format chuẩn YYYY-YY
UPDATE Semesters 
SET academicYear = '2024-25' 
WHERE academicYear = '2024-2025';

-- Kết quả: 10 rows affected
```

### 3. **Đảm bảo BulkEnrollment luôn set status**

Code trong `BulkEnrollmentService.js` đã đúng:
```javascript
const [enrollment, created] = await Enrollment.findOrCreate({
  where: { ... },
  defaults: {
    ...enrollmentData,
    status: 'active',  // ✅ Đã có
    enrollmentDate: new Date(),
    note: 'Đăng ký hàng loạt qua service'
  }
});
```

## 📊 Kết quả sau fix

### Trước fix:
```sql
SELECT enrollment_id, student_id, status, academicYear 
FROM Enrollments e
LEFT JOIN Semesters s ON e.semester_id = s.semester_id
WHERE class_id = 12 AND subject_id = 6;

-- Kết quả:
-- enrollment_id | student_id | status | academicYear
-- 43            | 10         | NULL   | 2024-2025
-- 169           | 31         | NULL   | 2024-2025
-- 295           | 52         | NULL   | 2024-2025
```

### Sau fix:
```sql
-- Kết quả:
-- enrollment_id | student_id | status  | academicYear
-- 43            | 10         | active  | 2024-25
-- 169           | 31         | active  | 2024-25
-- 295           | 52         | active  | 2024-25
```

### Query từ trang nhập điểm:
```javascript
// Now matches!
where: {
  classId: 12,
  subjectId: 6,
  cohortId: 1,
  status: 'active'  // ✅ Match
}
include: [
  { model: Grade, where: { 
    semester: 'HK1', 
    academicYear: '2024-25'  // ✅ Match
  }}
]
```

## 🧪 Test

### 1. Kiểm tra database:
```sql
-- Kiểm tra enrollment có status active
SELECT e.enrollment_id, e.student_id, s.studentCode, e.status
FROM Enrollments e
INNER JOIN Students s ON e.student_id = s.id
WHERE e.class_id = 12 AND e.subject_id = 6 AND e.status = 'active';
```

### 2. Test trang nhập điểm:
1. Chọn Khóa: K22
2. Chọn Lớp: K22ATTT09 
3. Chọn Môn: Toán cao cấp 2
4. Click "Lấy danh sách"
5. ✅ Kỳ vọng: Hiển thị 3 sinh viên (SV008, SV029, SV050)

### 3. Console log:
```
🔍 GradeRepository.findEnrollmentsWithGrades received: {
  cohortId: '1',
  classId: '12',
  subjectId: '6',
  semester: 'HK1',
  academicYear: '2024-25'
}
✅ Found 3 enrollments
```

## 🚨 Lưu ý cho tương lai

### 1. **Validation nhất quán**
- Database nên validate `status` NOT NULL DEFAULT 'active'
- Database nên validate `academicYear` format YYYY-YY

### 2. **Migration cho dữ liệu cũ**
Tạo migration để fix dữ liệu cũ:
```javascript
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Fix status NULL
    await queryInterface.sequelize.query(`
      UPDATE Enrollments 
      SET status = 'active' 
      WHERE status IS NULL OR status = '';
    `);
    
    // Fix academicYear format
    await queryInterface.sequelize.query(`
      UPDATE Semesters 
      SET academicYear = CONCAT(
        SUBSTRING(academicYear, 1, 4), 
        '-', 
        SUBSTRING(academicYear, 6, 2)
      )
      WHERE academicYear LIKE '%-%-%';
    `);
  }
};
```

### 3. **Thêm constraints**
```sql
ALTER TABLE Enrollments 
MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';

ALTER TABLE Semesters 
ADD CONSTRAINT chk_academic_year 
CHECK (academicYear REGEXP '^[0-9]{4}-[0-9]{2}$');
```

## ✅ Kết luận

Vấn đề đã được fix bằng cách:
1. ✅ Update `status = NULL` → `status = 'active'` (295 records)
2. ✅ Chuẩn hóa `academicYear` về format `YYYY-YY` (10 records)
3. ✅ Code BulkEnrollment đã đúng, không cần sửa

Trang nhập điểm bây giờ sẽ hiển thị đúng sinh viên đã đăng ký!
