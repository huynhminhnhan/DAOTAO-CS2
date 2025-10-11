# Retake Score Entry Lock - Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  RETAKE SCORE ENTRY PERMISSION FLOW                      │
└─────────────────────────────────────────────────────────────────────────┘

                            START
                              │
                              ▼
                    ┌─────────────────┐
                    │ Admin nhập điểm │
                    │ TX, ĐK, Final   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Lưu điểm vào DB │
                    │ Status = DRAFT  │
                    └────────┬────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  Final Score < 5?    │
                  │  (Cần thi lại)       │
                  └──────┬────────┬──────┘
                     NO  │        │  YES
                         │        │
                ┌────────▼────┐   │
                │ ✅ Đã đạt   │   │
                │ Không cần   │   │
                │ thi lại     │   │
                └─────────────┘   │
                                  ▼
                         ┌────────────────┐
                         │ TBKT < 5?      │
                         │ (Cần học lại)  │
                         └───┬────────┬───┘
                         NO  │        │  YES
                             │        │
                    ┌────────▼────┐   └──────┐
                    │ Cần TH I LẠI│          │
                    └────────┬────┘          │
                             │               │
                             ▼               ▼
                    ┌────────────────┐  ┌────────────────┐
                    │ Grade Status?  │  │ Cần HỌC LẠI   │
                    └───┬────────────┘  └────────┬───────┘
                        │                        │
         ┌──────────────┼──────────────┐        │
         │              │              │        │
         ▼              ▼              ▼        ▼
  ┌───────────┐  ┌──────────┐  ┌──────────┐  (Same check)
  │   DRAFT   │  │ PENDING  │  │APPROVED  │
  │           │  │  REVIEW  │  │ TX_DK    │
  └─────┬─────┘  └─────┬────┘  └────┬─────┘
        │              │             │
        └──────┬───────┘             │
               │                     │
               ▼                     ▼
      ┌────────────────┐    ┌────────────────┐
      │ 🔒 LOCKED      │    │ ✅ UNLOCKED    │
      │                │    │                │
      │ Hiển thị:      │    │ Hiển thị:      │
      │ Warning box    │    │ Action button  │
      │ "Chưa duyệt   │    │ "Nhập điểm     │
      │  TX/ĐK"        │    │  thi lại"      │
      └────────────────┘    └────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                      PERMISSION MATRIX                                   │
└─────────────────────────────────────────────────────────────────────────┘

Grade Status      | isTxDkApproved | Show Warning | Show Button | Can Enter
------------------+----------------+--------------+-------------+----------
DRAFT             |     false      |     ✅       |     ❌      |    ❌
PENDING_REVIEW    |     false      |     ✅       |     ❌      |    ❌
APPROVED_TX_DK    |     true       |     ❌       |     ✅      |    ✅
FINAL_ENTERED     |     true       |     ❌       |     ✅      |    ✅
FINALIZED         |     true       |     ❌       |     ✅      |    ✅
null/undefined    |     false      |     ✅       |     ❌      |    ❌


┌─────────────────────────────────────────────────────────────────────────┐
│                    UI COMPONENT TREE                                     │
└─────────────────────────────────────────────────────────────────────────┘

GradeEntryPageComponent
│
├─ State: gradeStatuses
│  └─ { studentId: { gradeId, gradeStatus, lockStatus, ... } }
│
└─ Table → Row → Cell "Thi lại/Học lại"
   │
   └─ <RetakeManagementComponent
      │  student={...}
      │  gradeData={...}
      │  gradeStatus={gradeStatuses[student.id]}  ← PASS gradeStatus
      │  ...
      />
      │
      ├─ const isTxDkApproved = CHECK gradeStatus
      │  └─ APPROVED_TX_DK || FINAL_ENTERED || FINALIZED
      │
      ├─ IF needsAction && !isTxDkApproved
      │  └─ <div>🔒 Chưa duyệt TX/ĐK</div>
      │
      └─ IF needsAction && isTxDkApproved
         └─ <button>📝 Nhập điểm thi lại</button>


┌─────────────────────────────────────────────────────────────────────────┐
│                       BEFORE vs AFTER                                    │
└─────────────────────────────────────────────────────────────────────────┘

BEFORE (Không có lock):
┌──────────────────────────────────────────────────────────────────────────┐
│ Grade: DRAFT, Final: 4.5 (< 5)                                           │
│                                                                           │
│ [Cột Thi lại/Học lại]                                                   │
│ ┌───────────────────────┐                                               │
│ │ 🔴 Cần thi lại        │                                               │
│ │ [📝 Nhập điểm thi lại]│  ← Button hiển thị NGAY                       │
│ └───────────────────────┘                                               │
│                                                                           │
│ ⚠️ Vấn đề: Admin có thể nhập điểm thi lại KHI TX/ĐK chưa được duyệt!  │
└──────────────────────────────────────────────────────────────────────────┘

AFTER (Có lock):
┌──────────────────────────────────────────────────────────────────────────┐
│ Grade: DRAFT, Final: 4.5 (< 5)                                           │
│                                                                           │
│ [Cột Thi lại/Học lại]                                                   │
│ ┌───────────────────────┐                                               │
│ │ 🔴 Cần thi lại        │                                               │
│ │ ┌───────────────────┐ │                                               │
│ │ │🔒 Chưa duyệt TX/ĐK│ │  ← Warning box thay vì button                 │
│ │ └───────────────────┘ │                                               │
│ └───────────────────────┘                                               │
│                                                                           │
│ ✅ Admin PHẢI duyệt TX/ĐK trước khi nhập điểm thi lại                  │
└──────────────────────────────────────────────────────────────────────────┘

--- Sau khi Admin duyệt TX/ĐK ---

