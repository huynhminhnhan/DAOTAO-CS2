# Bảng Điểm Tổng Kết Theo Học Kỳ

## 📋 Tổng quan

Component **Semester Grade Summary** cho phép xem và xuất bảng điểm tổng kết của sinh viên theo nhiều học kỳ, bao gồm:

- ✅ Hiển thị điểm từng môn học theo học kỳ
- ✅ Tính điểm trung bình chung (ĐTBC) tự động
- ✅ Xếp loại học lực (Xuất sắc, Giỏi, Khá, Trung bình, Yếu)
- ✅ Hiển thị thông tin thi lại/học lại chi tiết
- ✅ Highlight ô điểm có thi lại (màu vàng)
- ✅ Tooltip tên môn học khi hover
- ✅ Export Excel với định dạng chuẩn

## 🎯 Tính năng chính

### 1. Filter và chọn dữ liệu
- **Chọn khóa học**: Dropdown danh sách khóa
- **Chọn lớp**: Dropdown lớp thuộc khóa đã chọn
- **Chọn học kỳ**: Checkbox nhiều học kỳ (HK1, HK2, HK3...)

### 2. Bảng điểm động
- **Cột header**: Tên học kỳ (HK1, HK2...) với số môn học tương ứng
- **Cột sub-header**: Mã môn học và số tín chỉ
- **Tooltip**: Hover vào mã môn để xem tên đầy đủ
- **Highlight**: Ô màu vàng = có thi lại/học lại
- **Màu đỏ**: Điểm < 5.0

### 3. Cột "Các môn thi lại"
Hiển thị đầy đủ:
- Mã môn học
- Loại: "Thi lại" hoặc "Học lại"
- Học kỳ và năm học thi lại
- Điểm thi lại
- Ngày hoàn thành

### 4. ĐTBC và Xếp loại
**Công thức ĐTBC**:
```
ĐTBC = Σ(Điểm × Tín chỉ) / Σ(Tín chỉ)
```

**Quy tắc xếp loại**:
- **Xuất sắc**: ĐTBC ≥ 9.0
- **Giỏi**: ĐTBC ≥ 8.0
- **Khá**: ĐTBC ≥ 7.0
- **Trung bình**: ĐTBC ≥ 5.0
- **Yếu**: ĐTBC < 5.0

### 5. Export Excel
- Tạo file Excel với tất cả dữ liệu
- Tên file: `Bang_Diem_Tong_Ket_<TenLop>.xlsx`
- Auto-size cột để dễ đọc

## 🔧 Cấu trúc kỹ thuật

### Backend

#### 1. Service: `SemesterGradeSummaryService.js`
```javascript
// Xử lý logic nghiệp vụ
- getSemesterSummary(cohortId, classId, semesterIds)
- classifyStudent(dtbc)
```

#### 2. Controller: `SemesterGradeSummaryController.js`
```javascript
// Xử lý API request/response
- GET /admin-api/grade/semester-summary
```

#### 3. Routes
```javascript
// grade.routes.js
router.get('/semester-summary', SemesterGradeSummaryController.getSemesterSummary);

// semester.routes.js
router.get('/by-cohort/:cohortId', async (req, res) => {...});
```

### Frontend

#### Component: `SemesterGradeSummaryComponent.jsx`

**States:**
```javascript
- cohorts, classes, semesters        // Danh sách dropdown
- selectedCohort, selectedClass      // Lựa chọn hiện tại
- selectedSemesters                  // Mảng ID học kỳ đã chọn
- summaryData                        // Dữ liệu bảng điểm
- loading, error                     // Trạng thái UI
```

**Key Functions:**
```javascript
- fetchSummaryData()      // Gọi API lấy dữ liệu
- exportToExcel()         // Xuất Excel
- renderRetakeInfo()      // Render cột thi lại
- hasRetake()             // Check có thi lại không
```

## 📊 Cấu trúc dữ liệu API

### Request:
```
GET /admin-api/grade/semester-summary?cohortId=1&classId=2&semesterIds=1&semesterIds=2
```

