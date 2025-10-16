# Teacher Grade Entry - Import TX/ĐK Feature Implementation

## 📋 Tổng quan
Đã xây dựng tính năng import điểm TX (Thường Xuyên) và ĐK (Điều Kiện) từ file Excel cho TeacherGradeEntryComponent.

## ✨ Tính năng chính

### 1. **Dynamic Template Generation**
- Template Excel được tạo động dựa trên cấu hình cột điểm hiện tại
- Cấu trúc: `MSSV, Họ và tên, TX1, TX2, ..., TXn, ĐK1, ĐK2, ..., ĐKn`
- Số cột TX và ĐK thay đổi theo `gradeConfig.txColumns` và `gradeConfig.dkColumns`
- Template có sẵn danh sách sinh viên (MSSV và Họ tên)
- Format: CSV với UTF-8 BOM để hỗ trợ tiếng Việt

### 2. **Import Validation**
- Kiểm tra cấu trúc header khớp với cấu hình hiện tại
- Validate điểm: phải từ 0-10
- Kiểm tra sinh viên tồn tại trong danh sách
- Chỉ import cho sinh viên ở trạng thái **DRAFT** (có thể chỉnh sửa)
- Sinh viên đã nộp duyệt (PENDING_REVIEW, APPROVED_TX_DK) sẽ bị bỏ qua

### 3. **Auto-calculation**
- Tự động tính TBKT sau khi import: `TBKT = TX × 40% + ĐK × 60%`
- Merge với điểm hiện có (không xóa điểm cũ nếu file import không có)

### 4. **Visibility Control**
- Nút "📥 Import điểm TX/ĐK" chỉ hiển thị khi:
  - Đã chọn môn học (`selectedSubject`)
  - Có danh sách sinh viên (`students.length > 0`)
  - Có ít nhất 1 sinh viên ở trạng thái DRAFT (có thể chỉnh sửa)
- Nút ẩn hoàn toàn khi tất cả điểm đã nộp duyệt

### 5. **User Experience**
- Modal UI đầy đủ với:
  - Hướng dẫn 5 bước chi tiết
  - Download template button với thông tin cấu hình
  - File input với hiển thị tên file đã chọn
  - Kết quả import với thống kê (success/error counts)
  - Danh sách lỗi chi tiết (nếu có)
  - Warning về ghi đè dữ liệu

## 🔧 Implementation Details

### **States Added**
```javascript
const [showImportModal, setShowImportModal] = useState(false);
const [importFile, setImportFile] = useState(null);
const [importing, setImporting] = useState(false);
const [importResult, setImportResult] = useState(null);
```

### **Functions Added**

#### 1. `downloadImportTemplate()`
- Tạo CSV template động với cấu hình hiện tại
- Pre-fill MSSV và Họ tên từ danh sách sinh viên
- Các cột điểm để trống để giáo viên điền

#### 2. `handleImportFileSelect(event)`
- Xử lý chọn file
- Reset kết quả import trước đó

#### 3. `handleImportTxDkScores()`
- Parse CSV file
- Validate header structure
- Validate từng dòng dữ liệu:
  - Kiểm tra MSSV có trong danh sách
  - Kiểm tra trạng thái sinh viên (phải DRAFT)
  - Validate điểm (0-10)
- Merge điểm vào state
- Auto-calculate TBKT
- Trả về statistics (success/error counts)

#### 4. `canShowImportButton()`
- Kiểm tra điều kiện hiển thị nút import
- Return `true` nếu có sinh viên DRAFT

## 📊 CSV Format Example

### Cấu hình: 2 cột TX, 1 cột ĐK
```csv
MSSV,Họ và tên,TX1,TX2,ĐK1
2021001,Nguyễn Văn A,8.5,9.0,7.5
2021002,Trần Thị B,7.0,8.0,8.5
```

### Cấu hình: 3 cột TX, 2 cột ĐK
```csv
MSSV,Họ và tên,TX1,TX2,TX3,ĐK1,ĐK2
2021001,Nguyễn Văn A,8.5,9.0,7.0,7.5,8.0
2021002,Trần Thị B,7.0,8.0,8.5,8.5,9.0
```

## 🎯 Use Cases

### Case 1: Import lần đầu
1. Giáo viên mở trang nhập điểm
2. Chọn Khóa → Lớp → Môn học
3. Click "📥 Import điểm TX/ĐK"
4. Download template (có sẵn danh sách sinh viên)
5. Điền điểm vào Excel
6. Import → Kiểm tra → Lưu điểm → Nộp duyệt

