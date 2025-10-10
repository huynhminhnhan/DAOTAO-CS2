# Grade State Management Implementation - Progress Report

## ✅ Completed Steps (Steps 1-5)

### Step 1: Migration Script ✅
**File:** `/scripts/add-grade-state-management.js`

Created migration script that adds:
- `grade_status` column (ENUM: DRAFT, PENDING_REVIEW, APPROVED_TX_DK, FINAL_ENTERED, FINALIZED)
- `lock_status` column (JSON: {txLocked, dkLocked, finalLocked})
- `locked_by`, `locked_at` columns
- `submitted_for_review_at` column
- `approved_by`, `approved_at` columns
- `finalized_by`, `finalized_at` columns
- `version` column (for optimistic locking)
- `GradeStateTransitions` table (audit trail)
- Indexes for performance

**Status:** Executed successfully ✅

---

### Step 2: Database Models ✅
**Files:** 
- `/src/backend/database/models/GradeStateTransition.js` (NEW)
- `/src/backend/database/models/Grade.js` (UPDATED)
- `/src/backend/database/index.js` (UPDATED)

#### GradeStateTransition Model
- Tracks all state transitions
- Fields: gradeId, fromState, toState, triggeredBy, reason, metadata
- Associations with Grade and User models

#### Grade Model Updates
- Added all state management fields to model definition
- Added associations:
  - `hasMany GradeStateTransition`
  - `belongsTo User` (lockedByUser, approvedByUser, finalizedByUser)
- Added instance methods:
  - `getStatus()` - Get current status
  - `isLocked(fieldName)` - Check if field is locked
  - `canEdit(userId, userRole, fieldName)` - Check edit permission
  - `isDraft()`, `isPendingReview()`, `isApprovedTxDk()`, `isFinalEntered()`, `isFinalized()`
  - `getStatusDisplay()` - Get Vietnamese status display

**Status:** Completed and imported ✅

---

### Step 3: Grade State Service ✅
**File:** `/src/services/GradeStateService.js`

Created comprehensive service with:

#### State Transition Methods
- `submitForReview(gradeId, userId, reason)` - DRAFT → PENDING_REVIEW
- `approveTxDk(gradeId, adminId, reason)` - PENDING_REVIEW → APPROVED_TX_DK
- `enterFinalScore(gradeId, adminId, finalScore, reason)` - APPROVED_TX_DK → FINAL_ENTERED
- `finalize(gradeId, adminId, reason)` - FINAL_ENTERED → FINALIZED
- `reject(gradeId, adminId, reason)` - Any → DRAFT

#### Lock Management Methods
- `lockField(gradeId, fieldName, userId, reason)` - Lock TX/ĐK/Final field
- `unlockField(gradeId, fieldName, userId, reason)` - Emergency unlock
- `checkFieldLocked(gradeId, fieldName)` - Check lock status

#### Version Control Methods
- `createSnapshot(gradeId, userId, changeType, reason)` - Save to GradeHistory
- `getVersionHistory(gradeId, options)` - Retrieve version history
- `getStateHistory(gradeId)` - Get state transition history

#### Validation Methods
- `canTransition(gradeId, fromState, toState, userId)` - Validate state transition
- `canEdit(gradeId, userId, fieldName)` - Check edit permission

**Status:** Structure complete, core logic implemented ✅

---

### Step 4: Grade Model Enhancement ✅
**Updates made to:** `/src/backend/database/models/Grade.js`

Added state management fields:
```javascript
gradeStatus: ENUM (default 'DRAFT')
lockStatus: JSON (default {txLocked: false, dkLocked: false, finalLocked: false})
lockedBy: INT (FK to Users)
lockedAt: DATETIME
submittedForReviewAt: DATETIME
approvedBy: INT (FK to Users)
approvedAt: DATETIME
finalizedBy: INT (FK to Users)
finalizedAt: DATETIME
version: INT (default 1)
```

Added indexes:
- `idx_grade_status`
- `idx_locked_by`

**Status:** Completed and tested ✅

---

