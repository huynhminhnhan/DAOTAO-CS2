# 📊 Quản lý Trạng Thái Nhập Điểm - Grade Entry State Management

## 🎯 Mục tiêu

Xây dựng hệ thống quản lý trạng thái nhập điểm để:
1. **Tránh xung đột** giữa Teacher và Admin khi nhập điểm
2. **Phân quyền rõ ràng** - Ai được nhập gì, khi nào
3. **Tracking changes** - Lưu vết mọi thay đổi
4. **Rollback capability** - Có thể hoàn tác nếu cần
5. **Audit trail** - Biết ai đã sửa gì, khi nào

---

## 🏗️ Kiến trúc phân quyền hiện tại

### Current Implementation:

```
┌─────────────────────────────────────────────────────────────┐
│                    GRADE ENTRY WORKFLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  TEACHER                        ADMIN                         │
│  ┌──────────────┐              ┌──────────────┐             │
│  │ TX (40%)     │──────────────│ TX (40%)     │             │
│  │ • tx1        │   CAN EDIT   │ • tx1        │             │
│  │ • tx2        │◄────────────►│ • tx2        │             │
│  │ • tx3        │              │ • tx3        │             │
│  └──────────────┘              └──────────────┘             │
│         │                               │                     │
│         ▼                               ▼                     │
│  ┌──────────────┐              ┌──────────────┐             │
│  │ ĐK (60%)     │──────────────│ ĐK (60%)     │             │
│  │ • dk1        │   CAN EDIT   │ • dk1        │             │
│  │ • dk2        │◄────────────►│ • dk2        │             │
│  └──────────────┘              └──────────────┘             │
│         │                               │                     │
│         ▼                               ▼                     │
│  ┌──────────────┐              ┌──────────────┐             │
│  │ TBKT         │              │ TBKT         │             │
│  │ Auto Calc    │              │ Auto Calc    │             │
│  └──────────────┘              └──────────────┘             │
│         │                               │                     │
│         ▼                               ▼                     │
│  ┌──────────────┐              ┌──────────────┐             │
│  │ Final Score  │   ✗ DENIED   │ Final Score  │  ✓ ALLOWED  │
│  │              │              │              │             │
│  └──────────────┘              └──────────────┘             │
│         │                               │                     │
│         ▼                               ▼                     │
│  ┌──────────────┐              ┌──────────────┐             │
│  │ TBMH         │   ✗ DENIED   │ TBMH         │  ✓ ALLOWED  │
│  │              │              │ Auto Calc    │             │
│  └──────────────┘              └──────────────┘             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### ⚠️ VẤN ĐỀ CỐT LÕI:

**CÙNG NHẬP TX & ĐK → CONFLICT!**
- Teacher nhập TX1 = 8.5
- Admin nhập TX1 = 9.0
- **Ai được ưu tiên?** 🤔

---

## 💡 GIẢI PHÁP ĐỀ XUẤT

### 🎯 Option 1: **Workflow-Based State Machine** (KHUYẾN NGHỊ ⭐⭐⭐⭐⭐)

#### Concept:
Sử dụng **trạng thái workflow** để quản lý quy trình nhập điểm, mỗi giai đoạn chỉ một người/role được phép edit.

```
┌─────────────────────────────────────────────────────────────────┐
│              GRADE ENTRY STATE MACHINE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  State 1: DRAFT                                                  │
│  ┌──────────────────────────────────────┐                       │
│  │ • Teacher nhập TX & ĐK               │                       │
│  │ • Status: "draft"                    │                       │
│  │ • Lock: Teacher ONLY                 │                       │
│  │ • Admin: READ-ONLY                   │                       │
│  └──────────────────────────────────────┘                       │
│              │                                                    │
│              │ Teacher clicks "Submit for Review"                │
│              ▼                                                    │
│  State 2: PENDING_REVIEW                                         │
│  ┌──────────────────────────────────────┐                       │
│  │ • Admin/Teacher review TX & ĐK       │                       │
│  │ • Status: "pending_review"           │                       │
│  │ • Lock: Teacher LOCKED               │                       │
│  │ • Admin: CAN EDIT (if needed)        │                       │
│  └──────────────────────────────────────┘                       │
│              │                                                    │
│              │ Admin clicks "Approve & Lock"                     │
│              ▼                                                    │
│  State 3: APPROVED_TX_DK                                         │
│  ┌──────────────────────────────────────┐                       │
│  │ • TX & ĐK LOCKED                     │                       │
│  │ • Status: "approved_tx_dk"           │                       │
│  │ • Lock: BOTH Teacher & Admin LOCKED  │                       │
│  │ • Ready for Final Exam               │                       │
│  └──────────────────────────────────────┘                       │
│              │                                                    │
│              │ After exam, Admin enters Final Score              │
│              ▼                                                    │
│  State 4: FINAL_ENTERED                                          │
│  ┌──────────────────────────────────────┐                       │
│  │ • Admin nhập Final Score             │                       │
│  │ • Status: "final_entered"            │                       │
│  │ • Lock: Teacher LOCKED               │                       │
│  │ • Admin: CAN EDIT Final Score        │                       │
│  │ • TX & ĐK: LOCKED                    │                       │
│  └──────────────────────────────────────┘                       │
│              │                                                    │
│              │ Admin clicks "Finalize"                           │
│              ▼                                                    │
│  State 5: FINALIZED                                              │
│  ┌──────────────────────────────────────┐                       │
│  │ • ALL LOCKED                         │                       │
│  │ • Status: "finalized"                │                       │
│  │ • Only Admin can UNLOCK if needed    │                       │
│  │ • Grade published to student         │                       │
│  └──────────────────────────────────────┘                       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### Database Schema:

```sql
-- Add status column to Grades table
ALTER TABLE Grades ADD COLUMN gradeStatus ENUM(
  'draft',              -- Teacher đang nhập
  'pending_review',     -- Đã submit, chờ review
  'approved_tx_dk',     -- TX & ĐK đã được approve
  'final_entered',      -- Đã nhập điểm thi
  'finalized'           -- Hoàn tất, publish cho sinh viên
) DEFAULT 'draft';

-- Add locking info
ALTER TABLE Grades ADD COLUMN lockedBy INT NULL;
ALTER TABLE Grades ADD COLUMN lockedAt DATETIME NULL;
ALTER TABLE Grades ADD COLUMN lastEditedBy INT NULL;
ALTER TABLE Grades ADD COLUMN lastEditedAt DATETIME NULL;

-- State transition log
CREATE TABLE GradeStateTransitions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  gradeId INT NOT NULL,
  fromStatus VARCHAR(50),
  toStatus VARCHAR(50) NOT NULL,
  triggeredBy INT NOT NULL,
  triggeredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  FOREIGN KEY (gradeId) REFERENCES Grades(gradeId),
  FOREIGN KEY (triggeredBy) REFERENCES Users(id)
);
```

#### Implementation:

```javascript
// src/services/GradeStateService.js
export class GradeStateService {
  
  // State transition rules
  static TRANSITIONS = {
    'draft': ['pending_review'],
    'pending_review': ['approved_tx_dk', 'draft'], // Can send back to draft
    'approved_tx_dk': ['final_entered'],
    'final_entered': ['finalized'],
    'finalized': ['approved_tx_dk'] // Only Admin can unlock
  };
  
  // Permission matrix
  static PERMISSIONS = {
    'draft': {
      teacher: { canEdit: ['txScore', 'dkScore', 'notes'], canChangeStatus: true },
      admin: { canEdit: [], canChangeStatus: false } // Read-only
    },
    'pending_review': {
      teacher: { canEdit: [], canChangeStatus: false }, // Locked
      admin: { canEdit: ['txScore', 'dkScore', 'notes'], canChangeStatus: true }
    },
    'approved_tx_dk': {
      teacher: { canEdit: [], canChangeStatus: false }, // Locked
      admin: { canEdit: ['finalScore'], canChangeStatus: true }
    },
    'final_entered': {
      teacher: { canEdit: [], canChangeStatus: false }, // Locked
      admin: { canEdit: ['finalScore', 'notes'], canChangeStatus: true }
    },
    'finalized': {
      teacher: { canEdit: [], canChangeStatus: false }, // Locked
      admin: { canEdit: [], canChangeStatus: true } // Can unlock only
    }
  };
  
  /**
   * Check if user can edit specific field
   */
  static canEditField(gradeStatus, userRole, fieldName) {
    const permissions = this.PERMISSIONS[gradeStatus]?.[userRole];
    if (!permissions) return false;
    return permissions.canEdit.includes(fieldName);
  }
  
  /**
   * Transition grade to next state
   */
  static async transitionState(gradeId, toStatus, userId, reason = null) {
    const grade = await Grade.findByPk(gradeId);
    const fromStatus = grade.gradeStatus;
    
    // Validate transition
    if (!this.TRANSITIONS[fromStatus]?.includes(toStatus)) {
      throw new Error(`Invalid transition: ${fromStatus} → ${toStatus}`);
    }
    
    // Update grade status
    grade.gradeStatus = toStatus;
    grade.lastEditedBy = userId;
    grade.lastEditedAt = new Date();
    await grade.save();
    
    // Log transition
    await GradeStateTransition.create({
      gradeId,
      fromStatus,
      toStatus,
      triggeredBy: userId,
      reason
    });
    
    return grade;
  }
  
  /**
   * Lock grade for editing
   */
  static async lockGrade(gradeId, userId) {
    const grade = await Grade.findByPk(gradeId);
    
    if (grade.lockedBy && grade.lockedBy !== userId) {
      const locker = await User.findByPk(grade.lockedBy);
      throw new Error(`Grade locked by ${locker.fullName} at ${grade.lockedAt}`);
    }
    
    grade.lockedBy = userId;
    grade.lockedAt = new Date();
    await grade.save();
    
    return grade;
  }
  
  /**
   * Unlock grade
   */
  static async unlockGrade(gradeId, userId) {
    const grade = await Grade.findByPk(gradeId);
    
    // Only lock owner or admin can unlock
    const user = await User.findByPk(userId);
    if (grade.lockedBy !== userId && user.role !== 'admin') {
      throw new Error('You do not have permission to unlock this grade');
    }
    
    grade.lockedBy = null;
    grade.lockedAt = null;
    await grade.save();
    
    return grade;
  }
}
```