### Response:
```json
{
  "success": true,
  "data": {
    "classInfo": {
      "classId": 2,
      "className": "TSCS1",
      "cohortId": 1
    },
    "semesters": [
      {
        "semesterId": 1,
        "name": "HK1",
        "academicYear": "2024-2025",
        "order": 1
      }
    ],
    "subjects": [
      {
        "id": 5,
        "subjectCode": "C1",
        "subjectName": "Lập trình C",
        "credits": 3
      }
    ],
    "studentsData": [
      {
        "student": {
          "id": 10,
          "studentCode": "2021001",
          "fullName": "Nguyễn Văn A",
          "dateOfBirth": "2000-01-01",
          "gender": "Male"
        },
        "gradesBySemester": {
          "1": {
            "5": {
              "subjectCode": "C1",
              "subjectName": "Lập trình C",
              "credits": 3,
              "tbmhScore": "7.50",
              "gradeId": 100
            }
          }
        },
        "retakeInfo": {
          "5": [
            {
              "retakeType": "RETAKE_EXAM",
              "attemptNumber": 2,
              "semester": "HK2",
              "academicYear": "2024-25",
              "tbmhScore": "6.00",
              "resultStatus": "PASS",
              "completedAt": "2025-01-15"
            }
          ]
        },
        "dtbcBySemester": {
          "1": "7.50"
        },
        "overallDtbc": 7.50,
        "classification": "Khá"
      }
    ]
  }
}
```

## 🚀 Hướng dẫn sử dụng

### Bước 1: Truy cập trang
1. Đăng nhập AdminJS
2. Vào menu **"Bảng điểm tổng kết"**

### Bước 2: Chọn dữ liệu
1. Chọn **Khóa** (VD: K30S)
2. Chọn **Lớp** (VD: TSCS1)
3. Tick chọn **Học kỳ** muốn xem (có thể chọn nhiều)

### Bước 3: Xem bảng điểm
1. Click **"📊 Xem bảng điểm"**
2. Chờ dữ liệu tải (có loading indicator)
3. Bảng hiển thị với:
   - Cột học kỳ nối tiếp nhau
   - Điểm từng môn
   - ĐTBC và xếp loại
   - Cột thi lại/học lại

### Bước 4: Xuất Excel
1. Click **"📥 Xuất Excel"**
2. File tự động download
3. Mở file để xem/in

## 💡 Tips và lưu ý

### Màu sắc:
- 🟨 **Màu vàng**: Môn có thi lại/học lại
- 🔴 **Chữ đỏ**: Điểm < 5.0 (yếu)
- 🔵 **Nền xanh**: Cột ĐTBC (dễ nhận biết)

### Tooltip:
- Hover vào **mã môn học** để xem tên đầy đủ
- Format: `Tên môn (X tín chỉ)`

### Cột thi lại:
- Format: `MÃ_MÔN: Loại (HK Năm) - Điểm: X.XX [Ngày]`
- VD: `C1: Thi lại (HK2 2024-25) - Điểm: 6.00 [15/01/2025]`

### Performance:
- Chọn ít học kỳ nếu lớp đông (tối ưu hiển thị)
- Export Excel có thể mất vài giây với dữ liệu lớn

## 🐛 Xử lý lỗi

### Lỗi: "Không tìm thấy lớp học"
- Kiểm tra lại khóa và lớp đã chọn
- Đảm bảo lớp thuộc khóa đúng

### Lỗi: "Vui lòng chọn ít nhất một học kỳ"
- Tick chọn ít nhất 1 học kỳ trước khi xem

### Bảng trống:
- Kiểm tra sinh viên đã có điểm chưa
- Kiểm tra học kỳ có môn học nào không

## 📝 Changelog

### v1.0.0 (2025-10-16)
- ✅ Initial release
- ✅ Multi-semester display
- ✅ Retake info integration
- ✅ Excel export
- ✅ ĐTBC calculation
- ✅ Classification system
- ✅ Responsive design

## 🔮 Tính năng tương lai

- [ ] Filter theo môn học cụ thể
- [ ] Chart visualization ĐTBC theo học kỳ
- [ ] Export PDF với header/footer
- [ ] Print-friendly layout
- [ ] So sánh nhiều lớp
- [ ] Thống kê xếp loại lớp

---

**Developed by**: Student Management System Team
**Last Updated**: 16/10/2025
