# Lock Retake Score Entry Until TX/ĐK Approved

## 🎯 Tính năng

Khóa chức năng nhập điểm thi lại/học lại cho đến khi điểm TX (Thường xuyên) và ĐK (Định kỳ) được duyệt bởi admin.

## 🔒 Logic Khóa

### Điều kiện để mở khóa nhập điểm thi lại/học lại:

```javascript
gradeStatus === 'APPROVED_TX_DK'  OR
gradeStatus === 'FINAL_ENTERED'   OR
gradeStatus === 'FINALIZED'
```

### Các trạng thái KHÔNG cho phép nhập điểm thi lại:

- ❌ `DRAFT` - Chưa nộp điểm
- ❌ `PENDING_REVIEW` - Chờ duyệt
- ❌ `null/undefined` - Chưa có điểm trong DB

### Các trạng thái CHO PHÉP nhập điểm thi lại:

- ✅ `APPROVED_TX_DK` - Đã duyệt TX/ĐK
- ✅ `FINAL_ENTERED` - Đã nhập điểm thi
- ✅ `FINALIZED` - Đã hoàn tất

## 📝 Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    RETAKE SCORE ENTRY WORKFLOW                           │
└─────────────────────────────────────────────────────────────────────────┘

STATE 1: DRAFT hoặc PENDING_REVIEW
┌────────────────────────────────────┐
│ Grade Status: DRAFT                │
│                                    │
│ TX: [8] DK: [7] Final: null       │
│ TBKT: 7.5 < 5? NO                 │
│ Final < 5? (chưa có)               │
│                                    │
│ Badge: "⏳ Chờ duyệt TX/ĐK"       │
│ Button: 🔒 Chưa duyệt TX/ĐK       │  ❌ LOCKED
│                                    │
│ Lý do: Chưa được admin duyệt      │
└────────────────────────────────────┘
         │
         │ Admin duyệt TX/ĐK
         ▼

STATE 2: APPROVED_TX_DK
┌────────────────────────────────────┐
│ Grade Status: APPROVED_TX_DK       │
│                                    │
│ TX: [8] DK: [7] Final: [4.5]     │
│ TBKT: 7.5  Final: 4.5 < 5         │
│                                    │
│ Badge: "🔴 Cần thi lại"           │
│ Button: 📝 Nhập điểm thi lại      │  ✅ UNLOCKED
│                                    │
│ Admin có thể nhập điểm thi lại    │
└────────────────────────────────────┘
         │
         │ Admin nhập điểm thi lại
         ▼

STATE 3: Retake Score Entered
┌────────────────────────────────────┐
│ Retake Record Created              │
│                                    │
│ Original Final: 4.5                │
│ Retake Final: 6.0                  │
│ New TBMH: 6.5 → PASS ✅           │
│                                    │
│ Badge: "✅ Đã đạt (Thi lại)"      │
└────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                     UI DISPLAY STATES                                    │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Case 1: Grade Status = DRAFT                                             │
├──────────────────────────────────────────────────────────────────────────┤
│ [Bảng điểm - Cột "Thi lại/Học lại"]                                     │
│                                                                           │
│ ┌───────────────────────────┐                                           │
│ │ Badge: ⏳ Chờ duyệt TX/ĐK │                                           │
│ ├───────────────────────────┤                                           │
│ │ 🔒 Chưa duyệt TX/ĐK       │  ← Yellow warning box                     │
│ └───────────────────────────┘                                           │
│                                                                           │
│ ❌ Nút "Nhập điểm thi lại" KHÔNG hiển thị                               │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Case 2: Grade Status = PENDING_REVIEW                                    │
├──────────────────────────────────────────────────────────────────────────┤
│ [Bảng điểm - Cột "Thi lại/Học lại"]                                     │
│                                                                           │
│ ┌───────────────────────────┐                                           │
│ │ Badge: ⏳ Chờ duyệt TX/ĐK │                                           │
│ ├───────────────────────────┤                                           │
│ │ 🔒 Chưa duyệt TX/ĐK       │  ← Yellow warning box                     │
│ └───────────────────────────┘                                           │
│                                                                           │
│ ❌ Nút "Nhập điểm thi lại" KHÔNG hiển thị                               │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Case 3: Grade Status = APPROVED_TX_DK + Need Retake                     │
├──────────────────────────────────────────────────────────────────────────┤
│ [Bảng điểm - Cột "Thi lại/Học lại"]                                     │
│                                                                           │
│ ┌───────────────────────────┐                                           │
│ │ Badge: 🔴 Cần thi lại     │                                           │
│ ├───────────────────────────┤                                           │
│ │  📝 Nhập điểm thi lại     │  ← Blue action button                     │
│ └───────────────────────────┘                                           │
│                                                                           │
│ ✅ Nút HIỂN THỊ và có thể click                                         │
│ ✅ Mở modal nhập điểm thi lại                                           │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Case 4: Grade Status = APPROVED_TX_DK + Need Retake Course              │
├──────────────────────────────────────────────────────────────────────────┤
│ [Bảng điểm - Cột "Thi lại/Học lại"]                                     │
│                                                                           │
│ ┌───────────────────────────┐                                           │
│ │ Badge: 🔴 Cần học lại     │                                           │
│ ├───────────────────────────┤                                           │
│ │  🔄 Nhập điểm học lại     │  ← Orange action button                   │
│ └───────────────────────────┘                                           │
│                                                                           │
│ ✅ Nút HIỂN THỊ và có thể click                                         │
│ ✅ Mở modal nhập điểm học lại                                           │
└──────────────────────────────────────────────────────────────────────────┘