#### UI Implementation:

```jsx
// TeacherGradeEntry.jsx
const TeacherGradeEntry = () => {
  const [grades, setGrades] = useState({});
  
  const canEditField = (student, fieldName) => {
    const gradeStatus = student.gradeStatus || 'draft';
    return GradeStateService.canEditField(gradeStatus, 'teacher', fieldName);
  };
  
  const handleSubmitForReview = async () => {
    const confirm = window.confirm(
      '⚠️ Submit for review?\n\n' +
      'Sau khi submit, bạn sẽ KHÔNG thể chỉnh sửa điểm TX & ĐK.\n' +
      'Admin sẽ review và approve.\n\n' +
      'Bạn có chắc chắn?'
    );
    
    if (!confirm) return;
    
    try {
      await fetch('/admin-api/grade/transition-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          gradeIds: Object.keys(grades),
          toStatus: 'pending_review',
          reason: 'Teacher submitted for review'
        })
      });
      
      alert('✅ Đã submit thành công! Chờ Admin review.');
      window.location.reload();
    } catch (error) {
      alert('❌ Lỗi: ' + error.message);
    }
  };
  
  return (
    <div>
      {/* Status Badge */}
      {students.map(student => {
        const status = student.gradeStatus || 'draft';
        const statusInfo = {
          'draft': { label: '📝 Nháp', color: '#ffc107' },
          'pending_review': { label: '⏳ Chờ duyệt', color: '#ff9800' },
          'approved_tx_dk': { label: '✅ Đã duyệt', color: '#4caf50' },
          'final_entered': { label: '🎯 Đã có điểm thi', color: '#2196f3' },
          'finalized': { label: '🔒 Hoàn tất', color: '#9e9e9e' }
        };
        
        return (
          <tr key={student.id}>
            <td>
              <span style={{
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: statusInfo[status].color,
                color: 'white',
                fontSize: '11px'
              }}>
                {statusInfo[status].label}
              </span>
            </td>
            
            {/* TX Input */}
            <td>
              <input
                type="number"
                disabled={!canEditField(student, 'txScore')}
                value={grades[student.id]?.txScore?.tx1 || ''}
                onChange={(e) => handleGradeChange(student.id, 'txScore', e.target.value, 'tx1')}
                style={{
                  backgroundColor: !canEditField(student, 'txScore') ? '#f0f0f0' : 'white'
                }}
              />
            </td>
          </tr>
        );
      })}
      
      {/* Action Buttons */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button onClick={saveGrades} disabled={!canEdit}>
          💾 Lưu điểm
        </button>
        
        {allGradesInDraft && (
          <button onClick={handleSubmitForReview}>
            📤 Submit for Review
          </button>
        )}
      </div>
    </div>
  );
};
```

