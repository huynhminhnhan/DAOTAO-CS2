-- Script kiểm tra dữ liệu BulkEnrollment
-- Kiểm tra các trường hợp enrollment có vấn đề

-- 1. Kiểm tra enrollment với class_id không khớp với classId của sinh viên
SELECT 
    e.enrollment_id,
    e.student_id,
    s.studentCode,
    s.fullName,
    s.classId AS student_class_id,
    e.class_id AS enrollment_class_id,
    c1.classCode AS student_class_code,
    c2.classCode AS enrollment_class_code,
    e.subject_id,
    sub.subjectName,
    e.semester_id,
    e.status,
    CASE 
        WHEN c2.classCode LIKE 'RT%' THEN 'Lớp học lại'
        WHEN s.classId != e.class_id THEN 'KHÔNG KHỚP'
        ELSE 'OK'
    END AS check_status
FROM Enrollments e
INNER JOIN Students s ON e.student_id = s.id
INNER JOIN Classes c1 ON s.classId = c1.id
INNER JOIN Classes c2 ON e.class_id = c2.id
INNER JOIN Subjects sub ON e.subject_id = sub.id
WHERE s.classId != e.class_id
ORDER BY e.enrollment_id DESC
LIMIT 50;

-- 2. Thống kê enrollment theo loại lớp
SELECT 
    CASE 
        WHEN c.classCode LIKE 'RT%' THEN 'Lớp học lại'
        ELSE 'Lớp chính quy'
    END AS class_type,
    COUNT(*) AS total_enrollments,
    COUNT(DISTINCT e.student_id) AS total_students,
    COUNT(DISTINCT e.class_id) AS total_classes,
    COUNT(DISTINCT e.subject_id) AS total_subjects
FROM Enrollments e
INNER JOIN Classes c ON e.class_id = c.id
GROUP BY class_type;

-- 3. Kiểm tra các lớp học lại
SELECT 
    c.id,
    c.classCode,
    c.className,
    COUNT(DISTINCT e.enrollment_id) AS total_enrollments,
    COUNT(DISTINCT e.student_id) AS total_students,
    COUNT(DISTINCT e.subject_id) AS total_subjects
FROM Classes c
LEFT JOIN Enrollments e ON c.id = e.class_id
WHERE c.classCode LIKE 'RT%'
GROUP BY c.id, c.classCode, c.className
ORDER BY c.id DESC;

-- 4. Kiểm tra enrollment gần đây (20 records cuối)
SELECT 
    e.enrollment_id,
    e.student_id,
    s.studentCode,
    s.fullName,
    e.class_id,
    c.classCode,
    e.subject_id,
    sub.subjectCode,
    sub.subjectName,
    e.cohort_id,
    e.semester_id,
    e.attempt,
    e.status,
    e.created_at
FROM Enrollments e
INNER JOIN Students s ON e.student_id = s.id
INNER JOIN Classes c ON e.class_id = c.id
INNER JOIN Subjects sub ON e.subject_id = sub.id
ORDER BY e.created_at DESC
LIMIT 20;