## 🔧 Code Changes

### 1. GradeEntryPageComponent.jsx

**Thay đổi:** Truyền `gradeStatus` vào `RetakeManagementComponent`

```jsx
<RetakeManagementComponent
  student={{ ... }}
  gradeData={{ ... }}
  gradeStatus={gradeStatuses[student.id]}  // ✅ NEW
  gradeConfig={gradeConfig}
  hasExistingGrade={hasExistingGrade}
  subjectId={parseInt(selectedSubject)}
  onGradeUpdate={...}
  showDetails={false}
/>
```

### 2. RetakeManagementComponent.jsx

**A. Thêm props và logic check:**

```jsx
const RetakeManagementComponent = ({ 
  student, 
  gradeData, 
  gradeStatus, // ✅ NEW prop
  subjectId, 
  gradeConfig,
  hasExistingGrade,
  onGradeUpdate,
  showDetails 
}) => {
  // ... existing state ...
  
  // ✅ Check if TX/ĐK are approved
  const isTxDkApproved = gradeStatus && (
    gradeStatus.gradeStatus === 'APPROVED_TX_DK' || 
    gradeStatus.gradeStatus === 'FINAL_ENTERED' || 
    gradeStatus.gradeStatus === 'FINALIZED'
  );
  
  // ... rest of code ...
}
```

**B. Conditional rendering:**

```jsx
{/* ✅ Warning message if not approved */}
{hasExistingGrade && analysis.needsAction && !isTxDkApproved && (
  <div style={{
    padding: '6px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#856404',
    marginTop: '4px'
  }}>
    🔒 Chưa duyệt TX/ĐK
  </div>
)}

{/* ✅ Button only shows when approved */}
{hasExistingGrade && analysis.needsAction && isTxDkApproved && (
  <button onClick={handleOpenModal} ...>
    {analysis.actionType === 'RETAKE_COURSE' 
      ? '🔄 Nhập điểm học lại' 
      : '📝 Nhập điểm thi lại'}
  </button>
)}
```

## 📊 Example Scenarios

### Scenario A: Chưa duyệt TX/ĐK

```
Student: Nguyễn Văn A
Grade Status: DRAFT
TX: [8, 7, 9] → TBKT: 8.0
DK: [7, 8] → TBKT: 7.5
Final: 4.5 (< 5)

→ Analysis: needsAction = true, actionType = 'RETAKE_EXAM'
→ isTxDkApproved = false
→ Display: 🔒 Chưa duyệt TX/ĐK (warning box)
→ Button: ❌ KHÔNG hiển thị
```

### Scenario B: Đã duyệt TX/ĐK

```
Student: Nguyễn Văn A
Grade Status: APPROVED_TX_DK  ← Admin đã duyệt
TX: [8, 7, 9] → TBKT: 8.0
DK: [7, 8] → TBKT: 7.5
Final: 4.5 (< 5)

→ Analysis: needsAction = true, actionType = 'RETAKE_EXAM'
→ isTxDkApproved = true ✅
→ Display: Badge "🔴 Cần thi lại"
→ Button: ✅ "📝 Nhập điểm thi lại" HIỂN THỊ
→ Click → Mở modal nhập điểm
```

### Scenario C: TBKT < 5 (Cần học lại)