### Step 5: State Management API Endpoints ✅
**Files:** 
- `/src/routes/grade-state.routes.js` (NEW)
- `/src/routes/admin-api.routes.js` (UPDATED)

Created 10 endpoints:

1. **POST /admin-api/grade/state/submit**
   - Teacher submits grade for review
   - DRAFT → PENDING_REVIEW

2. **POST /admin-api/grade/state/approve-tx-dk**
   - Admin approves TX/ĐK scores
   - PENDING_REVIEW → APPROVED_TX_DK
   - Locks TX and ĐK fields

3. **POST /admin-api/grade/state/enter-final**
   - Admin enters final score
   - APPROVED_TX_DK → FINAL_ENTERED

4. **POST /admin-api/grade/state/finalize**
   - Admin finalizes grade
   - FINAL_ENTERED → FINALIZED
   - Locks all fields

5. **POST /admin-api/grade/state/reject**
   - Admin rejects grade back to DRAFT
   - Requires reason

6. **POST /admin-api/grade/state/unlock**
   - Admin emergency unlock field
   - Requires reason

7. **GET /admin-api/grade/state/history/:gradeId**
   - Get state transition history

8. **GET /admin-api/grade/state/version-history/:gradeId**
   - Get version history from GradeHistory table

9. **GET /admin-api/grade/state/check/:gradeId**
   - Check if user can edit specific field

10. **POST /admin-api/grade/state/bulk-submit**
    - Teacher submits multiple grades at once

All endpoints:
- Require AdminJS session authentication
- Role-based access control (teacher/admin)
- Proper error handling
- Vietnamese error messages

**Status:** Created and mounted ✅

---

## 🔄 Remaining Steps (Steps 6-10)

### Step 6: Update TeacherGradeEntryComponent ⏳
**File to modify:** `/src/components/TeacherGradeEntryComponent.jsx`

**Tasks:**
- [ ] Add status badge display (DRAFT/PENDING_REVIEW/APPROVED_TX_DK)
- [ ] Add "Submit for Review" button (visible only in DRAFT status)
- [ ] Disable inputs when status !== DRAFT
- [ ] Show lock indicators on TX/ĐK fields
- [ ] Add status filter dropdown
- [ ] Show submission timestamp
- [ ] Handle bulk submit for entire class

**UI Requirements:**
```jsx
// Status Badge
<Badge color={statusColor}>{gradeStatus}</Badge>

// Submit Button
{gradeStatus === 'DRAFT' && (
  <Button onClick={handleSubmitForReview}>
    Nộp để duyệt
  </Button>
)}

// Lock Indicator
{lockStatus.txLocked && <LockIcon />}
```

---

### Step 7: Update GradeEntryPageComponent (Admin) ⏳
**File to modify:** `/src/components/GradeEntryPageComponent.jsx`

**Tasks:**
- [ ] Add status badges for each grade
- [ ] Add "Approve TX/ĐK" button (PENDING_REVIEW → APPROVED_TX_DK)
- [ ] Add "Enter Final Score" section (unlocked after APPROVED_TX_DK)
- [ ] Add "Finalize" button (FINAL_ENTERED → FINALIZED)
- [ ] Add "Reject" button with reason input
- [ ] Add "Emergency Unlock" button with confirmation dialog
- [ ] Show who locked fields and when
- [ ] Show state transition history button
- [ ] Add filters by status

**UI Requirements:**
```jsx
// Admin Actions
{gradeStatus === 'PENDING_REVIEW' && (
  <Button onClick={handleApproveTxDk}>
    Duyệt TX/ĐK
  </Button>
)}

{gradeStatus === 'APPROVED_TX_DK' && (
  <Input 
    type="number" 
    onChange={handleFinalScore}
    disabled={lockStatus.finalLocked}
  />
)}

// Lock Info
{lockedBy && (
  <Text>Khóa bởi: {lockedByUser.name} lúc {lockedAt}</Text>
)}
```

---

### Step 8: Run Migration Script ✅
**Status:** Already completed!

Migration successfully added all columns and created tables.

---

