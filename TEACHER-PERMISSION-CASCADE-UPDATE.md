# Teacher Permission Management - Cascade Loading Update

## Tổng quan thay đổi

Cập nhật `TeacherPermissionManagement.jsx` để sử dụng cùng logic chọn khóa học (cascade loading) như `GradeEntryPageComponent`.

## Ngày cập nhật
8 tháng 10, 2025

## Các thay đổi chính

### 1. **State Management**
**Trước:**
```javascript
const [classes, setClasses] = useState([]); // Tất cả classes
const [subjects, setSubjects] = useState([]); // Tất cả subjects
const [enrollments, setEnrollments] = useState([]); // Tất cả enrollments
```

**Sau:**
```javascript
const [classes, setClasses] = useState([]); // Classes theo cohort đã chọn
const [subjects, setSubjects] = useState([]); // Subjects theo class đã chọn
const [cohorts, setCohorts] = useState([]); // Tất cả cohorts
```

**Lý do:** Không cần load tất cả dữ liệu trước, chỉ load theo yêu cầu (lazy loading).

---

### 2. **Load Cohorts từ API Endpoint**
**Trước:** Load từ AdminJS resourceAction
```javascript
const cohortsResponse = await api.resourceAction({
  resourceId: 'Cohorts',
  actionName: 'list',
  params: {}
});
setCohorts(cohortsResponse.data.records || []);
```

**Sau:** Load từ `/admin-api/cohorts`
```javascript
const endpoint = '/admin-api/cohorts';
const cohortResponse = await fetch(endpoint, { credentials: 'include' });
const cohortData = await cohortResponse.json();

if (cohortData.success) {
  const validCohorts = cohortData.data.map(cohort => {
    const cohortId = parseInt(cohort.cohortId);
    if (isNaN(cohortId)) {
      console.warn('⚠️ Invalid cohort ID:', cohort);
      return null;
    }
    return {
      cohortId: cohortId,
      name: cohort.name,
      startYear: cohort.startYear,
      endYear: cohort.endYear
    };
  }).filter(Boolean);
  
  setCohorts(validCohorts);
}
```

**Lý do:** 
- Sử dụng cùng API endpoint như `GradeEntryPageComponent`
- Đảm bảo dữ liệu được format nhất quán
- Có validation cho cohortId

---

### 3. **Cascade Loading với useEffect**

#### 3.1. Load Classes khi Cohort được chọn
```javascript
useEffect(() => {
  const loadClassesForPermissions = async () => {
    // Lấy tất cả cohortId đã được chọn
    const selectedCohortIds = [...new Set(
      permissionList
        .map(perm => perm.cohortId)
        .filter(id => id)
    )];
    
    if (selectedCohortIds.length === 0) {
      setClasses([]);
      return;
    }
    
    // Load classes cho tất cả cohort đã chọn
    const allClasses = [];
    
    for (const cohortId of selectedCohortIds) {
      const endpoint = `/admin-api/classes/by-cohort/${cohortId}`;
      const response = await fetch(endpoint, { credentials: 'include' });
      const data = await response.json();
      
      if (data.success) {
        const validClasses = data.data.map(cls => {
          const classId = parseInt(cls.id);
          if (isNaN(classId)) return null;
          
          return {
            id: classId,
            cohortId: cohortId, // Lưu cohortId để filter
            className: cls.className,
            classCode: cls.classCode,
            academicYear: cls.academicYear,
            semester: cls.semester,
            isRetakeClass: cls.isRetakeClass || false
          };
        }).filter(Boolean);
        
        allClasses.push(...validClasses);
      }
    }
    
    setClasses(allClasses);
  };
  
  loadClassesForPermissions();
}, [permissionList.map(p => p.cohortId).join(',')]); // Trigger khi cohortId thay đổi
```

**Đặc điểm:**
- Tự động load classes khi cohortId thay đổi trong bất kỳ permission nào
- Có thể load classes cho nhiều cohort cùng lúc (support multiple permissions)
- Lưu cohortId trong mỗi class object để dễ filter

#### 3.2. Load Subjects khi Class được chọn
```javascript
useEffect(() => {
  const loadSubjectsForPermissions = async () => {
    const selectedClassIds = [...new Set(
      permissionList
        .map(perm => perm.classId)
        .filter(id => id)
    )];
    
    if (selectedClassIds.length === 0) {
      setSubjects([]);
      return;
    }
    
    const allSubjects = [];
    
    for (const classId of selectedClassIds) {
      const response = await fetch(`/admin-api/subjects/by-class/${classId}`, { 
        credentials: 'include' 
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        const subjects = data.data.map(classSubject => {
          const subject = classSubject.subject;
          const subjectId = parseInt(subject.id || subject.subjectId);
          
          if (isNaN(subjectId)) return null;
          
          return {
            id: subjectId,
            classId: classId, // Lưu classId để filter
            subjectCode: subject.subjectCode,
            subjectName: subject.subjectName,
            credits: subject.credits,
            category: subject.category
          };
        }).filter(Boolean);
        
        allSubjects.push(...subjects);
      }
    }
    
    // Remove duplicates based on subjectId
    const uniqueSubjects = allSubjects.reduce((acc, subject) => {
      if (!acc.find(s => s.id === subject.id)) {
        acc.push(subject);
      }
      return acc;
    }, []);
    
    setSubjects(uniqueSubjects);
  };
  
  loadSubjectsForPermissions();
}, [permissionList.map(p => p.classId).join(',')]);
```