┌──────────────────────────────────────────────────────────────────────────┐
│ Grade: APPROVED_TX_DK, Final: 4.5 (< 5)                                  │
│                                                                           │
│ [Cột Thi lại/Học lại]                                                   │
│ ┌───────────────────────┐                                               │
│ │ 🔴 Cần thi lại        │                                               │
│ │ ┌───────────────────┐ │                                               │
│ │ │📝 Nhập điểm thi lại│ │  ← Button GIỜ HIỂN THỊ                       │
│ │ └───────────────────┘ │                                               │
│ └───────────────────────┘                                               │
│                                                                           │
│ ✅ Có thể nhập điểm thi lại                                             │
└──────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                    CODE EXECUTION FLOW                                   │
└─────────────────────────────────────────────────────────────────────────┘

1. Page Load: GradeEntryPageComponent
   ↓
2. Fetch grades + gradeStatuses from backend
   ↓
3. Render table with students
   ↓
4. For each student row:
   ├─ Get gradeStatuses[student.id]
   │  Example: { gradeId: 123, gradeStatus: 'DRAFT', ... }
   │
   └─ Pass to RetakeManagementComponent
      ↓
5. RetakeManagementComponent receives:
   - gradeStatus = { gradeStatus: 'DRAFT', ... }
   ↓
6. Calculate isTxDkApproved:
   const isTxDkApproved = gradeStatus && (
     gradeStatus.gradeStatus === 'APPROVED_TX_DK' ||
     gradeStatus.gradeStatus === 'FINAL_ENTERED' ||
     gradeStatus.gradeStatus === 'FINALIZED'
   );
   // Result: false (DRAFT is not approved)
   ↓
7. Render logic:
   if (needsAction && !isTxDkApproved) {
     return <WarningBox>🔒 Chưa duyệt TX/ĐK</WarningBox>
   }
   // Warning box rendered ✅
   
   if (needsAction && isTxDkApproved) {
     return <Button>Nhập điểm thi lại</Button>
   }
   // Button NOT rendered ❌


┌─────────────────────────────────────────────────────────────────────────┐
│                     REAL WORLD EXAMPLE                                   │
└─────────────────────────────────────────────────────────────────────────┘

Student: Nguyễn Văn A (ID: 101)
Subject: Toán học (ID: 5)

Timeline:
─────────────────────────────────────────────────────────────────────────

📅 Day 1 - 10:00 AM: Teacher nhập điểm
├─ TX: [8, 7, 9] → Average: 8.0
├─ ĐK: [7, 8] → Average: 7.5
├─ TBKT = (8.0 × 20% + 7.5 × 20%) / 40% = 7.75
├─ Final: 4.5
├─ TBMH = (7.75 × 40% + 4.5 × 60%) = 5.8
└─ Status: DRAFT

📊 Bảng điểm hiển thị:
┌────────────────────────────────────┐
│ Student: Nguyễn Văn A              │
│ TX: 8, 7, 9  ĐK: 7, 8  Final: 4.5 │
│                                    │
│ [Thi lại/Học lại]                 │
│ 🔴 Cần thi lại                    │
│ 🔒 Chưa duyệt TX/ĐK               │  ← LOCKED
└────────────────────────────────────┘

─────────────────────────────────────────────────────────────────────────

📅 Day 1 - 2:00 PM: Admin review và duyệt
├─ Admin check điểm TX, ĐK
├─ Nhấn "Duyệt tất cả" hoặc "Duyệt" cho từng sinh viên
└─ Status: DRAFT → APPROVED_TX_DK

📊 Bảng điểm hiển thị:
┌────────────────────────────────────┐
│ Student: Nguyễn Văn A              │
│ TX: 8, 7, 9  ĐK: 7, 8  Final: 4.5 │
│                                    │
│ [Thi lại/Học lại]                 │
│ 🔴 Cần thi lại                    │
│ [📝 Nhập điểm thi lại]            │  ← UNLOCKED
└────────────────────────────────────┘

─────────────────────────────────────────────────────────────────────────

📅 Day 2 - 9:00 AM: Admin nhập điểm thi lại
├─ Click "📝 Nhập điểm thi lại"
├─ Modal mở → Nhập Final (retake): 6.5
├─ Save → Tạo GradeRetake record
└─ Calculate new TBMH: (7.75 × 40% + 6.5 × 60%) = 7.0 → PASS ✅

📊 Bảng điểm hiển thị:
┌────────────────────────────────────┐
│ Student: Nguyễn Văn A              │
│ Original Final: 4.5                │
│ Retake Final: 6.5                  │
│ New TBMH: 7.0                      │
│                                    │
│ [Thi lại/Học lại]                 │
│ ✅ Đã đạt (Thi lại)               │
└────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                       EDGE CASES                                         │
└─────────────────────────────────────────────────────────────────────────┘

Edge Case 1: Grade chưa lưu vào DB
─────────────────────────────────────
gradeStatus = null/undefined
isTxDkApproved = false
→ Show warning box ✅

Edge Case 2: Multiple students, mixed statuses
─────────────────────────────────────
Student A: APPROVED_TX_DK → Show button ✅
Student B: DRAFT → Show warning ⚠️
Student C: FINALIZED → Show button ✅
→ Each row independent ✅

Edge Case 3: Grade được duyệt nhưng không cần thi lại
─────────────────────────────────────
gradeStatus = 'APPROVED_TX_DK'
Final: 8.5 (>= 5) → PASS
needsAction = false
→ NO warning, NO button (correct) ✅

Edge Case 4: Status transition during session
─────────────────────────────────────
Initial: DRAFT → Warning box
Admin approves → APPROVED_TX_DK
→ UI updates via state (no reload needed) ✅
→ Warning box → Button (real-time) ✅
