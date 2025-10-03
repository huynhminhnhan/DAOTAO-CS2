# Hệ Thống Bảng Điểm Động (Dynamic Grade Table)

## 🎯 Tổng Quan
Đã chuyển đổi thành công từ hệ thống bảng điểm cố định sang hệ thống động hoàn toàn, cho phép thêm/bớt cột điểm TX và ĐK theo nhu cầu thực tế.

## 🔄 Thay Đổi Chính

### 1. Database Schema (JSON Format)
```sql
-- CŨ: Cột cố định
txScore DECIMAL(3,2)
dkScore1 DECIMAL(3,2)  
dkScore2 DECIMAL(3,2)
dkScore3 DECIMAL(3,2)

-- MỚI: Cột JSON linh hoạt
txScore JSON  -- {"tx1": 8.5, "tx2": 7.0, "tx3": 9.2}
dkScore JSON  -- {"dk1": 8.0, "dk2": 7.5, "dk3": 9.0}
```

### 2. Frontend State Management
```javascript
const [gradeConfig, setGradeConfig] = useState({
  txColumns: 1,        // Số cột TX hiện tại
  dkColumns: 1,        // Số cột ĐK hiện tại  
  maxTxColumns: 10,    // Giới hạn tối đa TX
  maxDkColumns: 10     // Giới hạn tối đa ĐK
});
```

### 3. Grade Data Structure
```javascript
// Cấu trúc điểm mới (JSON)
grades[studentId] = {
  enrollmentId: 123,
  txScore: { tx1: 8.5, tx2: 7.0, tx3: 9.2 },
  dkScore: { dk1: 8.0, dk2: 7.5, dk3: 9.0 },
  finalScore: 8.2,
  tbktScore: '',  // Tự động tính
  tbmhScore: ''   // Tự động tính
};
```

## 🎮 Tính Năng Mới

### 1. Column Management UI
- ➕ Nút thêm cột TX/ĐK
- ➖ Nút bớt cột TX/ĐK  
- 🔢 Hiển thị số cột hiện tại
- 🚫 Disable khi đạt giới hạn
- 💡 Tooltip hướng dẫn

### 2. Auto-Detection từ Database
```javascript
// Tự động phát hiện số cột từ dữ liệu có sẵn
const txCount = Object.keys(existingTxScore).length;
const dkCount = Object.keys(existingDkScore).length;

// Cập nhật gradeConfig để phù hợp
setGradeConfig(prev => ({
  ...prev,
  txColumns: Math.max(prev.txColumns, txCount || 1),
  dkColumns: Math.max(prev.dkColumns, dkCount || 1)
}));
```

### 3. Dynamic Table Rendering
```jsx
{/* Dynamic TX columns */}
{Array.from({ length: gradeConfig.txColumns }, (_, i) => (
  <th key={`tx${i + 1}`}>
    {gradeConfig.txColumns === 1 ? 'TX' : `TX${i + 1}`}
  </th>
))}

{/* Dynamic DK columns */}
{Array.from({ length: gradeConfig.dkColumns }, (_, i) => (
  <th key={`dk${i + 1}`}>
    {gradeConfig.dkColumns === 1 ? 'ĐK' : `ĐK${i + 1}`}
  </th>
))}
```

### 4. Smart Input Handling
```javascript
const handleGradeChange = (studentId, field, value, scoreKey = null) => {
  if (field === 'txScore') {
    // Cập nhật TX score cụ thể trong JSON
    newGrades[studentId].txScore = {
      ...newGrades[studentId].txScore,
      [scoreKey]: value  // ví dụ: tx1, tx2, tx3
    };
  } else if (field === 'dkScore') {
    // Cập nhật DK score cụ thể trong JSON
    newGrades[studentId].dkScore = {
      ...newGrades[studentId].dkScore,
      [scoreKey]: value  // ví dụ: dk1, dk2, dk3
    };
  }
  
  // Tự động tính toán TBKT & TBMH
  autoCalculateGrades(studentId);
};
```

## 🧮 Công Thức Tính Toán Mới

### 1. TBKT (Điểm Trung Bình Kiểm Tra)
```javascript
const calculateTBKT = (txScore, dkScore) => {
  // Lấy tất cả điểm TX hợp lệ
  const txValues = Object.values(txScore || {})
    .filter(val => val !== '' && val !== null && !isNaN(val));
  
  // Lấy tất cả điểm ĐK hợp lệ  
  const dkValues = Object.values(dkScore || {})
    .filter(val => val !== '' && val !== null && !isNaN(val));
  
  if (txValues.length === 0 || dkValues.length === 0) return '';
  
  // Tính trung bình
  const txAvg = txValues.reduce((sum, val) => sum + parseFloat(val), 0) / txValues.length;
  const dkAvg = dkValues.reduce((sum, val) => sum + parseFloat(val), 0) / dkValues.length;
  
  // Công thức: (TX_avg + DK_avg * 2) / 3
  const tbkt = (txAvg + dkAvg * 2) / 3;
  return Math.round(tbkt * 100) / 100;
};
```

### 2. TBMH (Điểm Trung Bình Môn Học)
```javascript
const calculateTBMH = (tbkt, finalScore) => {
  if (!tbkt || !finalScore) return '';
  
  // Công thức: (TBKT + Thi * 3) / 4
  const tbmh = (parseFloat(tbkt) + parseFloat(finalScore) * 3) / 4;
  return Math.round(tbmh * 100) / 100;
};
```

## 🔄 Data Flow

### 1. Load Data (Database → Frontend)
```
Database (JSON) → API Service → Frontend State → UI Rendering
{"tx1":8.5,"tx2":7.0} → Auto-detect columns → Dynamic table
```

