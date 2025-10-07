# 🎓 HỆ THỐNG QUẢN LÝ THI LẠI VÀ HỌC LẠI

## 📋 Tổng quan

Hệ thống quản lý thi lại và học lại được thiết kế để tự động xác định và xử lý các trường hợp sinh viên cần thi lại hoặc học lại dựa trên điểm số và quy tắc nghiệp vụ.

## 🎯 Quy tắc nghiệp vụ

### 1. **HỌC LẠI (RETAKE_COURSE)**
- **Điều kiện:** TBKT < 5.0
- **Hành động:** Học lại toàn bộ môn học
- **Chi tiết:** 
  - Tạo Enrollment mới với attempt số mới
  - Nhập lại tất cả điểm: TX, DK, Thi
  - Tính lại TBKT và TBMH từ đầu

### 2. **THI LẠI (RETAKE_EXAM)**
- **Điều kiện:** 
  - TBKT ≥ 5.0 AND Điểm thi < 5.0
  - TBKT ≥ 5.0 AND TBMH < 5.0
- **Hành động:** Chỉ thi lại phần cuối kỳ
- **Chi tiết:**
  - Giữ nguyên điểm TX, DK, TBKT
  - Chỉ nhập lại điểm thi cuối kỳ
  - Tính lại TBMH dựa trên TBKT cũ + điểm thi mới

## 🏗️ Kiến trúc hệ thống

### **Database Models**

#### 1. Grade Model (Điểm gốc)
```javascript
{
  id: INTEGER,
  studentId: INTEGER,
  enrollmentId: INTEGER,
  txScore: JSON,           // {tx1: 8, tx2: 7, ...}
  dkScore: JSON,           // {dk1: 8, dk2: 7, ...}
  finalScore: DECIMAL,     // Điểm thi cuối kỳ
  tbktScore: DECIMAL,      // Trung bình kỹ thuật
  tbmhScore: DECIMAL,      // Trung bình môn học
  attemptNumber: INTEGER,  // Lần thứ mấy (1, 2, 3...)
  retakeType: ENUM,        // RETAKE_EXAM, RETAKE_COURSE
  retakeReason: TEXT       // Lý do thi lại/học lại
}
```

#### 2. GradeRetake Model (Lịch sử thi lại)
```javascript
{
  id: INTEGER,
  originalGradeId: INTEGER,    // Tham chiếu Grade gốc
  studentId: INTEGER,
  subjectId: INTEGER,
  enrollmentId: INTEGER,
  retakeType: ENUM,            // RETAKE_EXAM, RETAKE_COURSE
  attemptNumber: INTEGER,      // 2, 3, 4... (lần thi lại)
  
  // Điểm của lần thi lại này
  txScore: JSON,               // Null nếu RETAKE_EXAM
  dkScore: JSON,               // Null nếu RETAKE_EXAM
  finalScore: DECIMAL,         // Điểm thi lại
  tbktScore: DECIMAL,          // Copy từ gốc nếu RETAKE_EXAM
  tbmhScore: DECIMAL,          // Tính lại
  
  resultStatus: ENUM,          // PASS, FAIL_EXAM, FAIL_TBKT, PENDING
  isCurrent: BOOLEAN,          // Có phải bản ghi hiện tại
  retakeReason: TEXT,
  semester: STRING,
  academicYear: STRING
}
```

#### 3. Enrollment Model (Đăng ký học)
```javascript
{
  enrollmentId: INTEGER,
  studentId: INTEGER,
  classId: INTEGER,
  subjectId: INTEGER,
  attempt: INTEGER,            // 1: lần đầu, 2+: học lại
  status: ENUM                 // active, withdrawn, completed
}
```

### **Service Layer**

#### RetakeManagementService
- `analyzeGradeStatus()` - Phân tích trạng thái điểm
- `createRetakeCourse()` - Tạo đăng ký học lại
- `createRetakeExam()` - Tạo đăng ký thi lại
- `getRetakeHistory()` - Lấy lịch sử thi lại/học lại
- `updateRetakeResult()` - Cập nhật kết quả
- `getStudentsNeedingRetake()` - Lấy danh sách sinh viên cần xử lý

### **API Endpoints**

```
GET    /api/retake-management/analyze/:gradeId
POST   /api/retake-management/create-course
POST   /api/retake-management/create-exam
GET    /api/retake-management/history/:studentId/:subjectId
PUT    /api/retake-management/update-result/:retakeId
GET    /api/retake-management/students-need-retake/:classId/:subjectId
GET    /api/retake-management/stats
POST   /api/retake-management/bulk-create
```

## 🔄 Workflow

### **1. Phân tích tự động**
```javascript
// Khi nhập điểm xong
const analysis = analyzeGradeStatus({
  tbktScore: 4.5,
  finalScore: 6.0,
  tbmhScore: null
});

// Kết quả:
{
  needsAction: true,
  actionType: 'RETAKE_COURSE',
  reason: 'TBKT = 4.5 < 5.0',
  showRetakeButton: true,
  severity: 'HIGH'
}
```

