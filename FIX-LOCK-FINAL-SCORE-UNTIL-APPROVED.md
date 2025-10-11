# Fix: Lock Cột Điểm Thi Khi Chưa Duyệt TX/ĐK

## 🐛 Vấn đề

**Hiện tượng:**
- Admin chưa duyệt điểm TX, ĐK (status = DRAFT hoặc PENDING_REVIEW)
- Nhưng cột điểm thi (finalScore) vẫn KHÔNG bị lock
- Admin có thể nhập điểm thi trước khi duyệt TX/ĐK

**Vấn đề:**
- Vi phạm workflow: Phải duyệt TX/ĐK → Nhập điểm thi → Chốt điểm
- Không nhất quán với logic lock điểm thi lại (đã fix trước đó)

## ✅ Giải pháp

Cập nhật hàm `isFieldLocked()` để check status duyệt TX/ĐK trước khi cho phép nhập điểm thi.

### Logic mới:

```javascript
if (fieldName === 'finalScore') {
  // 1️⃣ KIỂM TRA DUYỆT TX/ĐK TRƯỚC
  const currentStatus = gradeStatus.gradeStatus;
  const isTxDkApproved = currentStatus === 'APPROVED_TX_DK' || 
                        currentStatus === 'FINAL_ENTERED' || 
                        currentStatus === 'FINALIZED';
  
  if (!isTxDkApproved) {
    return true; // 🔒 KHÓA nếu chưa duyệt TX/ĐK
  }
  
  // 2️⃣ Nếu đã duyệt → Check finalLocked
  return lockStatus.finalLocked === true;
}
```

## 📊 Truth Table

| Grade Status    | isTxDkApproved | finalLocked | isFieldLocked('finalScore') | Can Enter? |
|-----------------|----------------|-------------|----------------------------|------------|
| DRAFT           | false          | false       | **true** 🔒                | ❌ NO      |
| PENDING_REVIEW  | false          | false       | **true** 🔒                | ❌ NO      |
| APPROVED_TX_DK  | true ✅        | false       | false                      | ✅ YES     |
| FINAL_ENTERED   | true ✅        | false       | false                      | ✅ YES     |
| FINAL_ENTERED   | true ✅        | true        | **true** 🔒                | ❌ NO      |
| FINALIZED       | true ✅        | true        | **true** 🔒                | ❌ NO      |

## 🔄 Workflow Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FINAL SCORE INPUT WORKFLOW                            │
└─────────────────────────────────────────────────────────────────────────┘

STATE 1: DRAFT (Chưa duyệt)
┌────────────────────────────────────┐
│ Grade Status: DRAFT                │
│ TX: [8, 7] ĐK: [7]                │
│                                    │
│ Input điểm thi:                    │
│ ┌────────────────┐                │
│ │ [____] 🔒      │  ← DISABLED    │
│ └────────────────┘                │
│                                    │
│ Tooltip: "🔒 Phải duyệt TX/ĐK    │
│           trước khi nhập điểm thi"│
└────────────────────────────────────┘
         │
         │ Admin nhấn "Duyệt tất cả"
         ▼

STATE 2: APPROVED_TX_DK (Đã duyệt)
┌────────────────────────────────────┐
│ Grade Status: APPROVED_TX_DK       │
│ TX: [8, 7] ĐK: [7]                │
│                                    │
│ Input điểm thi:                    │
│ ┌────────────────┐                │
│ │ [____] ✅      │  ← ENABLED     │
│ └────────────────┘                │
│                                    │
│ Tooltip: "Nhập điểm thi cuối kỳ" │
│ Admin có thể nhập điểm            │
└────────────────────────────────────┘
         │
         │ Admin nhập Final = 8.5
         │ Nhấn "Lưu điểm"
         ▼

STATE 3: FINAL_ENTERED (Đã nhập điểm thi)
┌────────────────────────────────────┐
│ Grade Status: FINAL_ENTERED        │
│ Final: [8.5] ✅                   │
│ finalLocked: false                 │
│                                    │
│ Input điểm thi:                    │
│ ┌────────────────┐                │
│ │ [8.5__] ✅     │  ← ENABLED     │
│ └────────────────┘                │
│                                    │
│ Có thể sửa điểm thi               │
└────────────────────────────────────┘
         │
         │ Admin nhấn "🔒 Chốt điểm thi tất cả"
         ▼

