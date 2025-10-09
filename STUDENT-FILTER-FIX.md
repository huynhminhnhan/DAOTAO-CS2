# 🐛 FIX: Lỗi chỉ hiển thị 1/3 sinh viên trong lớp 12

## 🔍 **Nguyên nhân:**

AdminJS sử dụng **pagination** - chỉ load 10 records mỗi trang. Khi filter ở `after` hook (sau khi query), chúng ta chỉ filter những records đã được load trong trang hiện tại.

**Ví dụ thực tế:**
- Lớp 12 có 3 sinh viên: ID 10, 31, 52
- AdminJS load trang 1 (10 records đầu tiên): ID 1, 4, 5, 6, 7, 8, 9, 10, 11, 12
- Chỉ có ID 10 nằm trong trang này → Filter chỉ thấy 1 sinh viên
- ID 31 và 52 nằm ở trang 2, 3 → Không bao giờ được load!

## ✅ **Giải pháp:**

**Filter ở DATABASE LEVEL** thay vì filter sau khi query.

### **Cách cũ (SAI):**
```javascript
after: async (response, request, context) => {
  // Filter records sau khi AdminJS đã query database
  // ❌ Chỉ filter trong 10 records đã load
  response.records = response.records.filter(...)
}
```

### **Cách mới (ĐÚNG):**
```javascript
queryFilter: async (query, context) => {
  // Filter TRƯỚC KHI query database
  // ✅ Sequelize sẽ query đúng records từ đầu
  query.where = {
    ...query.where,
    id: { [Op.in]: [10, 31, 52] }
  };
  return query;
}
```

## 📝 **Code đã thay đổi:**

### **`student.resource.js`:**

1. **Thêm helper function:**
```javascript
const createStudentQueryFilter = async (context) => {
  const { currentAdmin } = context;
  
  if (!currentAdmin || currentAdmin.role !== 'teacher') {
    return {}; // Admin thấy tất cả
  }
  
  const allowedStudentIds = await getTeacherManagedStudentIds(currentAdmin.id);
  
  if (allowedStudentIds === 'all') {
    return {}; // Teacher có quyền tất cả
  }
  
  if (allowedStudentIds.length === 0) {
    return { id: { [Op.in]: [-999999] } }; // Không có quyền
  }
  
  return { id: { [Op.in]: allowedStudentIds } }; // Filter theo IDs
};
```

2. **Thêm `queryFilter` option:**
```javascript
const StudentResource = {
  resource: Student,
  options: {
    queryFilter: async (query, context) => {
      const teacherFilter = await createStudentQueryFilter(context);
      
      if (Object.keys(teacherFilter).length > 0) {
        query.where = {
          ...query.where,
          ...teacherFilter
        };
      }
      
      return query;
    },
    // ... rest of options
  }
};
```

3. **Đơn giản hóa `list.before`:**
```javascript
list: {
  before: async (request, context) => {
    console.log('[StudentResource] LIST ACTION');
    return request; // Không cần filter ở đây nữa
  }
}
```

## 🧪 **Test:**

1. Khởi động lại server:
```bash
npm start
```

2. Đăng nhập với teacher account (User ID 10: nhanhuynh)

3. Vào menu "Sinh viên"

4. **Kết quả mong đợi:**
- Thấy **3 sinh viên** từ lớp 12
- IDs: 10 (SV008), 31 (SV029), 52 (SV050)

5. **Console log mong đợi:**
```
[StudentResource] Creating query filter for teacher, allowed IDs: [10, 31, 52]
[StudentResource] Applying queryFilter: { id: { [Symbol(in)]: [10, 31, 52] } }
[StudentResource] LIST ACTION
```

## 📊 **So sánh Before/After:**

| | **Before (After hook)** | **After (queryFilter)** |
|---|---|---|
| **Query database** | `SELECT * FROM students LIMIT 10` | `SELECT * FROM students WHERE id IN (10,31,52)` |
| **Records loaded** | 10 records (trang 1) | 3 records (đúng những cái cần) |
| **Filter logic** | JavaScript filter sau query | Sequelize WHERE clause |
| **Pagination** | ❌ Bị ảnh hưởng | ✅ Hoạt động đúng |
| **Performance** | ❌ Load thừa data | ✅ Chỉ load data cần thiết |

## ✨ **Lợi ích:**

1. ✅ **Đúng logic:** Query đúng records từ database
2. ✅ **Performance:** Không load thừa data
3. ✅ **Pagination:** Hoạt động đúng với phân trang
4. ✅ **Scalability:** Hoạt động tốt với dataset lớn

## 🔄 **Áp dụng tương tự cho Class và Subject:**

TODO: Cần update `class.resource.js` và `subject.resource.js` theo cùng pattern này.

---

**Ghi chú:** `queryFilter` là AdminJS option chính thức để customize Sequelize query before execution. Đây là cách đúng chuẩn để filter data theo permissions.
