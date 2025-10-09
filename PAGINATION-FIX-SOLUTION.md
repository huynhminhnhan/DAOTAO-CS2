# Giải pháp xử lý Pagination cho Teacher Permissions

## 🔴 Vấn đề

Khi teacher login và xem Students resource:
- Teacher có quyền quản lý lớp 12 (có 3 students: ID 10, 31, 52)
- AdminJS load 10 records đầu tiên theo ID: 1, 4, 5, 6, 7, 8, 9, **10**, 11, 12
- Chỉ student ID 10 nằm trong 10 records này
- **Kết quả:** Chỉ hiển thị 1 student thay vì 3

## ❌ Các giải pháp ĐÃ THỬ và THẤT BẠI

### 1. ~~After hook filtering~~ (Không xử lý được pagination)
```javascript
after: async (response) => {
  response.records = response.records.filter(record => 
    allowedStudentIds.includes(record.id)
  );
}
```
**Vấn đề:** Chỉ filter được trong 10 records đã load, không load thêm được records khác.

### 2. ~~Filter theo studentId~~ (Không đúng logic)
```javascript
// Sai vì student ID 31, 52 không nằm trong 10 records đầu
filter(record => allowedStudentIds.includes(record.params.id))
```

### 3. ~~Filter theo classId trong after hook~~ (Vẫn bị pagination)
```javascript
// Tốt hơn nhưng vẫn chỉ filter được 10 records đã load
filter(record => allowedClassIds.includes(record.params.classId))
```

## ✅ GIẢI PHÁP CUỐI CÙNG: Before Hook với Query Filter

### Cách hoạt động

**Inject filter vào request.query TRƯỚC KHI AdminJS query database:**

```javascript
actions: {
  list: {
    before: async (request, context) => {
      if (currentAdmin?.role === 'teacher') {
        const allowedClassIds = await getTeacherManagedClassIds(currentAdmin.id);
        
        if (allowedClassIds !== 'all' && allowedClassIds.length > 0) {
          // Inject filter vào query
          request.query = {
            ...request.query,
            filters: {
              ...(request.query?.filters || {}),
              classId: allowedClassIds.join(',') // "12" hoặc "12,13,14"
            }
          };
        }
      }
      return request;
    }
  }
}
```

### Luồng xử lý

1. **Before hook** chạy trước khi AdminJS query database
2. Lấy `allowedClassIds` từ teacher permissions (VD: `[12]`)
3. Inject filter `classId: "12"` vào `request.query.filters`
4. **AdminJS query:** `SELECT * FROM students WHERE classId = 12 LIMIT 10`
5. Kết quả: Load đúng 3 students thuộc lớp 12 (bất kể vị trí của chúng trong toàn bộ danh sách)

### Ưu điểm

✅ **Xử lý pagination đúng:** Query database với WHERE clause
✅ **Performance tốt:** Chỉ query students thuộc lớp được phân quyền
✅ **Scalable:** Hoạt động với bất kỳ số lượng students nào trong lớp
✅ **Đơn giản:** Không cần custom Resource adapter phức tạp

## 📊 So sánh

| Giải pháp | Pagination | Performance | Complexity |
|-----------|------------|-------------|------------|
| After hook filter | ❌ Sai | ⚠️ Load all → filter | 🟢 Đơn giản |
| Before hook filter | ✅ Đúng | ✅ Query có WHERE | 🟢 Đơn giản |
| Custom Resource | ✅ Đúng | ✅ Query có WHERE | 🔴 Phức tạp |

## 🧪 Test Cases

### Test 1: Teacher với 1 lớp (3 students)
- Input: Teacher có quyền lớp 12
- Expected: Hiển thị 3 students (ID 10, 31, 52)
- Query: `WHERE classId = 12`

### Test 2: Teacher với nhiều lớp
- Input: Teacher có quyền lớp 12, 13, 14
- Expected: Hiển thị tất cả students của 3 lớp
- Query: `WHERE classId IN (12, 13, 14)`

### Test 3: Teacher với wildcard permission
- Input: Teacher có `classId = NULL` (tất cả lớp)
- Expected: Hiển thị tất cả students
- Query: Không có WHERE clause

### Test 4: Teacher không có permission
- Input: Teacher không có quyền lớp nào
- Expected: Không hiển thị student nào
- Query: `WHERE classId = -999999` (không tồn tại)

## 🔧 Code Implementation

### File: `src/resources/student.resource.js`

```javascript
import { getTeacherManagedClassIds } from '../middleware/teacherPermissions.js';

const StudentResource = {
  resource: Student,
  options: {
    actions: {
      list: {
        before: async (request, context) => {
          const { currentAdmin } = context;
          
          if (currentAdmin?.role === 'teacher') {
            const allowedClassIds = await getTeacherManagedClassIds(currentAdmin.id);
            
            if (allowedClassIds !== 'all') {
              const currentFilters = request.query?.filters || {};
              
              if (allowedClassIds.length === 0) {
                // No permissions
                request.query = {
                  ...request.query,
                  filters: { ...currentFilters, classId: '-999999' }
                };
              } else {
                // Has specific class permissions
                request.query = {
                  ...request.query,
                  filters: { 
                    ...currentFilters, 
                    classId: allowedClassIds.join(',') 
                  }
                };
              }
            }
          }
          
          return request;
        }
      }
    }
  }
};
```

## 🎯 Kết luận

Sử dụng **before hook với query filter injection** là giải pháp tối ưu nhất để xử lý pagination trong AdminJS khi cần filter theo permissions. Phương pháp này:

1. ✅ Query đúng từ database level
2. ✅ Xử lý pagination chính xác
3. ✅ Performance tốt với large dataset
4. ✅ Code đơn giản, dễ maintain

**Lưu ý:** Giải pháp này cũng áp dụng cho Class và Subject resources.
