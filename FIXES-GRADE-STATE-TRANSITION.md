# Fixes - GradeStateTransition & Button Display Logic

## 🐛 Vấn đề đã sửa

### Issue 1: ❌ GradeStateTransition không tạo record khi lưu điểm thi

**Vấn đề:**
- Khi admin nhập điểm thi và lưu, gradeStatus tự động chuyển từ `DRAFT` → `FINAL_ENTERED`
- Nhưng không có record nào được tạo trong bảng `grade_state_transitions`
- Điều này làm mất track lịch sử chuyển đổi trạng thái

**Nguyên nhân:**
- File `grade.bulk.service.js` không import `GradeStateTransition` model
- Không có code tạo transition record khi status thay đổi

**Giải pháp:**

#### A. Import GradeStateTransition Model

```javascript
// backend/src/services/grade.bulk.service.js
import { GradeStateTransition } from '../database/index.js';
```

#### B. Tạo Transition Record khi UPDATE grade

```javascript
// Khi update grade và có thay đổi status
if (hasStatusChange && oldGradeStatus !== newGradeStatus) {
    await GradeStateTransition.create({
        gradeId: grade.id,
        fromState: oldGradeStatus,
        toState: newGradeStatus,
        triggeredBy: session?.adminUser?.id,
        reason: `Admin nhập điểm thi${statusReason}`
    }, txOptions);
}
```

**Ví dụ record được tạo:**
```json
{
  "gradeId": 123,
  "fromState": "DRAFT",
  "toState": "FINAL_ENTERED",
  "triggeredBy": 1,
  "reason": "Admin nhập điểm thi - Chuyển sang FINAL_ENTERED do nhập điểm thi lần đầu",
  "createdAt": "2025-01-10 14:30:00"
}
```

#### C. Tạo Transition Record khi CREATE grade mới

```javascript
// Khi tạo grade mới với điểm thi ngay từ đầu
if (hasStatusChange && initialStatus === 'FINAL_ENTERED') {
    await GradeStateTransition.create({
        gradeId: grade.id,
        fromState: 'DRAFT',
        toState: 'FINAL_ENTERED',
        triggeredBy: session?.adminUser?.id,
        reason: 'Admin tạo điểm mới với điểm thi'
    }, txOptions);
}
```

**Ví dụ record được tạo:**
```json
{
  "gradeId": 124,
  "fromState": "DRAFT",
  "toState": "FINAL_ENTERED",
  "triggeredBy": 1,
  "reason": "Admin tạo điểm mới với điểm thi",
  "createdAt": "2025-01-10 14:32:00"
}
```

---

### Issue 2: ❌ Nút "Chốt điểm thi tất cả" hiển thị khi lần đầu nhập điểm

**Vấn đề:**
- Khi admin lần đầu nhập điểm thi (chưa nhấn "Lưu điểm")
- Nút "🔒 Chốt điểm thi tất cả" đã hiển thị ngay
- Nhưng chưa có gì để chốt vì chưa lưu vào database

**Nguyên nhân:**
- Logic chỉ check `finalScore` có giá trị hay không
- Không check xem grade đã được lưu vào DB chưa (có `gradeId` chưa)

**Giải pháp:**

```javascript
// frontend/src/components/GradeEntryPageComponent.jsx

{students.some(s => {
  const studentGrade = grades[s.id];
  const gradeStatus = gradeStatuses[s.id];
  
  // Check có finalScore
  if (!studentGrade?.finalScore) return false;
  
  // ✅ NEW: Check đã lưu vào DB (có gradeId)
  if (!gradeStatus?.gradeId) return false;
  
  // Check finalLocked = false
  let lockStatus = gradeStatus?.lockStatus;
  // ... (rest of code)
  
  return lockStatus?.finalLocked !== true;
}) && (
  <button onClick={handleBulkLockFinalScore}>
    🔒 Chốt điểm thi tất cả
  </button>
)}
```

