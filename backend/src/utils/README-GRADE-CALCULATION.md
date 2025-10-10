# Grade Calculation Helper

Hệ thống helper tính điểm dùng chung cho toàn bộ ứng dụng quản lý sinh viên.

## 📁 Files

- `src/utils/gradeCalculation.js` - Helper chính chứa các hàm tính điểm
- `src/utils/gradeCalculationExamples.js` - Ví dụ cách sử dụng trong các component

## 🧮 Công thức tính điểm

### Hệ số điểm
- **TX (Thường xuyên)**: Hệ số 1
- **ĐK (Điều kiện)**: Hệ số 2  

### Trọng số điểm
- **Điểm thi cuối kỳ**: Trọng số 60%
- **Điểm TBKT**: Trọng số 40%

### Công thức
- **TBKT** = (TB_TX × 1 + TB_ĐK × 2) ÷ 3
- **TBMH** = (Điểm_Thi × 0.6) + (TBKT × 0.4)

### Xếp loại
- **Xuất sắc**: ≥ 9.0
- **Giỏi**: 8.0 - 8.9
- **Khá**: 7.0 - 7.9
- **Trung bình**: 5.0 - 6.9
- **Yếu**: 4.0 - 4.9
- **Kém**: < 4.0

## 🚀 Cách sử dụng

### 1. Import các hàm cần thiết

```javascript
import { 
  calculateTBKT, 
  calculateTBMH, 
  getGradeClassification,
  calculateAllGrades,
  GRADE_COEFFICIENTS,
  GRADE_WEIGHTS 
} from '../utils/gradeCalculation';
```

### 2. Tính điểm đơn lẻ

```javascript
const txScore = { tx1: 8.5, tx2: 7.0, tx3: 9.0 };
const dkScore = { dk1: 8.0, dk2: 7.5 };
const finalScore = 8.5;

const tbkt = calculateTBKT(txScore, dkScore);           // 7.83
const tbmh = calculateTBMH(tbkt, finalScore);           // 8.23
const classification = getGradeClassification(tbmh);    // "Giỏi"
```

### 3. Tính điểm tổng hợp

```javascript
const gradeData = {
  txScore: { tx1: 8.5, tx2: 7.0 },
  dkScore: { dk1: 8.0, dk2: 7.5 },
  finalScore: 8.5
};

const result = calculateAllGrades(gradeData);
// {tbkt: 7.83, tbmh: 8.12, classification: "Giỏi", isPassing: true}
```

### 4. Validation điểm số

```javascript
import { validateScore } from '../utils/gradeCalculation';

const validation = validateScore(8.5);
if (!validation.isValid) {
  console.log(validation.message);
}
```

### 5. Hiển thị công thức

```javascript
import { getFormulaStrings } from '../utils/gradeCalculation';

const formulas = getFormulaStrings();
console.log(formulas.tbktFormula);  // "TBKT = (TB_TX × 1 + TB_ĐK × 2) ÷ 3"
console.log(formulas.tbmhFormula);  // "TBMH = (TBKT + Thi × 3) ÷ 4"
```

## 🔧 Tùy chỉnh hệ số

```javascript
const customOptions = {
  txCoefficient: 1,     // TX hệ số 1
  dkCoefficient: 3,     // ĐK hệ số 3 (thay vì 2)
  finalWeight: 0.7,     // Thi trọng số 70% (thay vì 60%)
  tbktWeight: 0.3,      // TBKT trọng số 30% (thay vì 40%)
  precision: 3          // Làm tròn 3 chữ số thập phân
};

const tbkt = calculateTBKT(txScore, dkScore, customOptions);
const tbmh = calculateTBMH(tbkt, finalScore, customOptions);
```

## 📊 Trong React Components

### Hook tùy chỉnh

```javascript
import { useGradeCalculation } from '../utils/gradeCalculationExamples';

const MyComponent = () => {
  const {
    gradeData,
    calculatedGrades,
    updateTxScore,
    updateDkScore,
    updateFinalScore
  } = useGradeCalculation({
    txScore: {},
    dkScore: {},
    finalScore: ''
  });

  return (
    <div>
      <input 
        onChange={(e) => updateTxScore('tx1', e.target.value)}
        placeholder="TX1"
      />
      <div>TBKT: {calculatedGrades.tbkt}</div>
      <div>TBMH: {calculatedGrades.tbmh}</div>
      <div>Xếp loại: {calculatedGrades.classification}</div>
    </div>
  );
};
```

### Component bảng điểm

```javascript
const StudentGradeTable = ({ students }) => {
  return (
    <table>
      <tbody>
        {students.map(student => {
          const grades = calculateAllGrades(student.gradeData);
          return (
            <tr key={student.id}>
              <td>{student.name}</td>
              <td>{grades.tbkt}</td>
              <td>{grades.tbmh}</td>
              <td>{grades.classification}</td>
              <td>{grades.isPassing ? 'Đạt' : 'Không đạt'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
```

## 🔍 API Functions

### Core Functions
- `calculateTBKT(txScore, dkScore, options)` - Tính điểm TBKT
- `calculateTBMH(tbktScore, finalScore, options)` - Tính điểm TBMH
- `calculateAllGrades(gradeData, options)` - Tính tất cả điểm một lần

### Utility Functions  
- `getGradeClassification(tbmhScore)` - Xếp loại học lực
- `isPassingGrade(tbmhScore, minPassScore)` - Kiểm tra đạt/không đạt
- `validateScore(score, min, max)` - Validate điểm đầu vào
- `getFormulaStrings(coefficients)` - Lấy string công thức

### Constants
- `GRADE_COEFFICIENTS` - Object chứa hệ số mặc định `{TX: 1, DK: 2}`
- `GRADE_WEIGHTS` - Object chứa trọng số mặc định `{FINAL: 0.6, TBKT: 0.4}`

## 💡 Lưu ý

1. **Input format**: Điểm TX và ĐK phải là JSON object với key dạng `{tx1: 8.5, tx2: 7.0}` và `{dk1: 8.0, dk2: 7.5}`
2. **Error handling**: Các hàm trả về chuỗi rỗng `''` khi không đủ dữ liệu
3. **Precision**: Mặc định làm tròn 2 chữ số thập phân, có thể tùy chỉnh
4. **Reusability**: Helper có thể dùng cho nhiều component khác nhau trong hệ thống

## 📝 Examples

Xem file `gradeCalculationExamples.js` để biết thêm ví dụ chi tiết về:
- Cách tính điểm trong các component khác
- Tạo form nhập điểm với validation
- Hiển thị thống kê lớp học
- Sử dụng custom hooks
- Tùy chỉnh hệ số điểm
