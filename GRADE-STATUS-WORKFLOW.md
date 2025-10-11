# Grade Status Workflow - Cập nhật Logic Chuyển Trạng thái

## 📋 Tổng quan

Đã cập nhật logic chuyển trạng thái điểm (grade status) để phản ánh chính xác workflow khi admin nhập và chốt điểm thi.

## 🔄 Workflow Trạng thái Điểm

### 1. **DRAFT** (Bản nháp)
- Trạng thái ban đầu khi tạo điểm mới
- Chưa có điểm thi (finalScore)
- Admin có thể chỉnh sửa TX, ĐK

### 2. **FINAL_ENTERED** (Đã nhập điểm thi) ⭐ NEW
- **Tự động chuyển sang khi admin nhập điểm thi (finalScore)**
- Điểm thi đã được nhập nhưng chưa chốt
- Admin vẫn có thể sửa điểm thi
- Nút "🔒 Chốt điểm thi" hiển thị

### 3. **FINALIZED** (Hoàn tất) ⭐ NEW
- **Tự động chuyển sang khi admin nhấn "🔒 Chốt điểm thi"**
- Điểm thi đã được chốt và khóa (finalLocked = true)
- Sinh viên có thể đăng ký thi lại (nếu không đạt)
- Không thể sửa được nữa (trừ khi unlock)

## 🔧 Các thay đổi Code

### Backend Changes

#### 1. `backend/src/services/grade.bulk.service.js`

**Tính năng:** Tự động chuyển sang FINAL_ENTERED khi nhập điểm thi

```javascript
// Khi UPDATE grade
if (finalScore !== null && finalScore !== undefined && finalScore !== '') {
    if (grade.gradeStatus === 'APPROVED_TX_DK') {
        newGradeStatus = 'FINAL_ENTERED';
        statusReason = ' - Chuyển sang FINAL_ENTERED do nhập điểm thi';
    } else if (!grade.gradeStatus || grade.gradeStatus === 'DRAFT') {
        newGradeStatus = 'FINAL_ENTERED';
        statusReason = ' - Chuyển sang FINAL_ENTERED do nhập điểm thi lần đầu';
    }
}

// Khi CREATE grade mới
let initialStatus = 'DRAFT';
if (finalScore !== null && finalScore !== undefined && finalScore !== '') {
    initialStatus = 'FINAL_ENTERED';
}
```

**History Tracking:**
- Ghi lại lý do chuyển trạng thái trong history
- Ví dụ: "Admin đã cập nhật điểm - Chuyển sang FINAL_ENTERED do nhập điểm thi"

#### 2. `backend/src/services/GradeStateService.js`

**Tính năng:** Chuyển từ FINAL_ENTERED → FINALIZED khi chốt điểm thi

```javascript
static async lockFinalScore(gradeId, userId, reason = null) {
    // Determine status transition
    const oldStatus = grade.gradeStatus;
    let newStatus = oldStatus;
    
    // If status is FINAL_ENTERED → transition to FINALIZED
    if (oldStatus === 'FINAL_ENTERED') {
        newStatus = 'FINALIZED';
    }

    // Lock final score
    grade.lockStatus = {
        txLocked: true,
        dkLocked: true,
        finalLocked: true
    };
    grade.gradeStatus = newStatus;
    
    if (newStatus === 'FINALIZED') {
        grade.finalizedBy = userId;
        grade.finalizedAt = new Date();
    }
}
```

**History Tracking:**
- Ghi lại transition trong GradeStateTransition
- Log: "Admin chốt điểm thi - Chuyển sang FINALIZED"

### Frontend Changes

#### 3. `frontend/src/components/GradeEntryPageComponent.jsx`

**A. Cập nhật status sau khi save grades:**

```javascript
// Check if finalScore was entered to determine status
const studentGrade = grades[detail.studentId];
const hasFinalScore = studentGrade?.finalScore && 
                     studentGrade.finalScore !== '' && 
                     studentGrade.finalScore !== null;

newStatuses[detail.studentId] = {
    gradeId: detail.gradeId,
    gradeStatus: hasFinalScore ? 'FINAL_ENTERED' : 'DRAFT',
    lockStatus: { txLocked: false, dkLocked: false, finalLocked: false },
    ...
};
```

**B. Cập nhật status sau khi chốt điểm thi:**

```javascript
// Update finalLocked = true AND transition to FINALIZED
const currentStatus = newStatuses[studentId].gradeStatus;
newStatuses[studentId] = {
    ...newStatuses[studentId],
    gradeStatus: currentStatus === 'FINAL_ENTERED' ? 'FINALIZED' : currentStatus,
    lockStatus: {
        ...currentLockStatus,
        finalLocked: true
    },
    finalizedAt: currentStatus === 'FINAL_ENTERED' ? new Date().toISOString() : ...
};
```

## 📊 Ví dụ Flow Hoàn chỉnh

### Scenario 1: Nhập điểm lần đầu (có điểm thi)

```
1. Admin nhập TX, ĐK, Điểm thi
2. Nhấn "💾 Lưu điểm"
   ↓
   Status: DRAFT → FINAL_ENTERED ✅
   
3. Nhấn "🔒 Chốt điểm thi tất cả"
   ↓
   Status: FINAL_ENTERED → FINALIZED ✅
   lockStatus.finalLocked = true
```

### Scenario 2: Nhập điểm từng bước

```
1. Admin nhập TX, ĐK (chưa có điểm thi)
2. Nhấn "💾 Lưu điểm"
   ↓
   Status: DRAFT ⏸️
   
3. Admin nhập thêm Điểm thi
4. Nhấn "💾 Lưu điểm"
   ↓
   Status: DRAFT → FINAL_ENTERED ✅
   
5. Nhấn "🔒 Chốt điểm thi tất cả"
   ↓
   Status: FINAL_ENTERED → FINALIZED ✅
```

## 🎯 Benefits

1. **Tự động hóa**: Không cần manual chuyển status, hệ thống tự động detect
2. **Rõ ràng**: Status phản ánh chính xác trạng thái thực tế của điểm
3. **History tracking**: Mọi thay đổi status đều được ghi lại kèm lý do
4. **UI real-time**: Frontend cập nhật ngay không cần reload
5. **Business logic đúng**: 
   - Có điểm thi → FINAL_ENTERED
   - Chốt điểm thi → FINALIZED
   - Lock điểm thi → Sinh viên có thể đăng ký thi lại

## ⚡ Testing Checklist

- [ ] Nhập điểm có finalScore → status = FINAL_ENTERED
- [ ] Nhập điểm không có finalScore → status = DRAFT
- [ ] Chốt điểm thi → status = FINALIZED, finalLocked = true
- [ ] History có ghi lại transition đúng
- [ ] GradeStateTransition table có log đầy đủ
- [ ] UI hiển thị badge status đúng
- [ ] Nút "🔒 Chốt điểm thi" chỉ hiện khi finalLocked = false
- [ ] Sau chốt, nút biến mất và badge = "🔒 Hoàn tất"

## 📝 Notes

- Status PENDING_REVIEW và APPROVED_TX_DK vẫn giữ nguyên (dành cho teacher workflow)
- Chỉ áp dụng cho admin nhập điểm trực tiếp
- Backward compatible với dữ liệu cũ
- Không ảnh hưởng tới retake logic hiện tại
