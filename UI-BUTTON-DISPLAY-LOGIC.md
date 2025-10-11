# UI Button Display Logic - Visual Guide

## 🎨 Nút "🔒 Chốt điểm thi tất cả" - Khi nào hiển thị?

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    BUTTON VISIBILITY LOGIC                               │
└─────────────────────────────────────────────────────────────────────────┘

Điều kiện để hiển thị nút (TẤT CẢ phải đúng):

1️⃣  finalScore có giá trị               ✅
    └─> studentGrade.finalScore !== null/undefined/''

2️⃣  Đã lưu vào database                 ✅ NEW!
    └─> gradeStatus.gradeId !== null/undefined

3️⃣  Chưa chốt điểm thi                  ✅
    └─> lockStatus.finalLocked !== true


┌─────────────────────────────────────────────────────────────────────────┐
│                      STATE DIAGRAM                                       │
└─────────────────────────────────────────────────────────────────────────┘

STATE 1: Mới nhập điểm (chưa save)
┌────────────────────────────────────┐
│ TX: [8] DK: [7] Final: [9]        │
│                                    │
│ gradeId: null                      │
│ gradeStatus: undefined             │
│ finalScore: 9 (trong state local)  │
│                                    │
│ Button "Chốt điểm thi": ❌ KHÔNG HIỆN │
│                                    │
│ Lý do: Chưa có gradeId            │
└────────────────────────────────────┘
         │
         │ Admin nhấn "💾 Lưu điểm"
         ▼
         
STATE 2: Đã lưu, chưa chốt
┌────────────────────────────────────┐
│ TX: [8] DK: [7] Final: [9]        │
│                                    │
│ gradeId: 123 ✅                    │
│ gradeStatus: 'FINAL_ENTERED'       │
│ finalScore: 9                      │
│ lockStatus.finalLocked: false      │
│                                    │
│ Button "Chốt điểm thi": ✅ HIỂN THỊ │
│                                    │
│ Có thể nhấn nút để chốt           │
└────────────────────────────────────┘
         │
         │ Admin nhấn "🔒 Chốt điểm thi tất cả"
         ▼
         
STATE 3: Đã chốt
┌────────────────────────────────────┐
│ TX: [8] DK: [7] Final: [9]        │ (disabled, màu xám)
│                                    │
│ gradeId: 123                       │
│ gradeStatus: 'FINALIZED'           │
│ finalScore: 9                      │
│ lockStatus.finalLocked: true ✅    │
│                                    │
│ Button "Chốt điểm thi": ❌ KHÔNG HIỆN │
│                                    │
│ Lý do: Đã chốt rồi                │
└────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                   CODE LOGIC BREAKDOWN                                   │
└─────────────────────────────────────────────────────────────────────────┘

students.some(s => {
  const studentGrade = grades[s.id];           // State local (chưa save)
  const gradeStatus = gradeStatuses[s.id];     // Data từ DB (đã save)
  
  // ❌ Condition 1: Chưa nhập điểm thi
  if (!studentGrade?.finalScore) return false;
  
  // ❌ Condition 2: Chưa lưu vào DB (NEW!)
  if (!gradeStatus?.gradeId) return false;
  
  // ❌ Condition 3: Đã chốt rồi
  let lockStatus = gradeStatus?.lockStatus;
  if (typeof lockStatus === 'string') {
    lockStatus = JSON.parse(lockStatus);
  }
  return lockStatus?.finalLocked !== true;
  
  // ✅ Tất cả điều kiện đều đúng → Show button
})


