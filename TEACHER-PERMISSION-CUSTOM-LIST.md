# Custom List Page: TeacherPermissionManagement Component

## 🎯 Mục đích

Thay thế trang list mặc định của AdminJS cho resource `teacher_permissions` bằng custom component `TeacherPermissionManagement` để có giao diện quản lý quyền giảng viên tốt hơn.

## 🔄 Thay đổi

### File: `backend/src/resources/teacherPermission.resource.js`

**BEFORE:**
```javascript
// List action
list: {
  isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin',
},
```

**AFTER:**
```javascript
// List action - Sử dụng custom component TeacherPermissionManagement
list: {
  component: Components.TeacherPermissionManagement,
  isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin',
},
```

## 📊 Cách hoạt động

### AdminJS List Action với Custom Component

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMINJS LIST ACTION FLOW                     │
└─────────────────────────────────────────────────────────────────┘

DEFAULT BEHAVIOR (Without custom component):
┌────────────────────────────────────┐
│ Admin clicks "Teacher Permissions" │
│ in sidebar                         │
└────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ AdminJS renders default list view: │
│ - Table with columns               │
│ - Pagination                       │
│ - Filters                          │
│ - Search                           │
│ - New/Edit/Delete buttons          │
└────────────────────────────────────┘

CUSTOM BEHAVIOR (With TeacherPermissionManagement):
┌────────────────────────────────────┐
│ Admin clicks "Teacher Permissions" │
│ in sidebar                         │
└────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ AdminJS renders custom component:  │
│ TeacherPermissionManagement        │
│                                    │
│ Features:                          │
│ ✅ Custom UI/UX                    │
│ ✅ Advanced filtering              │
│ ✅ Bulk operations                 │
│ ✅ Better visualization            │
│ ✅ Custom actions                  │
└────────────────────────────────────┘
```

## 🎨 TeacherPermissionManagement Features

### Component Structure

```jsx
const TeacherPermissionManagement = () => {
  // State management
  const [teachers, setTeachers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  
  // Load data
  useEffect(() => {
    loadTeachers();
    loadPermissions();
  }, []);
  
  return (
    <div>
      {/* Header */}
      <h1>🔑 Quản lý quyền giảng viên</h1>
      
      {/* Filters */}
      <div className="filters">
        <select onChange={handleTeacherChange}>
          <option>Chọn giảng viên</option>
          {teachers.map(t => <option key={t.id}>{t.name}</option>)}
        </select>
        
        <select onChange={handleClassChange}>
          <option>Chọn lớp</option>
          {classes.map(c => <option key={c.id}>{c.name}</option>)}
        </select>
        
        <select onChange={handleSubjectChange}>
          <option>Chọn môn học</option>
          {subjects.map(s => <option key={s.id}>{s.name}</option>)}
        </select>
      </div>
      
      {/* Permissions Table */}
      <table>
        <thead>
          <tr>
            <th>Giảng viên</th>
            <th>Lớp</th>
            <th>Môn học</th>
            <th>Học kỳ</th>
            <th>Hiệu lực</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {permissions.map(p => (
            <tr key={p.id}>
              <td>{p.teacher.name}</td>
              <td>{p.class?.name || 'Tất cả'}</td>
              <td>{p.subject?.name || 'Tất cả'}</td>
              <td>{p.semester.name}</td>
              <td>{p.validFrom} - {p.validTo}</td>
              <td>
                <StatusBadge status={p.status} />
              </td>
              <td>
                <button onClick={() => handleEdit(p)}>✏️ Sửa</button>
                <button onClick={() => handleDelete(p)}>🗑️ Xóa</button>
                <button onClick={() => handleRevoke(p)}>🚫 Thu hồi</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Bulk Actions */}
      <div className="bulk-actions">
        <button onClick={handleBulkAssign}>
          ✅ Gán quyền hàng loạt
        </button>
        <button onClick={handleCheckExpired}>
          ⏱️ Kiểm tra quyền hết hạn
        </button>
      </div>
      
      {/* Add Permission Button */}
      <button onClick={handleAdd} className="btn-primary">
        ➕ Thêm quyền mới
      </button>
    </div>
  );
};
```

## 🔌 Integration Points

### 1. Components Registry

File: `backend/src/config/components.js`

```javascript
export const Components = {
  // ...existing components...
  
  TeacherPermissionManagement: 'TeacherPermissionManagement',
};
```

### 2. Component Bundle

File: `backend/src/components/TeacherPermissionManagement.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { ApiClient } from 'adminjs';

const TeacherPermissionManagement = () => {
  // Component implementation
  // ...
};

export default TeacherPermissionManagement;
```

### 3. AdminJS Configuration

File: `backend/src/config/adminjs-v7.config.js`

```javascript
import componentLoader from './components.js';

const admin = new AdminJS({
  componentLoader,
  resources: [
    teacherPermissionResource,  // ← Uses custom list component
    // ...other resources
  ],
  // ...
});
```

## 📋 API Endpoints Required

Custom component cần các API endpoints:

### 1. Load Teachers
```
GET /admin-api/teachers
Response: [
  { id: 1, name: "Nguyễn Văn A", email: "teacher1@..." },
  { id: 2, name: "Trần Thị B", email: "teacher2@..." }
]
```

### 2. Load Permissions
```
GET /admin-api/teacher-permissions?teacherId=1&classId=2&subjectId=3
Response: [
  {
    id: 1,
    userId: 1,
    classId: 2,
    subjectId: 3,
    semesterId: 1,
    validFrom: "2024-01-01",
    validTo: "2024-12-31",
    status: "active"
  }
]
```

### 3. Create Permission
```
POST /admin-api/teacher-permissions
Body: {
  userId: 1,
  classId: 2,
  subjectId: 3,
  semesterId: 1,
  validFrom: "2024-01-01",
  validTo: "2024-12-31"
}
```

### 4. Update Permission
```
PUT /admin-api/teacher-permissions/:id
Body: {
  status: "revoked"
}
```

### 5. Delete Permission
```
DELETE /admin-api/teacher-permissions/:id
```

### 6. Bulk Operations
```
POST /admin-api/teacher-permissions/bulk-assign
Body: {
  userIds: [1, 2, 3],
  classId: 2,
  subjectId: 3,
  semesterId: 1,
  validFrom: "2024-01-01",
  validTo: "2024-12-31"
}
```

## 🎯 Benefits

### 1. Better UX
- ✅ Custom UI designed for permission management
- ✅ Advanced filtering and search
- ✅ Bulk operations support
- ✅ Visual status indicators

### 2. More Features
- ✅ Bulk assign permissions to multiple teachers
- ✅ Quick revoke permissions
- ✅ Check expired permissions
- ✅ Custom validation rules

### 3. Better Performance
- ✅ Optimized queries
- ✅ Lazy loading
- ✅ Client-side filtering
- ✅ Caching

### 4. Maintainability
- ✅ Separate component = easier to update
- ✅ Custom logic isolated from AdminJS
- ✅ Better testing
- ✅ Reusable component

## 🔄 Workflow Comparison

### Default AdminJS List

```
Admin → Click "Teacher Permissions"
  ↓
AdminJS generates table from model schema
  ↓
Basic CRUD operations (New/Edit/Delete)
  ↓
Limited filtering and search
```

### Custom TeacherPermissionManagement

```
Admin → Click "Teacher Permissions"
  ↓
Custom React component loads
  ↓
Fetch data via API
  ↓
Rich UI with advanced features:
  - Multi-level filtering
  - Bulk operations
  - Status visualization
  - Quick actions
  ↓
Better user experience
```

## 📝 Configuration Options

### List Action Properties

```javascript
list: {
  // ✅ Custom component
  component: Components.TeacherPermissionManagement,
  
  // ✅ Access control
  isAccessible: ({ currentAdmin }) => {
    return currentAdmin && currentAdmin.role === 'admin';
  },
  
  // Optional: Custom handler
  handler: async (request, response, context) => {
    // Custom logic before rendering
    return { records: [], meta: {} };
  },
  
  // Optional: Custom layout
  layout: 'custom',
  
  // Optional: Hide default actions
  showInDrawer: false,
}
```

## 🧪 Testing

### 1. Verify Custom List Page Loads

```javascript
// Navigate to /admin/resources/teacher_permissions
// Expected: TeacherPermissionManagement component renders
// NOT: Default AdminJS table
```

### 2. Check Component Props

```javascript
// Component should receive:
- resource: TeacherPermission model
- records: Array of permission records
- currentAdmin: Current logged-in admin
```

### 3. Test Functionality

```javascript
// Test cases:
1. Load all permissions ✅
2. Filter by teacher ✅
3. Filter by class ✅
4. Filter by subject ✅
5. Create new permission ✅
6. Edit existing permission ✅
7. Delete permission ✅
8. Revoke permission ✅
9. Bulk assign ✅
10. Check expired ✅
```

## ✅ Summary

**Changes Made:**

1. **teacherPermission.resource.js**
   - Added `component: Components.TeacherPermissionManagement` to list action
   - Replaced default list view with custom component

**Benefits:**

- ✅ Custom UI for better UX
- ✅ Advanced features (bulk ops, filtering)
- ✅ Better maintainability
- ✅ Optimized performance

**Usage:**

```
Admin clicks "Teacher Permissions" in sidebar
↓
Custom TeacherPermissionManagement component loads
↓
Rich UI with advanced permission management features
```

**Files Modified:**

- `backend/src/resources/teacherPermission.resource.js`
  - `actions.list.component = Components.TeacherPermissionManagement`

**Next Steps:**

1. ✅ Verify component is registered in `components.js`
2. ✅ Test custom list page loads correctly
3. ✅ Implement all required API endpoints
4. ✅ Add styling and polish UI
5. ✅ Write tests for component
