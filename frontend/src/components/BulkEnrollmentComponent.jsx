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
        // We'll fetch classes per-cohort when cohort is selected (see cohort change handler)

  // Fetch subjects  
  const subjectsResponse = await fetch('/admin-api/bulk-enrollment/subjects');
        const subjectsData = await subjectsResponse.json();
        
        if (subjectsData.success) {
          const subjectOptions = subjectsData.data.map(subject => ({
            value: subject.id.toString(),
            label: `${subject.subjectCode} - ${subject.subjectName}`
          }));
          setSubjects(subjectOptions);
        }

  // Fetch cohorts
  const cohortsResponse = await fetch('/admin-api/cohorts');
        const cohortsData = await cohortsResponse.json();
        if (cohortsData.success) {
          const cohortOptions = cohortsData.data.map(cohort => ({
            value: cohort.cohortId.toString(),
            label: cohort.name
          }));
          setCohorts(cohortOptions);
        }

        // We'll fetch semesters per-cohort when cohort is selected (see cohort change handler)

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

  // When cohort changes: load classes and semesters for that cohort
  useEffect(() => {
    const fetchClassesAndSemestersByCohort = async (cohortId) => {
      if (!cohortId) return;
      try {
        // Fetch classes for the cohort
        const classesResp = await fetch(`/admin-api/classes/by-cohort/${cohortId}`, { credentials: 'include' });
        const classesJson = await classesResp.json();
        if (classesJson && classesJson.success && Array.isArray(classesJson.data)) {
          const classOptions = classesJson.data.map(cls => ({ value: cls.id.toString(), label: `${cls.classCode} - ${cls.className}` }));
          setClasses(classOptions);
        } else if (Array.isArray(classesJson)) {
          const classOptions = classesJson.map(cls => ({ value: cls.id.toString(), label: `${cls.classCode} - ${cls.className}` }));
          setClasses(classOptions);
        } else {
          setClasses([]);
        }

        // Fetch semesters for the cohort
        const semResp = await fetch(`/admin-api/semesters/by-cohort/${cohortId}`, { credentials: 'include' });
        const semJson = await semResp.json();
        if (semJson && semJson.success) {
          const sems = semJson.semesters || semJson.data || [];
          const semesterOptions = sems.map(semester => ({ value: semester.semesterId.toString(), label: semester.displayName || semester.name, cohortId: semester.cohortId ? semester.cohortId.toString() : '' }));
          setSemesters(semesterOptions);
        } else {
          setSemesters([]);
        }

      } catch (err) {
        console.error('Error fetching classes or semesters by cohort:', err);
        setClasses([]);
        setSemesters([]);
      }
    };

    // extract id if selectedCohort is an object
    const cohortVal = selectedCohort && typeof selectedCohort === 'object' ? selectedCohort.value : selectedCohort;
    if (cohortVal) {
      // reset downstream selections
      setSelectedSemester('');
      setSelectedClass('');
      setSelectedSubject('');
      setStudents([]);
      fetchClassesAndSemestersByCohort(cohortVal);
    } else {
      setClasses([]);
      setSemesters([]);
    }
  }, [selectedCohort]);

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
      const response = await fetch(`/admin-api/grade/students/by-class/${selectedClass.value}`);
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
      const response = await fetch('/admin-api/bulk-enrollment/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      console.log('BulkEnroll - Response:', data);
      
      if (data.success) {
        const { enrolledCount = 0, existingCount = 0, errors = [] } = data;
        const totalProcessed = enrolledCount + existingCount;
        
        // Tạo message chi tiết
        let message = '';
        if (enrolledCount > 0 && existingCount > 0) {
          message = `✅ Đăng ký mới: ${enrolledCount} sinh viên\n⚠️ Đã đăng ký trước: ${existingCount} sinh viên`;
        } else if (enrolledCount > 0) {
          message = `✅ Đã đăng ký thành công cho ${enrolledCount}/${students.length} sinh viên`;
        } else if (existingCount > 0) {
          message = `ℹ️ Tất cả ${existingCount} sinh viên đã được đăng ký trước đó`;
        } else {
          message = '❌ Không có sinh viên nào được đăng ký';
        }
        
        // Thêm thông tin lỗi nếu có
        if (errors.length > 0) {
          message += `\n\n⚠️ Có ${errors.length} lỗi:\n${errors.slice(0, 3).join('\n')}`;
          if (errors.length > 3) {
            message += `\n... và ${errors.length - 3} lỗi khác`;
          }
        }
        
        addNotice({
          message,
          type: enrolledCount > 0 ? 'success' : (existingCount > 0 ? 'info' : 'warning')
        });
        
        // Reset form chỉ khi có sinh viên mới được đăng ký
        if (enrolledCount > 0) {
          setSelectedClass('');
          setSelectedSubject('');
          setSelectedCohort('');
          setSelectedSemester('');
          setStudents([]);
        }
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

  // Lọc học kỳ theo cohort đã chọn (supports selectedCohort as object or raw value)
  const cohortFilterVal = selectedCohort && typeof selectedCohort === 'object' ? selectedCohort.value : selectedCohort;
  const filteredSemesterOptions = cohortFilterVal
    ? semesters.filter(s => String(s.cohortId) === String(cohortFilterVal))
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
        
        {/* Reordered selects: Cohort -> Semester -> Class -> Subject */}
        <Box mb="lg">
          <Text mb="sm">Chọn khóa:</Text>
          <Select
            value={selectedCohort}
            onChange={(value) => {
             
              setSelectedCohort(value);
            }}
            options={[{ value: '', label: 'Chọn khóa...' }, ...cohorts]}
            placeholder="Chọn khóa"
          />
        </Box>

        <Box mb="lg">
          <Text mb="sm"> Chọn học kỳ:</Text>
          <Select
            value={selectedSemester}
            onChange={(value) => {
             
              setSelectedSemester(value);
            }}
            options={[{ value: '', label: 'Chọn học kỳ...' }, ...filteredSemesterOptions]}
            placeholder="Chọn học kỳ"
            isDisabled={!selectedCohort}
          />
        </Box>

        <Box mb="lg">
          <Text mb="sm"> Chọn lớp học:</Text>
          <Select
            value={selectedClass}
            onChange={(value) => setSelectedClass(value)}
            options={[{ value: '', label: 'Chọn lớp...' }, ...classes]}
            placeholder="Chọn lớp học"
            isDisabled={!selectedCohort || !selectedSemester}
          />
        </Box>

        <Box mb="lg">
          <Text mb="sm"> Chọn môn học:</Text>
          <Select
            value={selectedSubject}
            onChange={(value) => setSelectedSubject(value)}
            options={[{ value: '', label: 'Chọn môn học...' }, ...subjects]}
            placeholder="Chọn môn học"
            isDisabled={!selectedClass}
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
