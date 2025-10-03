import React, { useState, useEffect } from 'react';
import { useNotice } from 'adminjs';
import { Box, Button, Text, MessageBox, Select, Loader } from '@adminjs/design-system';

const BulkEnrollmentComponent = () => {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedCohort, setSelectedCohort] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [students, setStudents] = useState([]);
  const addNotice = useNotice();

  // Lấy danh sách lớp và môn học khi component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch classes - if inside AdminJS use admin-api to respect session and teacher assignments
        let classesData = null;
        try {
          if (window && window.location && window.location.pathname && window.location.pathname.startsWith('/admin')) {
            // admin UI: call admin-api which can infer current admin's classes
            const classesResponse = await fetch('/admin-api/teacher-assignments', { credentials: 'include' });
            classesData = await classesResponse.json();
            // Support two shapes: { success: true, data: [...] } or raw array
            let classesArray = [];
            if (Array.isArray(classesData)) {
              classesArray = classesData;
            } else if (classesData && classesData.success && Array.isArray(classesData.data)) {
              classesArray = classesData.data;
            }
            if (classesArray.length) {
              const classOptions = classesArray.map(cls => ({ value: String(cls.id), label: `${cls.classCode} - ${cls.className}` }));
              setClasses(classOptions);
            } else {
              console.debug('BulkEnrollmentComponent: no classes returned from admin-api/teacher-assignments', classesData);
            }
          } else {
            const classesResponse = await fetch('/api/student-import/classes');
            classesData = await classesResponse.json();
            if (classesData.success) {
              const classOptions = classesData.data.map(cls => ({
                value: cls.id.toString(),
                label: `${cls.classCode} - ${cls.className}`
              }));
              setClasses(classOptions);
            }
          }
        } catch (e) {
          console.error('Error fetching classes (bulk enrollment):', e);
        }

        // Fetch subjects  
        const subjectsResponse = await fetch('/api/bulk-enrollment/subjects');
        const subjectsData = await subjectsResponse.json();
        
        if (subjectsData.success) {
          const subjectOptions = subjectsData.data.map(subject => ({
            value: subject.id.toString(),
            label: `${subject.subjectCode} - ${subject.subjectName}`
          }));
          setSubjects(subjectOptions);
        }

        // Fetch cohorts
        const cohortsResponse = await fetch('/api/cohorts');
        const cohortsData = await cohortsResponse.json();
        if (cohortsData.success) {
          const cohortOptions = cohortsData.data.map(cohort => ({
            value: cohort.cohortId.toString(),
            label: cohort.name
          }));
          setCohorts(cohortOptions);
        }

        // Fetch semesters
        const semestersResponse = await fetch('/api/semesters');
        const semestersData = await semestersResponse.json();
        if (semestersData.success) {
          const semesterOptions = semestersData.data.map(semester => ({
            value: semester.semesterId.toString(),
            label: semester.displayName || `${semester.name}`,
            cohortId: semester.cohortId.toString()
          }));
          setSemesters(semesterOptions);
        }

      } catch (error) {
        console.error('Fetch data error:', error);
        addNotice({
          message: `Lỗi tải dữ liệu: ${error.message}`,
          type: 'error'
        });
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  // Lấy danh sách sinh viên khi chọn lớp
  useEffect(() => {
    
    if (selectedClass) {
      fetchStudentsInClass();
    } else {
      setStudents([]);
    }
  }, [selectedClass]);

  const fetchStudentsInClass = async () => {
    try {
      const response = await fetch(`/api/grade/students/by-class/${selectedClass.value}`);
      const data = await response.json();
      if (data.success) {
        // Check if we have students array
        const students = data.students || data.data || [];
       
        
        if (Array.isArray(students) && students.length > 0) {
          // Transform data từ AdminJS format sang flat format
          const transformedStudents = students.map(student => ({
            id: student.id,
            studentCode: student.params ? student.params.studentCode : student.studentCode,
            fullName: student.params ? student.params.fullName : student.fullName,
            email: student.params ? student.params.email : student.email
          }));
        
          setStudents(transformedStudents);
        } else {
         
          setStudents([]);
          addNotice({
            message: 'Không có sinh viên nào trong lớp này',
            type: 'info'
          });
        }
      } else {
        console.log('API returned success: false');
        setStudents([]);
        addNotice({
          message: data.message || 'Không thể tải danh sách sinh viên',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Fetch students error:', error);
      setStudents([]);
      addNotice({
        message: `Lỗi tải sinh viên: ${error.message}`,
        type: 'error'
      });
    }
  };

  const handleBulkEnroll = async () => {
   
    
    // Check for falsy values AND empty strings
    if (!selectedClass || !selectedSubject || !selectedCohort || !selectedSemester ||
        selectedClass === '' || selectedSubject === '' || selectedCohort === '' || selectedSemester === '') {
      addNotice({
        message: 'Vui lòng chọn đầy đủ lớp, môn học, khóa và học kỳ',
        type: 'error'
      });
     
      return;
    }

    if (!students || students.length === 0) {
      addNotice({
        message: 'Không có sinh viên nào trong lớp để đăng ký',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    
    // Extract values if they are objects, otherwise use directly
    const cohortValue = typeof selectedCohort === 'object' ? selectedCohort.value : selectedCohort;
    const semesterValue = typeof selectedSemester === 'object' ? selectedSemester.value : selectedSemester;
    const classValue = typeof selectedClass === 'object' ? selectedClass.value : selectedClass;
    const subjectValue = typeof selectedSubject === 'object' ? selectedSubject.value : selectedSubject;
    
    const requestBody = {
      classId: classValue,
      subjectId: subjectValue,
      cohortId: cohortValue,
      semesterId: semesterValue,
      studentIds: students.map(s => s.id)
    };
    
    console.log('BulkEnroll - Request body:', requestBody);
    
    try {
      const response = await fetch('/api/bulk-enrollment/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (data.success) {
        addNotice({
          message: `Đã đăng ký thành công cho ${data.enrolledCount}/${students.length} sinh viên`,
          type: 'success'
        });
        
        // Reset form
        setSelectedClass('');
        setSelectedSubject('');
        setSelectedCohort('');
        setSelectedSemester('');
        setStudents([]);
      } else {
        addNotice({
          message: data.message || 'Có lỗi xảy ra khi đăng ký',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Bulk enrollment error:', error);
      addNotice({
        message: `Lỗi đăng ký: ${error.message}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Lọc học kỳ theo cohort đã chọn
  const filteredSemesterOptions = selectedCohort && selectedCohort.value
    ? semesters.filter(s => s.cohortId === selectedCohort.value)
    : semesters;

  if (loadingData) {
    return (
      <Box p="xl">
        <Loader />
        <Text mt="default">Đang tải dữ liệu...</Text>
      </Box>
    );
  }

  return (
    <Box p="xl">
      <Box mb="xl">
        <Text variant="h2" mb="lg">🎓 Đăng ký môn học theo lớp</Text>
        <Text color="grey60">
          Chọn lớp, môn học và học kỳ để đăng ký cho tất cả sinh viên trong lớp
        </Text>
      </Box>

      {/* Form chọn lớp, môn học, học kỳ */}
      <Box bg="white" border="default" borderRadius="default" p="xl" mb="xl">
        <Text variant="h3" mb="lg">📋 Thông tin đăng ký</Text>
        
        <Box mb="lg">
          <Text mb="sm">🏫 Chọn lớp học:</Text>
          <Select
            value={selectedClass}
            onChange={(value) => setSelectedClass(value)}
            options={[{ value: '', label: 'Chọn lớp...' }, ...classes]}
            placeholder="Chọn lớp học"
          />
        </Box>

        <Box mb="lg">
          <Text mb="sm">📚 Chọn môn học:</Text>
          <Select
            value={selectedSubject}
            onChange={(value) => setSelectedSubject(value)}
            options={[{ value: '', label: 'Chọn môn học...' }, ...subjects]}
            placeholder="Chọn môn học"
          />
        </Box>

        <Box mb="lg">
          <Text mb="sm">🎓 Chọn khóa:</Text>
          <Select
            value={selectedCohort}
            onChange={(value) => {
              console.log('Cohort selected:', value);
              setSelectedCohort(value);
              setSelectedSemester(null); // Use null instead of empty string
            }}
            options={[{ value: '', label: 'Chọn khóa...' }, ...cohorts]}
            placeholder="Chọn khóa"
          />
        </Box>

        <Box mb="lg">
          <Text mb="sm">📅 Chọn học kỳ:</Text>
          <Select
            value={selectedSemester}
            onChange={(value) => {
              console.log('Semester selected:', value);
              setSelectedSemester(value);
            }}
            options={[{ value: '', label: 'Chọn học kỳ...' }, ...filteredSemesterOptions]}
            placeholder="Chọn học kỳ"
            isDisabled={!selectedCohort}
          />
        </Box>
      </Box>

      {/* Hiển thị danh sách sinh viên */}
      {selectedClass && (
        <Box bg="white" border="default" borderRadius="default" p="xl" mb="xl">
          <Text variant="h3" mb="lg">👥 Sinh viên trong lớp ({students?.length || 0})</Text>
          
          {students && students.length > 0 ? (
            <Box>
              {students.slice(0, 10).map((student, index) => (
                <Box key={student.id} p="sm" border="default" borderRadius="sm" mb="sm">
                  <Text>
                    {index + 1}. {student.studentCode} - {student.fullName}
                  </Text>
                </Box>
              ))}
              {students.length > 10 && (
                <Text color="grey60" mt="sm">
                  ... và {students.length - 10} sinh viên khác
                </Text>
              )}
            </Box>
          ) : (
            <MessageBox message="Không có sinh viên nào trong lớp này" variant="info" />
          )}
        </Box>
      )}

      {/* Nút đăng ký */}
      <Box mt="xl">
        <Button
          onClick={handleBulkEnroll}
          disabled={loading || !selectedClass || !selectedSubject || !selectedCohort || !selectedSemester || !students || students.length === 0}
          variant="primary"
          size="lg"
        >
          {loading ? 'Đang xử lý...' : `🚀 Đăng ký cho ${students?.length || 0} sinh viên`}
        </Button>
      </Box>
    </Box>
  );
};

export default BulkEnrollmentComponent;