---

### 🎯 Option 2: **Field-Level Locking** (Giải pháp dự phòng ⭐⭐⭐⭐)

#### Concept:
Lock từng field cụ thể thay vì lock toàn bộ grade record.

```sql
-- Field-level locking table
CREATE TABLE GradeFieldLocks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  gradeId INT NOT NULL,
  fieldName VARCHAR(50) NOT NULL,
  lockedBy INT NOT NULL,
  lockedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  expiresAt DATETIME NULL,
  FOREIGN KEY (gradeId) REFERENCES Grades(gradeId),
  FOREIGN KEY (lockedBy) REFERENCES Users(id),
  UNIQUE KEY unique_lock (gradeId, fieldName)
);
```

```javascript
// Field lock service
class FieldLockService {
  static async lockField(gradeId, fieldName, userId, durationMinutes = 30) {
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    
    try {
      await GradeFieldLock.create({
        gradeId,
        fieldName,
        lockedBy: userId,
        expiresAt
      });
    } catch (error) {
      // Field already locked
      const existingLock = await GradeFieldLock.findOne({
        where: { gradeId, fieldName }
      });
      
      if (existingLock && existingLock.expiresAt < new Date()) {
        // Lock expired, delete and retry
        await existingLock.destroy();
        return this.lockField(gradeId, fieldName, userId, durationMinutes);
      }
      
      throw new Error(`Field ${fieldName} is locked by another user`);
    }
  }
  
  static async unlockField(gradeId, fieldName, userId) {
    await GradeFieldLock.destroy({
      where: { gradeId, fieldName, lockedBy: userId }
    });
  }
  
  static async isFieldLocked(gradeId, fieldName) {
    const lock = await GradeFieldLock.findOne({
      where: { gradeId, fieldName }
    });
    
    if (!lock) return false;
    
    // Check expiration
    if (lock.expiresAt && lock.expiresAt < new Date()) {
      await lock.destroy();
      return false;
    }
    
    return true;
  }
}
```

---

### 🎯 Option 3: **Last-Write-Wins with Version Control** (⭐⭐⭐)

#### Concept:
Cho phép cả hai cùng edit, nhưng lưu version history và có thể rollback.

```sql
-- Grade history table
CREATE TABLE GradeHistory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  gradeId INT NOT NULL,
  version INT NOT NULL,
  txScore JSON,
  dkScore JSON,
  finalScore DECIMAL(4,2),
  tbktScore DECIMAL(4,2),
  tbmhScore DECIMAL(4,2),
  editedBy INT NOT NULL,
  editedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  changeDescription TEXT,
  FOREIGN KEY (gradeId) REFERENCES Grades(gradeId),
  FOREIGN KEY (editedBy) REFERENCES Users(id)
);

-- Current grade version
ALTER TABLE Grades ADD COLUMN version INT DEFAULT 1;
```

```javascript
class GradeVersionService {
  static async saveGrade(gradeId, updates, userId) {
    const grade = await Grade.findByPk(gradeId);
    
    // Save current state to history
    await GradeHistory.create({
      gradeId: grade.gradeId,
      version: grade.version,
      txScore: grade.txScore,
      dkScore: grade.dkScore,
      finalScore: grade.finalScore,
      tbktScore: grade.tbktScore,
      tbmhScore: grade.tbmhScore,
      editedBy: grade.lastEditedBy,
      editedAt: grade.lastEditedAt,
      changeDescription: `Version ${grade.version} backup`
    });
    
    // Apply updates
    Object.assign(grade, updates);
    grade.version += 1;
    grade.lastEditedBy = userId;
    grade.lastEditedAt = new Date();
    await grade.save();
    
    return grade;
  }
  
  static async rollback(gradeId, toVersion) {
    const historyRecord = await GradeHistory.findOne({
      where: { gradeId, version: toVersion }
    });
    
    if (!historyRecord) {
      throw new Error(`Version ${toVersion} not found`);
    }
    
    const grade = await Grade.findByPk(gradeId);
    grade.txScore = historyRecord.txScore;
    grade.dkScore = historyRecord.dkScore;
    grade.finalScore = historyRecord.finalScore;
    grade.tbktScore = historyRecord.tbktScore;
    grade.tbmhScore = historyRecord.tbmhScore;
    grade.version += 1;
    await grade.save();
    
    return grade;
  }
  
  static async getHistory(gradeId) {
    return await GradeHistory.findAll({
      where: { gradeId },
      order: [['version', 'DESC']],
      include: [{ model: User, as: 'editor' }]
    });
  }
}
```