### **2. Tạo đăng ký học lại**
```javascript
// API call
POST /api/retake-management/create-course
{
  originalGradeId: 123,
  studentId: 456,
  subjectId: 789,
  reason: "TBKT = 4.5 < 5.0",
  semester: "HK1",
  academicYear: "2024-25"
}

// Kết quả:
// - Tạo Enrollment mới (attempt = 2)
// - Tạo GradeRetake record
// - Đánh dấu isCurrent = true
```

### **3. Tạo đăng ký thi lại**
```javascript
// API call  
POST /api/retake-management/create-exam
{
  originalGradeId: 123,
  studentId: 456,
  subjectId: 789,
  reason: "Điểm thi = 4.0 < 5.0"
}

// Kết quả:
// - KHÔNG tạo Enrollment mới
// - Tạo GradeRetake record
// - Copy TX, DK, TBKT từ Grade gốc
// - finalScore = null (chờ nhập)
```

## 🎨 Frontend Integration

### **1. RetakeManagementComponent**
```jsx
<RetakeManagementComponent
  student={student}
  gradeData={gradeData}
  subjectId={subjectId}
  onRetakeCreated={handleRetakeCreated}
  showDetails={true}
/>
```

### **2. Trong GradeEntryPageComponent**
```jsx
// Thêm cột mới trong bảng điểm
<th>Thi lại/Học lại</th>

// Trong tbody
<td>
  <RetakeManagementComponent
    student={student}
    gradeData={studentGrade}
    subjectId={selectedSubject}
    onRetakeCreated={() => refreshStudentList()}
  />
</td>
```

## 📊 Báo cáo và thống kê

### **1. Thống kê tổng quan**
```javascript
GET /api/retake-management/stats

// Response:
{
  retakeStats: {
    totalRetakes: 45,
    retakeExamCount: 30,
    retakeCourseCount: 15,
    passCount: 35,
    failCount: 10
  },
  gradesNeedAction: 12
}
```

### **2. Danh sách sinh viên cần xử lý**
```javascript
GET /api/retake-management/students-need-retake/1/2

// Response:
{
  data: [
    {
      student: {...},
      grade: {...},
      analysis: {
        actionType: 'RETAKE_COURSE',
        reason: 'TBKT = 4.2 < 5.0'
      },
      hasActiveRetake: false
    }
  ],
  summary: {
    total: 5,
    needRetakeCourse: 2,
    needRetakeExam: 3
  }
}
```

## 🔧 Cách sử dụng

### **1. Trong Grade Entry Page**
1. Nhập điểm bình thường (TX, DK, Thi)
2. Hệ thống tự động phân tích và hiển thị nút thi lại/học lại nếu cần
3. Click nút để tạo đăng ký thi lại/học lại
4. Xem lịch sử các lần thi lại/học lại

### **2. Quản lý hàng loạt**
```javascript
// Tạo hàng loạt đăng ký thi lại cho nhiều sinh viên
POST /api/retake-management/bulk-create
{
  gradeIds: [123, 124, 125],
  retakeType: "RETAKE_EXAM",
  reason: "Điểm thi < 5",
  semester: "HK1",
  academicYear: "2024-25"
}
```

### **3. Cập nhật kết quả thi lại**
```javascript
PUT /api/retake-management/update-result/456
{
  finalScore: 7.5,
  tbmhScore: 6.8
}
```

## ⚙️ Configuration

### **1. Business Rules**
Có thể tùy chỉnh trong `src/utils/retakeHelper.js`:
```javascript
export const RETAKE_RULES = {
  RETAKE_COURSE: {
    condition: (tbktScore) => tbktScore < 5,  // Có thể đổi thành 4.5
    // ...
  }
}
```

### **2. UI Customization**
Tùy chỉnh màu sắc, text trong các components:
- `RetakeStatusBadge`
- `RetakeActionButton`
- `RetakeInfoPanel`

## 🧪 Testing

### **1. Unit Tests**
```javascript
// Test business logic
describe('analyzeGradeStatus', () => {
  it('should detect RETAKE_COURSE when TBKT < 5', () => {
    const result = analyzeGradeStatus({
      tbktScore: 4.5,
      finalScore: 6.0
    });
    expect(result.actionType).toBe('RETAKE_COURSE');
  });
});
```

### **2. Integration Tests**
```javascript
// Test API endpoints
describe('POST /api/retake-management/create-course', () => {
  it('should create retake course registration', async () => {
    const response = await request(app)
      .post('/api/retake-management/create-course')
      .send({
        originalGradeId: 1,
        studentId: 1,
        subjectId: 1,
        reason: 'Test'
      });
    expect(response.status).toBe(200);
  });
});
```

## 🚀 Deployment Notes

1. **Database Migration:** Đảm bảo các bảng GradeRetake đã được tạo
2. **API Routes:** Đăng ký routes trong app.js
3. **Frontend:** Import và sử dụng RetakeManagementComponent
4. **Permissions:** Cấu hình quyền admin/teacher để tạo đăng ký thi lại

## 📞 Support

Liên hệ team development để hỗ trợ:
- Email: dev@example.com
- Documentation: [Wiki](link-to-wiki)
- Issues: [GitHub Issues](link-to-issues)