**Logic mới:**
1. ✅ Check `finalScore` có giá trị
2. ✅ **NEW:** Check `gradeStatus.gradeId` tồn tại (đã lưu vào DB)
3. ✅ Check `finalLocked = false` (chưa chốt)

**Behavior mới:**
- Lần đầu nhập điểm thi → Nút **KHÔNG** hiển thị ❌
- Sau khi nhấn "💾 Lưu điểm" → Nút **HIỂN THỊ** ✅
- Sau khi nhấn "🔒 Chốt điểm thi" → Nút **BIẾN MẤT** ❌

---

## 📊 Flow hoàn chỉnh

### Scenario 1: Nhập điểm mới với điểm thi

```
1️⃣ Admin nhập: TX=8, DK=7, Final=9
   ↓
   UI: Nút "💾 Lưu điểm" sáng
   UI: Nút "🔒 Chốt điểm thi tất cả" KHÔNG hiện ❌
   
2️⃣ Admin nhấn "💾 Lưu điểm"
   ↓
   Backend:
   - Save to grades table
   - gradeStatus = 'FINAL_ENTERED'
   - Create GradeHistory record
   - ✅ Create GradeStateTransition record:
     {
       fromState: 'DRAFT',
       toState: 'FINAL_ENTERED',
       reason: 'Admin tạo điểm mới với điểm thi'
     }
   ↓
   Frontend:
   - gradeStatuses[studentId].gradeId = 123 (có gradeId)
   - gradeStatuses[studentId].gradeStatus = 'FINAL_ENTERED'
   ↓
   UI: Nút "🔒 Chốt điểm thi tất cả" HIỂN THỊ ✅
   
3️⃣ Admin nhấn "🔒 Chốt điểm thi tất cả"
   ↓
   Backend:
   - gradeStatus = 'FINALIZED'
   - lockStatus.finalLocked = true
   - ✅ Create GradeStateTransition record:
     {
       fromState: 'FINAL_ENTERED',
       toState: 'FINALIZED',
       reason: 'Admin chốt điểm thi - Chuyển sang FINALIZED'
     }
   ↓
   UI: Nút "🔒 Chốt điểm thi tất cả" BIẾN MẤT ❌
```

### Scenario 2: Update điểm thi cho grade đã tồn tại

```
1️⃣ Grade hiện tại: TX=8, DK=7, Final=null, Status=DRAFT
   ↓
   UI: Nút "🔒 Chốt điểm thi tất cả" KHÔNG hiện (chưa có final)
   
2️⃣ Admin nhập thêm: Final=9
   ↓
   UI: Nút "🔒 Chốt điểm thi tất cả" vẫn KHÔNG hiện (chưa lưu)
   
3️⃣ Admin nhấn "💾 Lưu điểm"
   ↓
   Backend:
   - Update grades: finalScore=9
   - gradeStatus: DRAFT → FINAL_ENTERED
   - ✅ Create GradeStateTransition record:
     {
       fromState: 'DRAFT',
       toState: 'FINAL_ENTERED',
       reason: 'Admin nhập điểm thi - Chuyển sang FINAL_ENTERED do nhập điểm thi lần đầu'
     }
   ↓
   UI: Nút "🔒 Chốt điểm thi tất cả" HIỂN THỊ ✅
```

---

## 🧪 Testing Checklist

### Test Case 1: GradeStateTransition được tạo
- [ ] Tạo grade mới với finalScore
- [ ] Nhấn "Lưu điểm"
- [ ] Check DB: `SELECT * FROM grade_state_transitions WHERE gradeId = ?`
- [ ] Expected: 1 record với fromState='DRAFT', toState='FINAL_ENTERED'