### Step 9: Test Complete Workflow ⏳

**Test Cases:**
1. [ ] **Teacher creates grade (DRAFT)**
   - Teacher logs in
   - Opens TeacherGradeEntry page
   - Enters TX scores (e.g., tx1: 8, tx2: 7)
   - Enters ĐK scores (e.g., dk1: 9)
   - Saves → TBKT auto-calculated
   - Status remains DRAFT

2. [ ] **Teacher submits for review**
   - Teacher clicks "Submit for Review"
   - Status changes: DRAFT → PENDING_REVIEW
   - TX/ĐK fields become read-only for teacher

3. [ ] **Admin reviews and approves**
   - Admin logs in
   - Opens GradeEntryPage (admin)
   - Sees grades with PENDING_REVIEW status
   - Clicks "Approve TX/ĐK"
   - Status changes: PENDING_REVIEW → APPROVED_TX_DK
   - TX/ĐK fields locked (everyone)

4. [ ] **Admin enters final score**
   - Admin enters finalScore (e.g., 8.5)
   - TBMH auto-calculated: TBKT × 40% + Final × 60%
   - Status changes: APPROVED_TX_DK → FINAL_ENTERED

5. [ ] **Admin finalizes**
   - Admin clicks "Finalize"
   - Status changes: FINAL_ENTERED → FINALIZED
   - All fields locked
   - Grade visible to students

6. [ ] **Test reject flow**
   - Admin clicks "Reject" on PENDING_REVIEW grade
   - Enters reason
   - Status changes back to DRAFT
   - Teacher can edit again

7. [ ] **Test emergency unlock**
   - Admin clicks "Emergency Unlock" on locked field
   - Enters reason
   - Field unlocked
   - Audit trail recorded

8. [ ] **Verify locks prevent editing**
   - Try to edit locked TX score → blocked
   - Try to edit locked final score → blocked
   - Check API returns 403 error

9. [ ] **Verify state transitions logged**
   - Check GradeStateTransitions table
   - All transitions recorded with user and timestamp

10. [ ] **Test version history**
    - Make multiple edits
    - Check GradeHistory table
    - All versions saved with previous values

---

### Step 10: Create Admin Resource for State Transitions ⏳
**File to create:** Add to `/src/resources/` config

**Tasks:**
- [ ] Create AdminJS resource for GradeStateTransitions model
- [ ] Configure read-only (audit trail)
- [ ] Add filters: gradeId, userId, date range, state
- [ ] Display columns: from/to state, user, timestamp, reason
- [ ] Add search by gradeId
- [ ] Show associated grade details
- [ ] Export to CSV functionality

**Resource Config:**
```javascript
{
  resource: GradeStateTransition,
  options: {
    navigation: {
      name: 'Audit Trail',
      icon: 'History'
    },
    listProperties: ['id', 'gradeId', 'fromState', 'toState', 'triggeredBy', 'triggeredAt', 'reason'],
    actions: {
      new: { isVisible: false },
      edit: { isVisible: false },
      delete: { isVisible: false }
    }
  }
}
```

---

## 📊 Implementation Summary

### ✅ Completed (Steps 1-5)
- Database schema migration ✅
- Database models (Grade, GradeStateTransition) ✅
- Service layer (GradeStateService) ✅
- API endpoints (10 endpoints) ✅
- Server integration and testing ✅

### ⏳ Remaining (Steps 6-10)
- UI updates for TeacherGradeEntry component
- UI updates for admin GradeEntry component
- End-to-end workflow testing
- Admin resource for audit trail

### 🔧 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GRADE STATE MACHINE                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  DRAFT (Teacher edits TX/ĐK)                                │
│    ↓ submitForReview()                                      │
│  PENDING_REVIEW (Admin reviews)                             │
│    ↓ approveTxDk() [locks TX/ĐK]                           │
│  APPROVED_TX_DK (Admin enters final)                        │
│    ↓ enterFinalScore()                                      │
│  FINAL_ENTERED (Admin can edit final)                       │
│    ↓ finalize() [locks all]                                 │
│  FINALIZED (Published to students)                          │
│                                                               │
│  Any state → reject() → DRAFT                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 🗄️ Database Schema