┌─────────────────────────────────────────────────────────────────────────┐
│                      EXAMPLE SCENARIOS                                   │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Scenario A: Lần đầu nhập điểm                                            │
├──────────────────────────────────────────────────────────────────────────┤
│ Step 1: Admin mở trang nhập điểm                                         │
│         grades = {}                                                       │
│         gradeStatuses = {}                                                │
│         Button: ❌ (chưa có finalScore)                                   │
│                                                                           │
│ Step 2: Admin nhập TX=8, DK=7                                            │
│         grades[1] = { txScore: {tx1:8}, dkScore: {dk1:7} }               │
│         gradeStatuses = {} (chưa có)                                      │
│         Button: ❌ (chưa có finalScore)                                   │
│                                                                           │
│ Step 3: Admin nhập Final=9                                               │
│         grades[1] = { ..., finalScore: 9 }                                │
│         gradeStatuses = {} (chưa có)                                      │
│         Button: ❌ (chưa có gradeId) ⭐ NEW BEHAVIOR                      │
│                                                                           │
│ Step 4: Admin nhấn "💾 Lưu điểm"                                         │
│         Backend lưu vào DB                                                │
│         gradeStatuses[1] = {                                              │
│           gradeId: 123,                                                   │
│           gradeStatus: 'FINAL_ENTERED',                                   │
│           lockStatus: {finalLocked: false}                                │
│         }                                                                 │
│         Button: ✅ HIỂN THỊ (có gradeId + finalScore + chưa lock)        │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Scenario B: Update điểm thi cho grade đã có                              │
├──────────────────────────────────────────────────────────────────────────┤
│ Step 1: Grade đã tồn tại (TX=8, DK=7, Final=null)                        │
│         gradeStatuses[1] = {                                              │
│           gradeId: 123,                                                   │
│           gradeStatus: 'DRAFT',                                           │
│           lockStatus: {finalLocked: false}                                │
│         }                                                                 │
│         Button: ❌ (chưa có finalScore)                                   │
│                                                                           │
│ Step 2: Admin nhập Final=8.5                                             │
│         grades[1] = { ..., finalScore: 8.5 }                              │
│         gradeStatuses[1] vẫn giữ nguyên                                   │
│         Button: ❌ (gradeId có nhưng chưa lưu finalScore vào DB)         │
│                  ⭐ gradeStatuses vẫn là data cũ từ DB                   │
│                                                                           │
│ Step 3: Admin nhấn "💾 Lưu điểm"                                         │
│         Backend update DB                                                 │
│         gradeStatuses[1] = {                                              │
│           gradeId: 123,                                                   │
│           gradeStatus: 'FINAL_ENTERED', ⭐ changed                        │
│           lockStatus: {finalLocked: false}                                │
│         }                                                                 │
│         Button: ✅ HIỂN THỊ                                              │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Scenario C: Chốt điểm thi                                                │
├──────────────────────────────────────────────────────────────────────────┤
│ Step 1: Grade có status FINAL_ENTERED                                    │
│         Button: ✅ HIỂN THỊ                                              │
│                                                                           │
│ Step 2: Admin nhấn "🔒 Chốt điểm thi tất cả"                            │
│         Backend:                                                          │
│         - gradeStatus → FINALIZED                                         │
│         - lockStatus.finalLocked → true                                   │
│                                                                           │
│         Frontend update state:                                            │
│         gradeStatuses[1] = {                                              │
│           gradeId: 123,                                                   │
│           gradeStatus: 'FINALIZED',                                       │
│           lockStatus: {finalLocked: true} ⭐                              │
│         }                                                                 │
│         Button: ❌ BIẾN MẤT (finalLocked = true)                         │
└──────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                    TRUTH TABLE                                           │
└─────────────────────────────────────────────────────────────────────────┘

finalScore | gradeId | finalLocked | Button Display | Reason
-----------+---------+-------------+----------------+------------------------
   null    |   null  |    false    |      ❌        | Chưa nhập điểm thi
   null    |   123   |    false    |      ❌        | Chưa nhập điểm thi
   9       |   null  |    false    |      ❌        | Chưa lưu vào DB ⭐ NEW
   9       |   123   |    false    |      ✅        | OK - Hiển thị nút
   9       |   123   |    true     |      ❌        | Đã chốt rồi


┌─────────────────────────────────────────────────────────────────────────┐
│                  BUTTON APPEARANCE                                       │
└─────────────────────────────────────────────────────────────────────────┘

WHEN HIDDEN (❌):
┌────────────────────────┐
│   💾 Lưu điểm         │  ← Only save button
└────────────────────────┘

WHEN VISIBLE (✅):
┌────────────────────────┬───────────────────────────┐
│   💾 Lưu điểm         │  🔒 Chốt điểm thi tất cả │
└────────────────────────┴───────────────────────────┘

AFTER LOCKED (❌):
┌────────────────────────┐
│   💾 Lưu điểm         │  ← Lock button disappears
└────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                    TESTING GUIDE                                         │
└─────────────────────────────────────────────────────────────────────────┘

Test 1: First Time Entry
✅ Open page → Button NOT visible
✅ Enter Final score → Button STILL NOT visible ⭐
✅ Click "Lưu điểm" → Button NOW visible
✅ Click "Chốt điểm thi" → Button disappears

Test 2: Update Existing Grade
✅ Load grade (TX=8, DK=7, no Final) → Button NOT visible
✅ Enter Final=9 → Button STILL NOT visible ⭐
✅ Click "Lưu điểm" → Button NOW visible
✅ Click "Chốt điểm thi" → Button disappears

Test 3: Multiple Students
✅ 3 students, 2 with Final, 1 without
✅ Before save → Button NOT visible
✅ After save → Button visible (2 students have Final)
✅ After lock all → Button disappears

Test 4: Reload Page
✅ Grade already saved with Final, not locked
✅ Page reload → Button visible immediately
✅ (Because gradeStatus already has gradeId from DB)