### Case 2: Import bổ sung
1. Đã có một số điểm nhập thủ công
2. Import file mới với điểm bổ sung
3. Hệ thống merge với điểm cũ
4. TBKT được tính lại tự động

### Case 3: Import khi có lỗi
1. Import file với một số dòng lỗi
2. Modal hiển thị:
   - Số dòng thành công
   - Số dòng lỗi
   - Danh sách lỗi chi tiết
3. Giáo viên sửa file và import lại

## ⚠️ Validation Rules

### 1. Header Validation
- Header phải khớp chính xác với cấu hình
- Số cột TX/ĐK phải đúng
- Thứ tự cột phải đúng: MSSV → Họ tên → TX → ĐK

### 2. Data Validation
- MSSV: Phải tồn tại trong danh sách lớp
- Điểm: 0 ≤ score ≤ 10
- Trạng thái: Chỉ DRAFT mới import được

### 3. Permission Validation
- Chỉ giáo viên được phân công mới thấy lớp
- Chỉ import được khi điểm chưa bị khóa

## 🔒 Security & Data Integrity

### 1. Status Check
- Kiểm tra `gradeStatus` trước khi import
- Sinh viên PENDING_REVIEW/APPROVED_TX_DK bị bỏ qua
- Báo lỗi rõ ràng cho từng sinh viên

### 2. Data Merge Strategy
- Merge với điểm hiện có (không xóa toàn bộ)
- Ghi đè nếu cột điểm có trong file import
- Giữ nguyên nếu cột điểm không có trong file

### 3. Auto-calculation
- TBKT được tính lại sau import
- Sử dụng hàm `calculateTBKT()` đã có sẵn
- Đảm bảo tính toán nhất quán

## 📝 User Instructions (trong Modal)

1. **Download Template**: Tải file mẫu có sẵn danh sách
2. **Fill Data**: Mở Excel và điền điểm
3. **Save CSV**: Lưu file định dạng CSV UTF-8
4. **Upload**: Chọn file vừa lưu
5. **Import**: Click Import và kiểm tra kết quả

## 🎨 UI Components

### Import Button
- Icon: 📥
- Text: "Import điểm TX/ĐK"
- Color: Info (#17a2b8)
- Visibility: Conditional (chỉ khi có DRAFT)

### Modal
- Full-screen overlay
- Centered card
- Scrollable content
- Responsive design

### Template Button
- Icon: 📥
- Text: "Tải Template (X TX + Y ĐK)"
- Color: Success (#28a745)
- Shows current configuration

## 🔄 Workflow Integration

```
Select Class/Subject
    ↓
[Grades Table Shows]
    ↓
Check Status → Any DRAFT?
    ↓ YES
[Import Button Shows]
    ↓
Click Import → Modal Opens
    ↓
Download Template
    ↓
Fill Excel Data
    ↓
Upload & Import
    ↓
[Grades Updated in Table]
    ↓
Click "💾 Lưu điểm"
    ↓
Click "📤 Nộp điểm để duyệt"
```

## ✅ Testing Checklist

- [ ] Template download với cấu hình 1 TX + 1 ĐK
- [ ] Template download với cấu hình 3 TX + 2 ĐK
- [ ] Import file đúng format
- [ ] Import file sai header
- [ ] Import điểm không hợp lệ (< 0, > 10)
- [ ] Import MSSV không tồn tại
- [ ] Import sinh viên đã nộp duyệt (should skip)
- [ ] Auto-calculate TBKT sau import
- [ ] Button visibility khi tất cả DRAFT
- [ ] Button hidden khi tất cả PENDING_REVIEW
- [ ] UTF-8 Vietnamese characters

## 🎯 Differences from Admin Version

| Feature | Admin (GradeEntryPageComponent) | Teacher (TeacherGradeEntryComponent) |
|---------|--------------------------------|-------------------------------------|
| **Columns** | MSSV, Name, Final Score | MSSV, Name, TX1-n, ĐK1-n |
| **Dynamic Columns** | ❌ No | ✅ Yes (based on config) |
| **Auto-calc** | TBMH (includes final score) | TBKT (TX + ĐK only) |
| **Lock Check** | Final score lock | TX/ĐK lock |
| **Status Filter** | Not locked | DRAFT status |

## 🚀 Future Enhancements

1. **Excel support**: Accept .xlsx in addition to .csv
2. **Batch validation**: Pre-validate before import
3. **Undo feature**: Rollback import if needed
4. **Import history**: Track import activities
5. **Template customization**: Allow custom column order

---

**Status**: ✅ Implemented and Ready for Testing
**Date**: 14/10/2025
**Component**: TeacherGradeEntryComponent.jsx