STATE 4: FINALIZED (Đã chốt)
┌────────────────────────────────────┐
│ Grade Status: FINALIZED            │
│ Final: [8.5]                       │
│ finalLocked: true                  │
│                                    │
│ Input điểm thi:                    │
│ ┌────────────────┐                │
│ │ [8.5__] 🔒     │  ← DISABLED    │
│ └────────────────┘                │
│                                    │
│ Tooltip: "🔒 Điểm đã chốt"       │
└────────────────────────────────────┘
```

## 🔧 Code Changes

### File: `frontend/src/components/GradeEntryPageComponent.jsx`

**Function:** `isFieldLocked(studentId, fieldName)`

**BEFORE (Bug):**
```javascript
if (fieldName === 'finalScore') {
  let lockStatus = gradeStatus.lockStatus;
  if (!lockStatus) {
    return false; // ❌ Mở ngay, không check status
  }
  
  return lockStatus.finalLocked === true;
}
```

**AFTER (Fixed):**
```javascript
if (fieldName === 'finalScore') {
  // ✅ CHECK DUYỆT TX/ĐK TRƯỚC
  const currentStatus = gradeStatus.gradeStatus;
  const isTxDkApproved = currentStatus === 'APPROVED_TX_DK' || 
                        currentStatus === 'FINAL_ENTERED' || 
                        currentStatus === 'FINALIZED';
  
  if (!isTxDkApproved) {
    console.log(`[isFieldLocked] Student ${studentId} finalScore: LOCKED (TX/ĐK chưa duyệt, status=${currentStatus})`);
    return true; // 🔒 KHÓA nếu chưa duyệt TX/ĐK
  }
  
  // ✅ Đã duyệt → Check finalLocked
  let lockStatus = gradeStatus.lockStatus;
  if (!lockStatus) {
    return false;
  }
  
  return lockStatus.finalLocked === true;
}
```

## 📝 Example Scenarios

### Scenario 1: Chưa duyệt TX/ĐK

```javascript
// Input:
gradeStatus = {
  gradeId: 123,
  gradeStatus: 'DRAFT',  // ← Chưa duyệt
  lockStatus: { txLocked: false, dkLocked: false, finalLocked: false }
}

// Call:
isFieldLocked(studentId, 'finalScore')

// Logic:
currentStatus = 'DRAFT'
isTxDkApproved = false  // ❌ DRAFT không phải APPROVED_TX_DK
→ return true  // 🔒 LOCK

// Result:
<input 
  disabled={true}  // ← Field bị disable
  style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
  title="🔒 Phải duyệt TX/ĐK trước khi nhập điểm thi"
/>
```

### Scenario 2: Đã duyệt TX/ĐK

```javascript
// Input:
gradeStatus = {
  gradeId: 123,
  gradeStatus: 'APPROVED_TX_DK',  // ← Đã duyệt ✅
  lockStatus: { txLocked: true, dkLocked: true, finalLocked: false }
}

// Call:
isFieldLocked(studentId, 'finalScore')

// Logic:
currentStatus = 'APPROVED_TX_DK'
isTxDkApproved = true  // ✅ Match!
→ Check finalLocked
lockStatus.finalLocked = false
→ return false  // Mở khóa

// Result:
<input 
  disabled={false}  // ← Field enabled
  style={{ backgroundColor: 'white', cursor: 'text' }}
  title="Nhập điểm thi cuối kỳ"
/>
```

### Scenario 3: Đã chốt điểm thi

```javascript
// Input:
gradeStatus = {
  gradeId: 123,
  gradeStatus: 'FINALIZED',  // ← Đã chốt
  lockStatus: { txLocked: true, dkLocked: true, finalLocked: true }
}

// Call:
isFieldLocked(studentId, 'finalScore')

// Logic:
currentStatus = 'FINALIZED'
isTxDkApproved = true  // ✅ FINALIZED is approved
→ Check finalLocked
lockStatus.finalLocked = true  // 🔒
→ return true  // LOCK

// Result:
<input 
  disabled={true}  // ← Field bị disable
  style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
  title="🔒 Điểm đã chốt - Dùng nút Mở khóa nếu cần sửa"