---

## 🎯 KHUYẾN NGHỊ TRIỂN KHAI

### Phase 1: **Immediate** (Tuần 1-2)

1. **Implement State Machine** (Option 1)
   - ✅ Đơn giản, dễ hiểu
   - ✅ Tránh conflict hiệu quả
   - ✅ Clear workflow
   
2. **Add Status Column**
   ```sql
   ALTER TABLE Grades ADD COLUMN gradeStatus 
     ENUM('draft', 'pending_review', 'approved_tx_dk', 'final_entered', 'finalized') 
     DEFAULT 'draft';
   ```

3. **Update UI với Status Badges**
   - Show trạng thái của từng grade
   - Disable inputs theo trạng thái
   - Add submit/approve buttons

### Phase 2: **Short-term** (Tuần 3-4)

1. **Add History Tracking** (Option 3)
   - Lưu GradeHistory cho mọi thay đổi
   - UI để xem history
   - Rollback capability (Admin only)

2. **Notification System**
   - Teacher submit → Notify Admin
   - Admin approve → Notify Teacher
   - Grade finalized → Notify Student

### Phase 3: **Long-term** (Tháng 2-3)

1. **Advanced Features**
   - Batch approve (approve nhiều grades cùng lúc)
   - Bulk state transition
   - Export grade report theo status
   - Analytics dashboard

2. **Audit & Compliance**
   - Complete audit trail
   - Export audit logs
   - Compliance reports

---

## 📊 COMPARISON TABLE

| Feature | Option 1: State Machine | Option 2: Field Lock | Option 3: Version Control |
|---------|------------------------|---------------------|---------------------------|
| **Complexity** | Medium | High | Low |
| **Conflict Prevention** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **User Experience** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Performance** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Rollback** | ❌ | ❌ | ⭐⭐⭐⭐⭐ |
| **Audit Trail** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Dev Time** | 2 weeks | 3 weeks | 1 week |

---

## 🚀 HÀNH ĐỘNG TIẾP THEO

1. **Tuần này:**
   - [ ] Add `gradeStatus` column to Grades table
   - [ ] Implement GradeStateService
   - [ ] Update TeacherGradeEntry UI với status badges
   - [ ] Update AdminGradeEntry UI với approve button

2. **Tuần sau:**
   - [ ] Create GradeStateTransitions table
   - [ ] Add history tracking
   - [ ] Implement rollback feature
   - [ ] Add notifications

3. **Testing:**
   - [ ] Test Teacher → Submit → Admin Review flow
   - [ ] Test concurrent editing scenarios
   - [ ] Test rollback functionality
   - [ ] Load testing với 1000+ grades

---

## 💡 BEST PRACTICES

### DO ✅:
1. **Always validate state transitions** - Không cho phép jump state
2. **Log everything** - Mọi thay đổi đều phải có log
3. **Clear error messages** - User biết tại sao không edit được
4. **Optimistic UI updates** - Update UI trước, sync DB sau
5. **Auto-save drafts** - Tránh mất dữ liệu

### DON'T ❌:
1. **No direct DB edits** - Mọi thay đổi phải qua service layer
2. **No bypass state machine** - Admin cũng phải follow workflow
3. **No silent failures** - Luôn thông báo lỗi rõ ràng
4. **No infinite locks** - Lock phải có expiry time
5. **No hardcoded permissions** - Dùng permission matrix

---

## 📚 Related Documentation

- [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md) - Database structure
- [TEACHER-PERMISSION-IMPLEMENTATION.md](./TEACHER-PERMISSION-IMPLEMENTATION.md) - Permission system
- [GRADE-HISTORY.md](./GRADE-HISTORY.md) - History tracking
- [API-DOCUMENTATION.md](./API-DOCUMENTATION.md) - API specs

---

**Tóm lại:** Tôi **khuyến nghị mạnh mẽ** sử dụng **Option 1 (State Machine)** kết hợp với **Option 3 (Version Control)** để có được:
- ✅ Conflict prevention (State Machine)
- ✅ Rollback capability (Version Control)
- ✅ Clear workflow (State Machine)
- ✅ Complete audit trail (Version Control)

Đây là giải pháp **production-ready** và **scalable** nhất! 🚀
