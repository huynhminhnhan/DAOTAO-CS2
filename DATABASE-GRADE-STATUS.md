# Database Changes - Grade Status Tracking

## 📊 Tables Affected

### 1. `grades` Table

Cột `gradeStatus` sẽ có các giá trị mới:

```sql
-- Grade Status Values
ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED_TX_DK', 'FINAL_ENTERED', 'FINALIZED')
```

**Workflow Values:**
- `DRAFT` - Bản nháp (chưa có điểm thi)
- `FINAL_ENTERED` ⭐ - Đã nhập điểm thi (chưa chốt)
- `FINALIZED` ⭐ - Đã chốt điểm thi (hoàn tất)

**Các cột liên quan:**
```sql
gradeStatus VARCHAR(50) DEFAULT 'DRAFT'
lockStatus JSON DEFAULT '{"txLocked":false,"dkLocked":false,"finalLocked":false}'
finalizedBy INT NULL
finalizedAt DATETIME NULL
version INT DEFAULT 1
```

### 2. `grade_histories` Table

Sẽ ghi lại mọi thay đổi status:

```sql
CREATE TABLE grade_histories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  gradeId INT NOT NULL,
  changedBy INT NULL,
  action VARCHAR(50), -- 'create', 'update', 'lock'
  oldSnapshot JSON,
  newSnapshot JSON,
  reason TEXT, -- Chứa thông tin về status transition
  changedByRole VARCHAR(50),
  ipAddress VARCHAR(50),
  userAgent TEXT,
  createdAt DATETIME
)
```

**Example Record - Nhập điểm thi:**
```json
{
  "gradeId": 123,
  "changedBy": 1,
  "action": "update",
  "oldSnapshot": {
    "gradeStatus": "DRAFT",
    "finalScore": null,
    "lockStatus": {"txLocked":false,"dkLocked":false,"finalLocked":false}
  },
  "newSnapshot": {
    "gradeStatus": "FINAL_ENTERED",
    "finalScore": 8.5,
    "lockStatus": {"txLocked":false,"dkLocked":false,"finalLocked":false}
  },
  "reason": "admin đã cập nhật điểm - Chuyển sang FINAL_ENTERED do nhập điểm thi",
  "createdAt": "2025-01-10 14:30:00"
}
```

**Example Record - Chốt điểm thi:**
```json
{
  "gradeId": 123,
  "changedBy": 1,
  "action": "update",
  "oldSnapshot": {
    "gradeStatus": "FINAL_ENTERED",
    "lockStatus": {"txLocked":false,"dkLocked":false,"finalLocked":false},
    "finalizedBy": null,
    "finalizedAt": null
  },
  "newSnapshot": {
    "gradeStatus": "FINALIZED",
    "lockStatus": {"txLocked":true,"dkLocked":true,"finalLocked":true},
    "finalizedBy": 1,
    "finalizedAt": "2025-01-10 15:00:00"
  },
  "reason": "Admin chốt điểm thi (lock finalScore)",
  "createdAt": "2025-01-10 15:00:00"
}
```

### 3. `grade_state_transitions` Table

Ghi lại các transition giữa các states:

```sql
CREATE TABLE grade_state_transitions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  gradeId INT NOT NULL,
  fromState VARCHAR(50),
  toState VARCHAR(50),
  triggeredBy INT NULL,
  reason TEXT,
  createdAt DATETIME
)
```

**Example Record:**
```json
{
  "gradeId": 123,
  "fromState": "FINAL_ENTERED",
  "toState": "FINALIZED",
  "triggeredBy": 1,
  "reason": "Admin chốt điểm thi - Chuyển sang FINALIZED",
  "createdAt": "2025-01-10 15:00:00"
}
```

## 🔍 Query Examples

### Check Grade Status Distribution
```sql
SELECT 
  gradeStatus,
  COUNT(*) as total,
  COUNT(CASE WHEN finalScore IS NOT NULL THEN 1 END) as with_final_score
FROM grades
WHERE semester = 'HK1' AND academicYear = '2024-25'
GROUP BY gradeStatus
ORDER BY 
  CASE gradeStatus
    WHEN 'DRAFT' THEN 1
    WHEN 'PENDING_REVIEW' THEN 2
    WHEN 'APPROVED_TX_DK' THEN 3
    WHEN 'FINAL_ENTERED' THEN 4
    WHEN 'FINALIZED' THEN 5
  END;
```

**Expected Output:**
```
gradeStatus      | total | with_final_score
-----------------+-------+------------------
DRAFT            |   150 |    0
PENDING_REVIEW   |    20 |    0
APPROVED_TX_DK   |    30 |    0
FINAL_ENTERED    |   100 |  100  ⭐
FINALIZED        |   200 |  200  ⭐
```