**Grades Table (Updated)**
- `grade_status` - Current state (ENUM)
- `lock_status` - Field locks (JSON)
- `locked_by`, `locked_at` - Lock info
- `submitted_for_review_at` - Submission timestamp
- `approved_by`, `approved_at` - Approval info
- `finalized_by`, `finalized_at` - Finalization info
- `version` - Optimistic locking

**GradeStateTransitions Table (New)**
- `id` - Primary key
- `gradeId` - Foreign key to Grades
- `fromState` - Previous state
- `toState` - New state
- `triggeredBy` - User who triggered transition
- `triggeredAt` - Timestamp
- `reason` - Explanation
- `metadata` - Additional JSON data

### 🔐 Permission Matrix

| Role    | DRAFT | PENDING_REVIEW | APPROVED_TX_DK | FINAL_ENTERED | FINALIZED |
|---------|-------|----------------|----------------|---------------|-----------|
| Teacher | ✅ Edit TX/ĐK<br>✅ Submit | ❌ View only | ❌ View only | ❌ View only | ❌ View only |
| Admin   | ✅ Edit all<br>✅ Submit | ✅ Edit all<br>✅ Approve<br>✅ Reject | ✅ Edit final<br>✅ Enter final | ✅ Edit final<br>✅ Finalize | ✅ Emergency unlock |

### 🔒 Field Lock Logic

```javascript
lockStatus: {
  txLocked: false,    // Locked after APPROVED_TX_DK
  dkLocked: false,    // Locked after APPROVED_TX_DK
  finalLocked: false  // Locked after FINALIZED
}
```

**Lock Rules:**
- `approveTxDk()` → Sets `txLocked: true, dkLocked: true`
- `finalize()` → Sets `finalLocked: true`
- `reject()` → Unlocks all fields
- `unlockField()` → Emergency unlock (admin only, requires reason)

### 📝 Audit Trail

All state transitions are logged in `GradeStateTransitions`:
- Who triggered the transition
- When it happened
- From/to states
- Reason for transition
- Additional metadata (e.g., rejection reason)

All grade changes are versioned in `GradeHistory`:
- Previous values
- New values
- Who made the change
- When it was changed
- Change description

---

## 🚀 Next Actions

**Immediate Priority: Step 6 - Update Teacher UI**
1. Open `/src/components/TeacherGradeEntryComponent.jsx`
2. Add status badge display
3. Add "Submit for Review" button
4. Disable editing when not in DRAFT status
5. Show lock indicators
6. Test teacher workflow

**Then: Step 7 - Update Admin UI**
1. Open `/src/components/GradeEntryPageComponent.jsx`
2. Add admin action buttons (Approve, Reject, Finalize)
3. Show state information
4. Add emergency unlock functionality
5. Test admin workflow

**Finally: Steps 8-10**
- Complete end-to-end testing
- Create admin resource for audit trail
- Document the complete workflow

---

## 📚 API Endpoint Documentation

### Teacher Endpoints

#### Submit Grade for Review
```http
POST /admin-api/grade/state/submit
Content-Type: application/json

{
  "gradeId": 123,
  "reason": "Đã hoàn thành nhập điểm TX và ĐK"
}

Response:
{
  "success": true,
  "message": "Nộp điểm để duyệt thành công",
  "data": {
    "id": 123,
    "gradeStatus": "PENDING_REVIEW",
    "submittedForReviewAt": "2025-01-09T10:30:00Z"
  }
}
```

#### Bulk Submit
```http
POST /admin-api/grade/state/bulk-submit
Content-Type: application/json

{
  "gradeIds": [123, 124, 125],
  "reason": "Nộp điểm cả lớp"
}

Response:
{
  "success": true,
  "message": "Nộp 3/3 điểm thành công",
  "data": {
    "successful": [...],
    "failed": [],
    "successCount": 3,
    "failCount": 0
  }
}
```

### Admin Endpoints