### Test Case 2: Update grade thêm finalScore
- [ ] Grade có TX, DK, chưa có Final, status=DRAFT
- [ ] Nhập Final, nhấn "Lưu điểm"
- [ ] Check DB: `SELECT * FROM grade_state_transitions WHERE gradeId = ?`
- [ ] Expected: 1 record mới với transition DRAFT → FINAL_ENTERED

### Test Case 3: Chốt điểm thi tạo transition
- [ ] Grade có status=FINAL_ENTERED
- [ ] Nhấn "Chốt điểm thi tất cả"
- [ ] Check DB: `SELECT * FROM grade_state_transitions WHERE gradeId = ?`
- [ ] Expected: 2 records total (1 từ save, 1 từ lock)

### Test Case 4: Nút "Chốt điểm thi tất cả" logic
- [ ] **BEFORE save:** Nhập finalScore → Nút KHÔNG hiện ❌
- [ ] **AFTER save:** Nhấn "Lưu điểm" → Nút HIỂN THỊ ✅
- [ ] **AFTER lock:** Nhấn "Chốt điểm thi" → Nút BIẾN MẤT ❌

---

## 📝 Database Query Examples

### Xem tất cả transitions cho 1 grade

```sql
SELECT 
  gst.id,
  gst.fromState,
  gst.toState,
  u.username as triggered_by,
  gst.reason,
  gst.createdAt
FROM grade_state_transitions gst
LEFT JOIN users u ON gst.triggeredBy = u.id
WHERE gst.gradeId = 123
ORDER BY gst.createdAt ASC;
```

**Expected Output:**
```
id | fromState      | toState        | triggered_by | reason                           | createdAt
---+----------------+----------------+--------------+----------------------------------+---------------------
1  | DRAFT          | FINAL_ENTERED  | admin        | Admin nhập điểm thi - Chuyển...  | 2025-01-10 14:30:00
2  | FINAL_ENTERED  | FINALIZED      | admin        | Admin chốt điểm thi - Chuyển...  | 2025-01-10 15:00:00
```

### Xem grades có finalScore nhưng chưa chốt

```sql
SELECT 
  g.id,
  g.studentId,
  g.finalScore,
  g.gradeStatus,
  JSON_EXTRACT(g.lockStatus, '$.finalLocked') as finalLocked,
  COUNT(gst.id) as transition_count
FROM grades g
LEFT JOIN grade_state_transitions gst ON g.id = gst.gradeId
WHERE g.finalScore IS NOT NULL
  AND g.gradeStatus = 'FINAL_ENTERED'
  AND JSON_EXTRACT(g.lockStatus, '$.finalLocked') = false
GROUP BY g.id;
```

---

## 🔍 Verification Steps

1. **Check GradeStateTransition creation:**
   ```sql
   SELECT COUNT(*) FROM grade_state_transitions 
   WHERE createdAt >= NOW() - INTERVAL 1 HOUR;
   ```

2. **Check grade status consistency:**
   ```sql
   -- Grades with finalScore should have transitions
   SELECT g.id, g.gradeStatus, COUNT(gst.id) as transitions
   FROM grades g
   LEFT JOIN grade_state_transitions gst ON g.id = gst.gradeId
   WHERE g.finalScore IS NOT NULL
   GROUP BY g.id
   HAVING transitions = 0;  -- Should be empty!
   ```

3. **UI button visibility:**
   - Open browser DevTools
   - Check: `gradeStatuses[studentId].gradeId` exists
   - Check: Button only shows after save

---

## ✅ Summary

**Files Changed:**
1. `backend/src/services/grade.bulk.service.js`
   - Added GradeStateTransition import
   - Create transition record on UPDATE
   - Create transition record on CREATE

2. `frontend/src/components/GradeEntryPageComponent.jsx`
   - Added `gradeId` check before showing lock button

**Benefits:**
- ✅ Complete audit trail in GradeStateTransition table
- ✅ Better UX - button only shows when there's something to lock
- ✅ Prevents confusion when first entering grades
- ✅ Maintains data integrity and history