### Get Grades Ready to Lock (FINAL_ENTERED but not locked)
```sql
SELECT 
  g.id,
  g.studentId,
  s.studentCode,
  s.fullName,
  g.finalScore,
  g.gradeStatus,
  JSON_EXTRACT(g.lockStatus, '$.finalLocked') as finalLocked
FROM grades g
JOIN students s ON g.studentId = s.id
WHERE g.gradeStatus = 'FINAL_ENTERED'
  AND JSON_EXTRACT(g.lockStatus, '$.finalLocked') = false
  AND g.finalScore IS NOT NULL;
```

### Get Grade History for a Specific Grade
```sql
SELECT 
  gh.id,
  gh.action,
  gh.reason,
  JSON_EXTRACT(gh.oldSnapshot, '$.gradeStatus') as old_status,
  JSON_EXTRACT(gh.newSnapshot, '$.gradeStatus') as new_status,
  JSON_EXTRACT(gh.newSnapshot, '$.finalScore') as final_score,
  u.username as changed_by,
  gh.createdAt
FROM grade_histories gh
LEFT JOIN users u ON gh.changedBy = u.id
WHERE gh.gradeId = 123
ORDER BY gh.createdAt DESC;
```

### Get State Transitions Timeline
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

**Example Output:**
```
fromState      | toState        | triggered_by | reason                           | createdAt
---------------+----------------+--------------+----------------------------------+--------------------
DRAFT          | FINAL_ENTERED  | NULL         | (auto from save)                 | 2025-01-10 14:30:00
FINAL_ENTERED  | FINALIZED      | admin        | Admin chốt điểm thi - Chuyển...  | 2025-01-10 15:00:00
```

## 🔄 Migration Query (if needed)

Nếu có dữ liệu cũ cần update status:

```sql
-- Update grades that have finalScore but status is still DRAFT
UPDATE grades
SET 
  gradeStatus = 'FINAL_ENTERED',
  version = version + 1
WHERE gradeStatus = 'DRAFT'
  AND finalScore IS NOT NULL
  AND finalScore > 0;

-- Update grades that have finalLocked=true but status is not FINALIZED
UPDATE grades
SET 
  gradeStatus = 'FINALIZED',
  version = version + 1
WHERE JSON_EXTRACT(lockStatus, '$.finalLocked') = true
  AND gradeStatus != 'FINALIZED';
```

## 📈 Analytics Queries

### Get Lock Statistics
```sql
SELECT 
  DATE(g.finalizedAt) as lock_date,
  COUNT(*) as grades_locked,
  AVG(g.finalScore) as avg_final_score
FROM grades g
WHERE g.gradeStatus = 'FINALIZED'
  AND g.finalizedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(g.finalizedAt)
ORDER BY lock_date DESC;
```

### Get Admin Performance
```sql
SELECT 
  u.username,
  COUNT(DISTINCT g.id) as grades_finalized,
  MIN(g.finalizedAt) as first_lock,
  MAX(g.finalizedAt) as last_lock
FROM grades g
JOIN users u ON g.finalizedBy = u.id
WHERE g.gradeStatus = 'FINALIZED'
GROUP BY u.id, u.username
ORDER BY grades_finalized DESC;
```

## 🛡️ Data Integrity Checks

### Check for Invalid States
```sql
-- Grades with finalScore but status is DRAFT (should be FINAL_ENTERED)
SELECT COUNT(*) as invalid_draft
FROM grades
WHERE gradeStatus = 'DRAFT'
  AND finalScore IS NOT NULL
  AND finalScore > 0;

-- Grades with finalLocked=true but status is not FINALIZED
SELECT COUNT(*) as invalid_locked
FROM grades
WHERE JSON_EXTRACT(lockStatus, '$.finalLocked') = true
  AND gradeStatus != 'FINALIZED';

-- Grades with FINALIZED status but no finalScore
SELECT COUNT(*) as invalid_finalized
FROM grades
WHERE gradeStatus = 'FINALIZED'
  AND (finalScore IS NULL OR finalScore = 0);
```

## 📊 Index Recommendations

For optimal query performance:

```sql
-- Index on gradeStatus for filtering
CREATE INDEX idx_grades_status ON grades(gradeStatus);

-- Composite index for common queries
CREATE INDEX idx_grades_status_final ON grades(gradeStatus, finalScore);

-- Index on finalizedAt for time-based queries
CREATE INDEX idx_grades_finalized_at ON grades(finalizedAt);

-- Index on grade_histories for lookups
CREATE INDEX idx_grade_histories_grade ON grade_histories(gradeId, createdAt);

-- Index on grade_state_transitions
CREATE INDEX idx_grade_transitions_grade ON grade_state_transitions(gradeId, createdAt);
```