```
Student: Nguyễn Văn B
Grade Status: DRAFT
TX: [4, 3, 5] → TBKT: 4.0 (< 5)
DK: [4, 5] → TBKT: 4.5

→ Analysis: needsAction = true, actionType = 'RETAKE_COURSE'
→ isTxDkApproved = false
→ Display: 🔒 Chưa duyệt TX/ĐK
→ Button: ❌ KHÔNG hiển thị

--- After Admin Approves ---

Grade Status: APPROVED_TX_DK
→ isTxDkApproved = true ✅
→ Display: Badge "🔴 Cần học lại"
→ Button: ✅ "🔄 Nhập điểm học lại" HIỂN THỊ
```

## 🎨 Visual Styling

### Warning Box Style (Chưa duyệt)

```css
{
  padding: '6px',
  backgroundColor: '#fff3cd',    /* Yellow background */
  border: '1px solid #ffc107',  /* Warning yellow border */
  borderRadius: '4px',
  fontSize: '11px',
  color: '#856404',             /* Dark yellow text */
  marginTop: '4px'
}
```

### Button Style (Đã duyệt)

**Thi lại:**
```css
{
  backgroundColor: '#007bff',  /* Blue */
  color: 'white',
  fontSize: '12px'
}
```

**Học lại:**
```css
{
  backgroundColor: '#fd7e14',  /* Orange */
  color: 'white',
  fontSize: '12px'
}
```

## 🧪 Testing Checklist

### Test Case 1: Draft Status
- [ ] Create grade with DRAFT status
- [ ] Student needs retake (Final < 5)
- [ ] Expected: Warning box "🔒 Chưa duyệt TX/ĐK"
- [ ] Expected: NO button displayed

### Test Case 2: Pending Review Status
- [ ] Grade with PENDING_REVIEW status
- [ ] Student needs retake
- [ ] Expected: Warning box "🔒 Chưa duyệt TX/ĐK"
- [ ] Expected: NO button displayed

### Test Case 3: Approved TX/ĐK
- [ ] Grade with APPROVED_TX_DK status
- [ ] Student needs retake exam (Final < 5)
- [ ] Expected: NO warning box
- [ ] Expected: Button "📝 Nhập điểm thi lại" displayed
- [ ] Click button → Modal opens ✅

### Test Case 4: Approved + Need Course Retake
- [ ] Grade with APPROVED_TX_DK status
- [ ] Student needs retake course (TBKT < 5)
- [ ] Expected: NO warning box
- [ ] Expected: Button "🔄 Nhập điểm học lại" displayed
- [ ] Click button → Modal opens ✅

### Test Case 5: Final Entered Status
- [ ] Grade with FINAL_ENTERED status
- [ ] Student needs retake
- [ ] Expected: Button displayed (approved)

### Test Case 6: Finalized Status
- [ ] Grade with FINALIZED status
- [ ] Student needs retake
- [ ] Expected: Button displayed (approved)

## 🔍 Debugging

### Check gradeStatus in Browser Console

```javascript
// Open browser console in GradeEntryPage
console.log(gradeStatuses);

// Should show:
{
  1: {
    gradeId: 123,
    gradeStatus: 'APPROVED_TX_DK',  // ← Check this value
    lockStatus: { txLocked: true, dkLocked: true, finalLocked: false },
    ...
  }
}
```

### Check isTxDkApproved in RetakeManagementComponent

Add debug log in component:

```jsx
console.log('[RetakeManagement] isTxDkApproved:', isTxDkApproved);
console.log('[RetakeManagement] gradeStatus:', gradeStatus);
```

Expected output:
```
[RetakeManagement] isTxDkApproved: true
[RetakeManagement] gradeStatus: { gradeId: 123, gradeStatus: 'APPROVED_TX_DK', ... }
```

## 📋 Summary

**Benefit của tính năng:**
- ✅ Ngăn chặn nhập điểm thi lại khi TX/ĐK chưa được kiểm tra
- ✅ Đảm bảo workflow đúng: Duyệt TX/ĐK → Nhập điểm thi → Thi lại
- ✅ Rõ ràng cho admin: Hiển thị lý do lock
- ✅ Không ảnh hưởng existing functionality

**Files Changed:**
1. `frontend/src/components/GradeEntryPageComponent.jsx`
   - Pass gradeStatus to RetakeManagementComponent

2. `frontend/src/components/RetakeManagementComponent.jsx`
   - Add gradeStatus prop
   - Add isTxDkApproved check
   - Conditional rendering based on approval status
   - Show warning box when not approved