### 2. Save Data (Frontend → Database)  
```
UI Input → JSON Format → API → Database
TX1: 8.5, TX2: 7.0 → {"tx1":8.5,"tx2":7.0} → Database
```

### 3. Add/Remove Columns
```
User clicks [+] → Update gradeConfig → Re-render table → Initialize empty values
User clicks [-] → Update gradeConfig → Remove data → Re-render table
```

## 📊 API Updates

### Grade API Service
```javascript
// Cũ: Static columns
attributes: ['txScore','dkScore1','dkScore2','dkScore3',...]

// Mới: JSON columns  
attributes: ['txScore','dkScore',...]

// Backward compatibility extraction
const txValues = Object.values(existingGrade.txScore || {});
const dkValues = [
  existingGrade.dkScore?.dk1 || '',
  existingGrade.dkScore?.dk2 || '', 
  existingGrade.dkScore?.dk3 || ''
];
```

### Grade Bulk Service
```javascript
// Cũ: Fixed field updates
txScore: validatedData.txScore,
dkScore1: validatedData.dkScore1,
dkScore2: validatedData.dkScore2,
dkScore3: validatedData.dkScore3,

// Mới: JSON field updates
txScore: validatedData.txScore,  // JSON object
dkScore: validatedData.dkScore,  // JSON object
```

## 🎨 UI Improvements

### 1. Column Management Panel
```jsx
<div className="grade-config-panel">
  <h5>⚙️ Cấu hình cột điểm</h5>
  <div className="column-controls">
    <div className="tx-controls">
      <label>Điểm TX:</label>
      <button onClick={removeTxColumn} disabled={txColumns <= 1}>-</button>
      <span>{txColumns}</span>
      <button onClick={addTxColumn} disabled={txColumns >= maxTxColumns}>+</button>
    </div>
    <div className="dk-controls">
      <label>Điểm ĐK:</label>
      <button onClick={removeDkColumn} disabled={dkColumns <= 1}>-</button>
      <span>{dkColumns}</span>
      <button onClick={addDkColumn} disabled={dkColumns >= maxDkColumns}>+</button>
    </div>
  </div>
  <div className="help-text">
    💡 Thêm/bớt cột điểm theo nhu cầu. Dữ liệu sẽ được lưu dạng JSON linh hoạt.
  </div>
</div>
```

### 2. Smart Column Headers
```jsx
{/* Hiển thị tên cột thông minh */}
{gradeConfig.txColumns === 1 ? 'TX' : `TX${i + 1}`}
{gradeConfig.dkColumns === 1 ? 'ĐK' : `ĐK${i + 1}`}
```

## 🧪 Testing Completed

### 1. Dynamic Column Tests
✅ Add/remove TX columns (1-10)
✅ Add/remove DK columns (1-10)  
✅ Data persistence khi thay đổi số cột
✅ Auto-detection từ database data

### 2. Calculation Tests
✅ TBKT với multiple TX/DK scores
✅ TBMH với TBKT + Final score
✅ Real-time calculation on input
✅ Empty/invalid value handling

### 3. JSON Format Tests
✅ Save/load JSON grade data
✅ Backward compatibility
✅ API integration
✅ Database migration

## 🎯 Lợi Ích

### 1. Flexibility (Tính Linh Hoạt)
- ✨ Không giới hạn số lượng cột điểm
- 🔄 Thay đổi theo từng môn học/học kỳ
- 📊 Phù hợp với quy trình đánh giá khác nhau

### 2. Data Integrity (Toàn Vẹn Dữ Liệu)
- 🔒 JSON validation at model level
- 💾 Transaction-safe operations
- 🔙 Backward compatibility với dữ liệu cũ

### 3. User Experience (Trải Nghiệm Người Dùng)
- 🎮 Intuitive column management UI
- ⚡ Real-time calculation
- 💡 Clear visual feedback
- 🚫 Smart disable states

### 4. Performance (Hiệu Suất)
- 📈 JSON indexing support in MySQL
- 🗜️ Reduced database columns
- ⚡ Efficient data structure

## 🚀 Future Enhancements

### 1. Preset Configurations
```javascript
const gradePresets = {
  'math': { txColumns: 3, dkColumns: 2 },
  'literature': { txColumns: 2, dkColumns: 1 },
  'physics': { txColumns: 4, dkColumns: 3 }
};
```

### 2. Import/Export Support
- 📤 Export grade templates
- 📥 Import từ Excel với dynamic columns
- 🔄 Template sharing between teachers

### 3. Analytics & Reporting
- 📊 Grade distribution per column
- 📈 Performance trends across TX/DK attempts
- 🎯 Identify difficult assessment points

## 📋 Migration Notes

### Database Changes
✅ Migration `20250905140732-restructure-grade-scores-to-json.cjs` applied
✅ Data converted from individual columns to JSON format  
✅ Rollback procedure available if needed

### Code Changes  
✅ Model helper methods added (getTxAverage, getDkAverage, addTxScore, addDkScore)
✅ Frontend completely updated for dynamic rendering
✅ API services updated for JSON format
✅ Backward compatibility maintained

### Testing Results
🎉 All functionality tested and working correctly
🎉 Dynamic table responsive và user-friendly
🎉 Data integrity maintained throughout operations
🎉 Performance optimized with JSON operations

---

**🎯 Result: Hệ thống bảng điểm hoàn toàn linh hoạt, có thể thêm/bớt cột điểm theo nhu cầu thực tế, với giao diện trực quan và tính toán tự động chính xác.**