#### Approve TX/ĐK
```http
POST /admin-api/grade/state/approve-tx-dk
Content-Type: application/json

{
  "gradeId": 123,
  "reason": "Điểm TX và ĐK chính xác"
}
```

#### Enter Final Score
```http
POST /admin-api/grade/state/enter-final
Content-Type: application/json

{
  "gradeId": 123,
  "finalScore": 8.5,
  "reason": "Nhập điểm thi cuối kỳ"
}
```

#### Finalize
```http
POST /admin-api/grade/state/finalize
Content-Type: application/json

{
  "gradeId": 123,
  "reason": "Hoàn tất và công bố điểm"
}
```

#### Reject
```http
POST /admin-api/grade/state/reject
Content-Type: application/json

{
  "gradeId": 123,
  "reason": "Điểm TX cần kiểm tra lại"
}
```

#### Emergency Unlock
```http
POST /admin-api/grade/state/unlock
Content-Type: application/json

{
  "gradeId": 123,
  "fieldName": "txScore",
  "reason": "Cần sửa điểm TX đã khóa do nhập sai"
}
```

### Query Endpoints

#### Get State History
```http
GET /admin-api/grade/state/history/123

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "fromState": "DRAFT",
      "toState": "PENDING_REVIEW",
      "triggeredBy": 5,
      "triggeredAt": "2025-01-09T10:30:00Z",
      "reason": "Đã hoàn thành nhập điểm"
    },
    ...
  ]
}
```

#### Get Version History
```http
GET /admin-api/grade/state/version-history/123?limit=10&offset=0

Response:
{
  "success": true,
  "data": {
    "versions": [...],
    "total": 15,
    "limit": 10,
    "offset": 0
  }
}
```

#### Check Edit Permission
```http
GET /admin-api/grade/state/check/123?fieldName=txScore

Response:
{
  "success": true,
  "data": {
    "canEdit": false,
    "userId": 5,
    "userRole": "teacher",
    "fieldName": "txScore"
  }
}
```

---

## 🎯 Success Criteria

✅ **Backend Complete:**
- [x] Database schema updated
- [x] Models created/updated
- [x] Service layer implemented
- [x] API endpoints created
- [x] Server integration successful

⏳ **Frontend To Complete:**
- [ ] Teacher UI updated with state management
- [ ] Admin UI updated with state management
- [ ] Status badges displayed correctly
- [ ] Lock indicators visible
- [ ] Action buttons functional

⏳ **Testing To Complete:**
- [ ] Complete workflow tested end-to-end
- [ ] Lock mechanism prevents unauthorized edits
- [ ] State transitions logged correctly
- [ ] Version history tracked
- [ ] Error handling works properly

---

## 🐛 Known Issues & Considerations

1. **Optimistic Locking:** Version number increments with each update to prevent concurrent modification conflicts

2. **Cascade Deletes:** If a grade is deleted, all state transitions and history are also deleted (ON DELETE CASCADE)

3. **Lock Status JSON:** Using JSON column for flexibility, but need to handle NULL values properly

4. **Performance:** Indexes added on `grade_status` and `locked_by` for query performance

5. **Future Enhancement:** Could add email notifications when grade status changes

---

## 📖 Developer Notes

### Adding New States
If you need to add new states in the future:
1. Update ENUM in migration script
2. Update `STATES` constant in `GradeStateService.js`
3. Update transition validation logic in `canTransition()`
4. Update UI components to handle new state
5. Update status badge colors

### Adding New Lock Fields
If you need to lock additional fields:
1. Add field to `lockStatus` JSON default value
2. Update `FIELD_NAMES` constant in `GradeStateService.js`
3. Update `isLocked()` method in Grade model
4. Update UI lock indicators

### Debugging
- Check `GradeStateTransitions` table for audit trail
- Check `GradeHistory` table for version history
- Enable verbose logging in `GradeStateService.js`
- Use `/admin-api/grade/state/check/:gradeId` to debug permissions

---

Generated: January 9, 2025
Last Updated: Step 5 completed