/>
```

## 🎨 UI Behavior

### Cột điểm thi - Visual States

**State 1: DRAFT (Locked)**
```
┌─────────────────────────────────────┐
│ Điểm thi                            │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ [________] 🔒                   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Style:                              │
│ - backgroundColor: #f8f9fa (gray)   │
│ - cursor: not-allowed              │
│ - color: #6c757d (gray text)       │
│                                     │
│ Tooltip:                            │
│ "🔒 Phải duyệt TX/ĐK trước khi     │
│  nhập điểm thi"                     │
└─────────────────────────────────────┘
```

**State 2: APPROVED_TX_DK (Unlocked)**
```
┌─────────────────────────────────────┐
│ Điểm thi                            │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ [________] ✅                   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Style:                              │
│ - backgroundColor: white            │
│ - cursor: text                     │
│ - color: inherit (black)            │
│                                     │
│ Tooltip:                            │
│ "Nhập điểm thi cuối kỳ"            │
└─────────────────────────────────────┘
```

**State 3: FINALIZED (Locked)**
```
┌─────────────────────────────────────┐
│ Điểm thi                            │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ [8.5_____] 🔒                   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Style:                              │
│ - backgroundColor: #f8f9fa (gray)   │
│ - cursor: not-allowed              │
│ - color: #6c757d (gray text)       │
│                                     │
│ Tooltip:                            │
│ "🔒 Điểm đã chốt - Dùng nút Mở khóa│
│  nếu cần sửa"                       │
└─────────────────────────────────────┘
```

## 🧪 Testing Checklist

### Test Case 1: DRAFT Status
- [ ] Create grade with DRAFT status
- [ ] Try to click on finalScore input
- [ ] Expected: Input is disabled (gray background)
- [ ] Expected: Cursor shows "not-allowed"
- [ ] Expected: Tooltip shows "🔒 Phải duyệt TX/ĐK..."

### Test Case 2: PENDING_REVIEW Status
- [ ] Grade with PENDING_REVIEW status
- [ ] Try to enter final score
- [ ] Expected: Input is disabled
- [ ] Expected: Same locked behavior as DRAFT

### Test Case 3: Admin Duyệt TX/ĐK
- [ ] Grade with DRAFT status (locked)
- [ ] Admin nhấn "Duyệt tất cả"
- [ ] Status changes to APPROVED_TX_DK
- [ ] Expected: finalScore input becomes ENABLED ✅
- [ ] Expected: White background, can type

### Test Case 4: APPROVED_TX_DK Status
- [ ] Grade already approved (APPROVED_TX_DK)
- [ ] finalLocked = false
- [ ] Expected: finalScore input is UNLOCKED
- [ ] Type "8.5" → Should work ✅

### Test Case 5: After Chốt Điểm Thi
- [ ] Grade with FINAL_ENTERED status
- [ ] Admin nhấn "🔒 Chốt điểm thi tất cả"
- [ ] Status → FINALIZED, finalLocked = true
- [ ] Expected: finalScore input becomes LOCKED again 🔒

### Test Case 6: Nút Mở Khóa
- [ ] Finalized grade (locked)
- [ ] Admin nhấn "Mở khóa" trong cột Thao tác
- [ ] unlockedStudents.add(studentId)
- [ ] Expected: finalScore UNLOCKED (manual unlock overrides)

## 🔍 Debug Console Logs

The updated code includes console.log statements:

```javascript
console.log(`[isFieldLocked] Student ${studentId} finalScore: LOCKED (TX/ĐK chưa duyệt, status=${currentStatus})`);
console.log(`[isFieldLocked] Student ${studentId} finalScore: ${isLocked ? 'LOCKED' : 'UNLOCKED'} (finalLocked=${lockStatus.finalLocked})`);
```

**Example output in console:**

```
[isFieldLocked] Student 101 finalScore: LOCKED (TX/ĐK chưa duyệt, status=DRAFT)
[isFieldLocked] Student 102 finalScore: UNLOCKED (finalLocked=false)
[isFieldLocked] Student 103 finalScore: LOCKED (finalLocked=true)
```

## 📋 Summary

**Before Fix:**
- ❌ Cột điểm thi mở ngay cả khi chưa duyệt TX/ĐK
- ❌ Vi phạm workflow
- ❌ Không nhất quán với logic retake

**After Fix:**
- ✅ Cột điểm thi khóa khi chưa duyệt TX/ĐK
- ✅ Mở khóa sau khi duyệt (APPROVED_TX_DK+)
- ✅ Khóa lại sau khi chốt (FINALIZED)
- ✅ Nhất quán với logic retake score
- ✅ Workflow đúng: Duyệt TX/ĐK → Nhập điểm thi → Chốt điểm

**Benefit:**
- 🎯 Đảm bảo quy trình đúng
- 🔒 Tăng tính bảo mật dữ liệu
- 📊 Dữ liệu điểm chính xác hơn
- 👥 UX tốt hơn cho admin
