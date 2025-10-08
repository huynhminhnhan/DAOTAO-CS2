# Component API Route Migration Map

## Mục đích
Thay đổi tất cả `/api/*` sang `/admin-api/*` trong các components để sử dụng AdminJS session thay vì JWT.

## Route Mapping

### Cohorts & Semesters
- `/api/cohorts` → `/admin-api/cohorts`
- `/api/semesters` → `/admin-api/semesters`

### Subjects
- `/api/subjects` → `/admin-api/subjects`
- `/api/bulk-enrollment/subjects` → `/admin-api/bulk-enrollment/subjects`

### Grade Routes
- `/api/grade/enrolled-students` → `/admin-api/grade/enrolled-students`
- `/api/grade/class/:classId` → `/admin-api/grade/class/:classId`
- `/api/grade/students/by-class/:classId` → `/admin-api/grade/students/by-class/:classId`
- `/api/grade/save-bulk` → `/admin-api/grade/save-bulk`
- `/api/grades/:gradeId/retake-exam` → `/admin-api/grades/:gradeId/retake-exam`
- `/api/grades/:gradeId/retake-course` → `/admin-api/grades/:gradeId/retake-course`
- `/api/grades/update-retake-exam` → `/admin-api/grades/update-retake-exam`
- `/api/grades/update-retake-course` → `/admin-api/grades/update-retake-course`

### Student Import
- `/api/student-import/classes` → `/admin-api/student-import/classes`
- `/api/student-import/import-students` → `/admin-api/student-import/import-students`
- `/api/student-import/download-template` → `/admin-api/student-import/download-template`

### Bulk Enrollment
- `/api/bulk-enrollment/subjects` → `/admin-api/bulk-enrollment/subjects`
- `/api/bulk-enrollment/enroll` → `/admin-api/bulk-enrollment/enroll`

### Retake System
- `/api/retake/detailed-history` → `/admin-api/retake/detailed-history`
- `/api/retake/create` → `/admin-api/retake/create`
- `/api/retake/submit-scores` → `/admin-api/retake/submit-scores`
- `/api/retake/promote-to-main` → `/admin-api/retake/promote-to-main`

### Student Transcripts
- `/api/student/:studentCode/transcript` → `/admin-api/student/:studentCode/transcript`
- `/api/students` → `/admin-api/students`

### Grade History
- `/api/grade-history` → `/admin-api/grade-history`
- `/api/grade-history/:id` → `/admin-api/grade-history/:id`
- `/api/grade-history/:id/revert` → `/admin-api/grade-history/:id/revert`

## Components to Update

1. ✅ GradeEntryPageComponent.jsx
2. ✅ RetakeCourseModal.jsx
3. ✅ BulkEnrollmentComponent.jsx
4. ✅ StudentImportComponent.jsx
5. ✅ ManagedClassesMultiSelect.jsx
6. ✅ EnhancedGradeRetakeModal.jsx
7. ✅ StudentRecordTranscriptComponent.jsx
8. ✅ StudentTranscriptComponent.jsx
9. ✅ RetakeExamModal.jsx
10. ✅ GradeRetakeModal.jsx
11. ✅ StudentGradeHistoryTab.jsx

## Sed Command Pattern

```bash
sed -i '' 's/\/api\//\/admin-api\//g' <component-file>
```

## Note
- Giữ nguyên `/admin-api/*` routes (đã đúng)
- Chỉ thay `/api/*` → `/admin-api/*`
