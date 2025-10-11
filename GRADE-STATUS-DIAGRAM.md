# Grade Status State Machine Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    GRADE STATUS WORKFLOW                                 │
└─────────────────────────────────────────────────────────────────────────┘

                            ┌──────────────┐
                            │    DRAFT     │
                            │  📝 Bản nháp  │
                            │              │
                            │ - Mới tạo    │
                            │ - Chưa có    │
                            │   điểm thi   │
                            └──────┬───────┘
                                   │
                                   │ Admin nhập
                                   │ điểm thi (finalScore)
                                   │
                                   ▼
                            ┌──────────────┐
                            │FINAL_ENTERED │ ⭐ AUTO TRANSITION
                            │🎯 Đã có điểm │
                            │     thi      │
                            │              │
                            │ - finalScore │
                            │   đã nhập    │
                            │ - Chưa chốt  │
                            │ - Có thể sửa │
                            └──────┬───────┘
                                   │
                                   │ Admin nhấn
                                   │ "🔒 Chốt điểm thi"
                                   │
                                   ▼
                            ┌──────────────┐
                            │  FINALIZED   │ ⭐ AUTO TRANSITION
                            │ 🔒 Hoàn tất  │
                            │              │
                            │ - Đã chốt    │
                            │ - finalLocked│
                            │   = true     │
                            │ - Không sửa  │
                            │ - SV có thể  │
                            │   thi lại    │
                            └──────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                      LOCK STATUS TRACKING                                │
└─────────────────────────────────────────────────────────────────────────┘

  Status          │  txLocked  │  dkLocked  │  finalLocked  │  Can Edit?
──────────────────┼────────────┼────────────┼───────────────┼─────────────
  DRAFT           │   false    │   false    │    false      │   ✅ All
  FINAL_ENTERED   │   false    │   false    │    false      │   ✅ All
  FINALIZED       │   true     │   true     │    true       │   ❌ None


┌─────────────────────────────────────────────────────────────────────────┐
│                     HISTORY TRACKING EXAMPLES                            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ GradeHistory Table                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ gradeId: 123                                                             │
│ changedBy: admin_001                                                     │
│ action: 'update'                                                         │
│ reason: 'admin đã cập nhật điểm - Chuyển sang FINAL_ENTERED             │
│          do nhập điểm thi'                                               │
│ oldSnapshot: { gradeStatus: 'DRAFT', finalScore: null }                 │
│ newSnapshot: { gradeStatus: 'FINAL_ENTERED', finalScore: 7.5 }          │
│ timestamp: 2025-01-10 14:30:00                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ GradeStateTransition Table                                               │
├─────────────────────────────────────────────────────────────────────────┤
│ gradeId: 123                                                             │
│ fromState: 'FINAL_ENTERED'                                               │
│ toState: 'FINALIZED'                                                     │
│ triggeredBy: admin_001                                                   │
│ reason: 'Admin chốt điểm thi - Chuyển sang FINALIZED'                   │
│ timestamp: 2025-01-10 15:00:00                                           │
└─────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                      UI BEHAVIOR                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Status: DRAFT (📝 Bản nháp)                                              │
├─────────────────────────────────────────────────────────────────────────┤
│ Input điểm:       [Enabled]                                              │
│ Badge:            📝 Bản nháp (yellow)                                   │
│ Nút "Chốt điểm":  ❌ Không hiện (chưa có finalScore)                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Status: FINAL_ENTERED (🎯 Đã có điểm thi)                               │
├─────────────────────────────────────────────────────────────────────────┤
│ Input điểm:       [Enabled]                                              │
│ Badge:            🎯 Đã có điểm thi (blue)                               │
│ Nút "Chốt điểm":  ✅ Hiện (finalLocked = false)                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Status: FINALIZED (🔒 Hoàn tất)                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ Input điểm:       [Disabled] (gray)                                      │
│ Badge:            🔒 Hoàn tất (gray)                                     │
│ Nút "Chốt điểm":  ❌ Không hiện (finalLocked = true)                    │
│ Nút "Mở khóa":    ✅ Hiện trong cột "Thao tác"                          │
└─────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                    CODE FLOW SUMMARY                                     │
└─────────────────────────────────────────────────────────────────────────┘

1️⃣ SAVE GRADES (Admin nhập điểm)
   ├─ Frontend: GradeEntryPageComponent.jsx → saveGrades()
   ├─ Backend: GradeBulkController → grade.bulk.service.js
   │   ├─ Check: finalScore có giá trị?
   │   ├─ YES → gradeStatus = 'FINAL_ENTERED'
   │   └─ NO  → gradeStatus = 'DRAFT'
   ├─ Create GradeHistory (action: 'update', reason: '...FINAL_ENTERED...')
   └─ Frontend: Update gradeStatuses state

2️⃣ LOCK FINAL SCORE (Admin chốt điểm thi)
   ├─ Frontend: handleBulkLockFinalScore()
   ├─ Backend: GradeStateService.lockFinalScore()
   │   ├─ Check: gradeStatus === 'FINAL_ENTERED'?
   │   ├─ YES → gradeStatus = 'FINALIZED'
   │   ├─ Set: finalLocked = true
   │   ├─ Set: finalizedBy, finalizedAt
   │   └─ Create GradeStateTransition
   ├─ Create GradeHistory (action: 'lock', reason: '...FINALIZED')
   └─ Frontend: Update gradeStatuses state (no reload!)


┌─────────────────────────────────────────────────────────────────────────┐
│                    TESTING SCENARIOS                                     │
└─────────────────────────────────────────────────────────────────────────┘

✅ Test Case 1: Nhập đầy đủ điểm ngay lần đầu
   Input: TX=8, DK=7, Final=9
   Expected:
   - Save → Status = FINAL_ENTERED
   - Nút "Chốt điểm thi" hiện
   - Lock → Status = FINALIZED, badge = "🔒 Hoàn tất"

✅ Test Case 2: Nhập từng bước
   Input: TX=8, DK=7 (chưa có Final)
   Expected:
   - Save → Status = DRAFT
   - Nút "Chốt điểm thi" KHÔNG hiện
   Then input: Final=9
   - Save → Status = FINAL_ENTERED
   - Nút "Chốt điểm thi" hiện
   - Lock → Status = FINALIZED

✅ Test Case 3: Bulk lock nhiều sinh viên
   Input: 10 sinh viên có FINAL_ENTERED
   Expected:
   - Nhấn "🔒 Chốt điểm thi tất cả"
   - Tất cả chuyển sang FINALIZED
   - UI update ngay không reload
   - Nút biến mất cho tất cả

✅ Test Case 4: History tracking
   Expected:
   - GradeHistory có 2 records:
     1. Create/Update với reason chứa "FINAL_ENTERED"
     2. Lock với reason chứa "FINALIZED"
   - GradeStateTransition có record:
     fromState: FINAL_ENTERED → toState: FINALIZED