**Đặc điểm:**
- Tự động load subjects khi classId thay đổi
- Remove duplicate subjects (một môn có thể có trong nhiều lớp)
- Lưu classId trong mỗi subject object để dễ filter

---

### 4. **Filter Functions**

**Trước:** Filter từ tất cả dữ liệu đã load
```javascript
const getFilteredClasses = (cohortId) => {
  if (!cohortId) return classes;
  return classes.filter(cls => cls.params.cohort_id === cohortId);
};

const getFilteredSubjects = (classId) => {
  if (!classId) return subjects;
  const subjectIds = enrollments
    .filter(enr => enr.params.classId === parseInt(classId))
    .map(enr => enr.params.subjectId);
  const uniqueSubjectIds = [...new Set(subjectIds)];
  return subjects.filter(subj => uniqueSubjectIds.includes(subj.params.id));
};
```

**Sau:** Filter từ dữ liệu đã được load động
```javascript
const getFilteredClasses = (cohortId) => {
  if (!cohortId) return [];
  return classes.filter(cls => cls.cohortId === parseInt(cohortId));
};

const getFilteredSubjects = (classId) => {
  if (!classId) return [];
  return subjects.filter(subj => subj.classId === parseInt(classId));
};
```

**Lý do:**
- Đơn giản hơn vì dữ liệu đã được filter khi load
- Không cần enrollments nữa
- Performance tốt hơn

---

### 5. **Validation Update**

Thêm validation cho cohortId (bắt buộc):
```javascript
if (!perm.cohortId) {
  sendNotice({ message: `Permission ${i + 1}: Khóa học là bắt buộc`, type: 'error' });
  return;
}
```

---

### 6. **UI Updates**

#### Dropdown Khóa học
**Trước:**
```jsx
<Label>🎓 Khóa (để trống = tất cả)</Label>
<option value="">-- Tất cả các khóa --</option>
{cohorts.map(cohort => (
  <option key={cohort.id} value={cohort.params.cohort_id}>
    {cohort.params.name}
  </option>
))}
```

**Sau:**
```jsx
<Label required>🎓 Khóa</Label>
<option value="">-- Chọn khóa học --</option>
{cohorts.map(cohort => (
  <option key={cohort.cohortId} value={cohort.cohortId}>
    {cohort.name} ({cohort.startYear} - {cohort.endYear})
  </option>
))}
```

#### Dropdown Lớp và Môn học
- Cập nhật để sử dụng format dữ liệu mới (không có `.params`)
- Thêm thông tin rõ ràng hơn trong label

---

## Flow hoạt động mới

```
1. Component mount
   └─> Load users, cohorts, semesters

2. User chọn cohort trong permission
   └─> useEffect trigger
       └─> Load classes từ `/admin-api/classes/by-cohort/{cohortId}`
           └─> Update state classes

3. User chọn class trong permission
   └─> useEffect trigger
       └─> Load subjects từ `/admin-api/subjects/by-class/{classId}`
           └─> Update state subjects

4. User fill form và save
   └─> Validate (cohortId, semesterId, validFrom, validTo required)
       └─> Lưu permissions vào database
```

---

## Lợi ích

### 1. **Performance**
- ✅ Không load tất cả classes và subjects ngay từ đầu
- ✅ Chỉ load dữ liệu cần thiết theo yêu cầu
- ✅ Giảm memory usage

### 2. **Consistency**
- ✅ Sử dụng cùng API endpoints như GradeEntryPageComponent
- ✅ Cùng logic cascade loading
- ✅ Dễ maintain và debug

### 3. **User Experience**
- ✅ Dropdown được disable rõ ràng khi chưa chọn điều kiện trước
- ✅ Message hướng dẫn rõ ràng
- ✅ Validation messages cụ thể

### 4. **Code Quality**
- ✅ Remove dependencies không cần thiết (enrollments)
- ✅ Cleaner state management
- ✅ Better separation of concerns

---

## Testing Checklist

- [ ] Load cohorts hiển thị đúng
- [ ] Chọn cohort → Load classes tương ứng
- [ ] Chọn class → Load subjects tương ứng
- [ ] Cascade reset khi đổi cohort (reset semesterId, classId, subjectId)
- [ ] Cascade reset khi đổi class (reset subjectId)
- [ ] Validation hoạt động đúng
- [ ] Multiple permissions trong cùng form hoạt động độc lập
- [ ] Save permissions thành công
- [ ] Load existing permissions hiển thị đúng

---

## API Endpoints sử dụng

1. `/admin-api/cohorts` - Load danh sách khóa học
2. `/admin-api/classes/by-cohort/{cohortId}` - Load lớp theo khóa
3. `/admin-api/subjects/by-class/{classId}` - Load môn học theo lớp

---

## Các file liên quan

- `src/components/TeacherPermissionManagement.jsx` - Component chính
- `src/components/GradeEntryPageComponent.jsx` - Reference component
- API routes trong `src/routes/` hoặc `src/controllers/`

---

## Notes

- ⚠️ Cần đảm bảo các API endpoints hoạt động đúng
- ⚠️ Test kỹ với nhiều permissions cùng lúc
- ⚠️ Kiểm tra performance khi có nhiều cohorts/classes/subjects

---

## Author
Updated by GitHub Copilot
Date: 8 tháng 10, 2025
