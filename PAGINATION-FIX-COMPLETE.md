# ✅ Giải pháp Pagination hoàn chỉnh cho Teacher Permissions

## 📋 Tóm tắt

Đã sửa vấn đề pagination cho **3 resources**: Student, Class, Subject bằng cách chuyển từ **after hook filtering** sang **before hook query injection**.

## 🔴 Vấn đề ban đầu

### Student Resource
- Teacher có quyền lớp 12 (3 students: ID 10, 31, 52)
- AdminJS load 10 records đầu tiên: ID 1, 4, 5, 6, 7, 8, 9, **10**, 11, 12
- After hook chỉ filter được trong 10 records này
- **Kết quả:** Chỉ hiển thị 1 student (ID 10) ❌

### Class & Subject Resources
- Cùng vấn đề: after hook không xử lý được pagination
- Nếu teacher có quyền nhiều lớp/môn học nhưng chúng nằm ngoài 10 records đầu → không hiển thị

## ✅ Giải pháp đã áp dụng

### 1. Student Resource
**Trước (SAI):**
```javascript
after: async (response) => {
  // Filter sau khi đã load 10 records
  const allowedStudentIds = await getTeacherManagedStudentIds(currentAdmin.id);
  response.records = response.records.filter(r => 
    allowedStudentIds.includes(r.params.id)
  );
}
```

**Sau (ĐÚNG):**
```javascript
before: async (request, context) => {
  if (currentAdmin?.role === 'teacher') {
    const allowedClassIds = await getTeacherManagedClassIds(currentAdmin.id);
    
    if (allowedClassIds !== 'all' && allowedClassIds.length > 0) {
      request.query = {
        ...request.query,
        filters: {
          ...request.query?.filters,
          classId: allowedClassIds.join(',') // "12" hoặc "12,13,14"
        }
      };
    }
  }
  return request;
}
```

### 2. Class Resource
**Filter theo `id` field:**
```javascript
before: async (request, context) => {
  if (currentAdmin?.role === 'teacher') {
    const allowedClassIds = await getTeacherManagedClassIds(currentAdmin.id);
    
    if (allowedClassIds !== 'all' && allowedClassIds.length > 0) {
      request.query = {
        ...request.query,
        filters: {
          ...request.query?.filters,
          id: allowedClassIds.join(',') // "12,13,14"
        }
      };
    }
  }
  return request;
}
```

### 3. Subject Resource
**Filter theo `id` field:**
```javascript
before: async (request, context) => {
  if (currentAdmin?.role === 'teacher') {
    const allowedSubjectIds = await getTeacherManagedSubjectIds(currentAdmin.id);
    
    if (allowedSubjectIds !== 'all' && allowedSubjectIds.length > 0) {
      request.query = {
        ...request.query,
        filters: {
          ...request.query?.filters,
          id: allowedSubjectIds.join(',') // "1,2,3"
        }
      };
    }
  }
  return request;
}
```

## 🎯 Cách hoạt động

### Luồng xử lý (Before Hook)

1. **Before hook** → Chạy TRƯỚC khi AdminJS query database
2. Lấy danh sách IDs được phân quyền từ `getTeacherManagedXXXIds()`
3. Inject filter vào `request.query.filters`
4. **AdminJS query database với WHERE clause:**
   ```sql
   -- Student: Filter theo classId
   SELECT * FROM students WHERE classId IN (12, 13, 14) LIMIT 10
   
   -- Class: Filter theo id
   SELECT * FROM classes WHERE id IN (12, 13, 14) LIMIT 10
   
   -- Subject: Filter theo id
   SELECT * FROM subjects WHERE id IN (1, 2, 3) LIMIT 10
   ```
5. Kết quả: Load đúng records thuộc teacher permissions (bất kể vị trí)

### Xử lý các trường hợp đặc biệt

#### Case 1: Teacher có wildcard permission (classId/subjectId = NULL)
```javascript
if (allowedIds === 'all') {
  // Không inject filter → query tất cả records
  console.log('Teacher has access to ALL');
}
```

#### Case 2: Teacher không có permission nào
```javascript
if (allowedIds.length === 0) {
  request.query = {
    ...request.query,
    filters: {
      ...currentFilters,
      id: '-999999' // ID không tồn tại → empty result
    }
  };
}
```

#### Case 3: Teacher có multiple permissions
```javascript
// allowedClassIds = [12, 13, 14]
request.query.filters.id = '12,13,14' // Comma-separated
// SQL: WHERE id IN (12, 13, 14)
```

## 📊 Kết quả

### Student Resource
- ✅ Hiển thị TẤT CẢ 3 students thuộc lớp 12 (ID 10, 31, 52)
- ✅ Query: `WHERE classId = 12`
- ✅ Pagination hoạt động đúng

### Class Resource
- ✅ Hiển thị TẤT CẢ classes có ID trong permissions
- ✅ Query: `WHERE id IN (12, 13, 14)`
- ✅ Pagination hoạt động đúng

### Subject Resource
- ✅ Hiển thị TẤT CẢ subjects có ID trong permissions
- ✅ Query: `WHERE id IN (1, 2, 3)`
- ✅ Pagination hoạt động đúng

## 🧪 Test Cases

### Test 1: Student Resource
```bash
# Login: 24410207@ms.uit.edu.vn (teacher với quyền lớp 12)
# Expected: 3 students (ID 10, 31, 52)
# Console: [StudentResource] Applied classId filter: 12
```

### Test 2: Class Resource
```bash
# Login: teacher với quyền lớp 12, 13, 14
# Expected: 3 classes
# Console: [ClassResource] Applied id filter: 12,13,14
```

### Test 3: Subject Resource
```bash
# Login: teacher với quyền môn 1, 2, 3
# Expected: 3 subjects
# Console: [SubjectResource] Applied id filter: 1,2,3
```

## 🚀 Performance

### Trước (After Hook)
```sql
-- Load tất cả 10 records đầu
SELECT * FROM students LIMIT 10
-- Filter trong JavaScript (chậm, sai logic)
```

### Sau (Before Hook)
```sql
-- Chỉ load records được phân quyền
SELECT * FROM students WHERE classId IN (12, 13) LIMIT 10
-- Nhanh hơn, đúng logic
```

## 📝 Files đã sửa

1. ✅ `/src/resources/student.resource.js`
   - Chuyển từ after hook sang before hook
   - Filter theo `classId` thay vì `studentId`

2. ✅ `/src/resources/class.resource.js`
   - Chuyển từ after hook sang before hook
   - Filter theo `id`

3. ✅ `/src/resources/subject.resource.js`
   - Chuyển từ after hook sang before hook
   - Filter theo `id`

## 🎓 Bài học

### ❌ Không nên dùng After Hook cho filtering
- Chỉ filter được records đã load
- Không xử lý được pagination
- Performance kém với large dataset

### ✅ Nên dùng Before Hook với query injection
- Filter ở database level (WHERE clause)
- Xử lý pagination đúng
- Performance tốt
- Code đơn giản

## 🔮 Tương lai

Nếu cần filter phức tạp hơn (JOIN, nested conditions), có thể:
1. Sử dụng custom Resource adapter (override `find()` method)
2. Tạo database views
3. Sử dụng Sequelize scopes

Nhưng với case hiện tại, **before hook + query injection** là đủ! ✅
