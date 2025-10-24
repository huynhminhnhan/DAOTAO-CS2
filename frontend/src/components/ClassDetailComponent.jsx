import React, { useState, useEffect } from 'react';
import { ApiClient, useRecord } from 'adminjs';
import { Box, Badge, Loader, Text, ValueGroup, Table, TableHead, TableBody, TableRow, TableCell } from '@adminjs/design-system';

/**
 * Class Detail Component
 * Hiển thị thông tin chi tiết lớp học và danh sách sinh viên
 */
const ClassDetailComponent = (props) => {
  const { record: classRecord } = useRecord(props.record);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cohortInfo, setCohortInfo] = useState(null);
  const [teachersInfo, setTeachersInfo] = useState({});
  
  const api = new ApiClient();
  const classId = classRecord?.params?.id;

  // Load student list
  useEffect(() => {
    const loadStudents = async () => {
      if (!classId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Load students from API
        const response = await fetch(`/admin-api/classes/${classId}/students`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Không thể tải danh sách sinh viên');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setStudents(data.students || []);
        } else {
          setError(data.message || 'Lỗi không xác định');
        }
      } catch (err) {
        console.error('Error loading students:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [classId]);

  // Load cohort info
  useEffect(() => {
    const loadCohortInfo = async () => {
      const cohortId = classRecord?.params?.cohortId;
      if (!cohortId) {
        console.log('No cohortId found');
        return;
      }
      
      try {
        console.log('Loading cohort info for ID:', cohortId);
        const response = await fetch(`/admin-api/cohorts/${cohortId}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Không thể tải thông tin khóa học');
        }
        
        const data = await response.json();
        console.log('Cohort data:', data);
        
        if (data.success && data.data) {
          setCohortInfo(data.data);
        }
      } catch (err) {
        console.error('Error loading cohort:', err);
      }
    };
    
    loadCohortInfo();
  }, [classRecord?.params?.cohortId]);

  // Load teacher info
  useEffect(() => {
    const loadTeachersInfo = async () => {
      const teacherIds = [
        classRecord?.params?.homeroomTeacherId,
        classRecord?.params?.trainingTeacherId,
        classRecord?.params?.examTeacherId
      ].filter(Boolean);
      
      if (teacherIds.length === 0) {
        console.log('No teacher IDs found');
        return;
      }
      
      console.log('Loading teachers:', teacherIds);
      
      try {
        const response = await fetch(`/admin-api/teachers?ids=${teacherIds.join(',')}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Không thể tải thông tin giáo viên');
        }
        
        const data = await response.json();
        console.log('Teachers data:', data);
        
        if (data.success && data.teachers) {
          const teachersMap = {};
          data.teachers.forEach(teacher => {
            teachersMap[teacher.id] = teacher;
          });
          setTeachersInfo(teachersMap);
        }
      } catch (err) {
        console.error('Error loading teachers:', err);
      }
    };
    
    loadTeachersInfo();
  }, [classRecord?.params?.homeroomTeacherId, classRecord?.params?.trainingTeacherId, classRecord?.params?.examTeacherId]);

  if (!classRecord) {
    return (
      <Box p="xxl">
        <Text>Không tìm thấy thông tin lớp học</Text>
      </Box>
    );
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      'active': { variant: 'success', label: '✅ Đang hoạt động' },
      'inactive': { variant: 'default', label: '⏸️ Tạm nghỉ' },
      'graduated': { variant: 'info', label: '🎓 Đã tốt nghiệp' }
    };
    
    const config = statusConfig[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStudentStatusBadge = (status) => {
    const statusConfig = {
      'active': { variant: 'success', label: '✅ Đang học' },
      'suspended': { variant: 'danger', label: '⏸️ Bảo lưu' },
      'graduated': { variant: 'info', label: '🎓 Đã tốt nghiệp' },
      'expelled': { variant: 'danger', label: '❌ Đã thôi học' }
    };
    
    const config = statusConfig[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
  };

  const getGenderDisplay = (gender) => {
    if (!gender) return '-';
    
    const genderMap = {
      'male': 'Nam',
      'female': 'Nữ',
      'other': 'Khác',
      'nam': 'Nam',
      'nữ': 'Nữ',
      'nu': 'Nữ'
    };
    
    return genderMap[gender.toLowerCase()] || gender;
  };

  const getTeacherName = (teacherId) => {
    const teacher = teachersInfo[teacherId];
    if (!teacher) return 'Đang tải...';
    // Try different possible field structures
    return teacher.fullName || teacher.name || teacher.email || `Teacher #${teacherId}`;
  };

  const getCohortDisplay = () => {
    if (!cohortInfo) return 'Đang tải...';
    
    // Try different possible field structures
    const name = cohortInfo.name || cohortInfo.cohortName || 'N/A';
    const startYear = cohortInfo.startYear;
    const endYear = cohortInfo.endYear;
    
    return (
      <>
        {name}
        {startYear && endYear && (
          <>
            <br/>
            <Text color="grey60" fontSize="sm">
              ({startYear} - {endYear})
            </Text>
          </>
        )}
      </>
    );
  };

  return (
    <Box>
      {/* Header với tên lớp */}
      <Box 
        bg="white" 
        p="xxl" 
        mb="xl"
        style={{
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #e0e0e0'
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" mb="lg">
          <Box>
            <Text variant="h4" mb="sm">
              🏫 {classRecord.params?.className}
            </Text>
            <Text color="grey60" fontSize="lg">
              Mã lớp: <strong>{classRecord.params?.classCode}</strong>
            </Text>
          </Box>
          <Box>
            {getStatusBadge(classRecord.params?.status)}
          </Box>
        </Box>

        {/* Thông tin cơ bản */}
        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginTop: '20px'
          }}
        >
          <ValueGroup label="🎓 Khóa học">
            <Text>
              {getCohortDisplay()}
            </Text>
          </ValueGroup>

          <ValueGroup label="📅 Thời gian đào tạo">
            <Text>
              {classRecord.params?.startYear} - {classRecord.params?.endYear}
            </Text>
          </ValueGroup>

          <ValueGroup label="👥 Sĩ số">
            <Text>
              <strong style={{ fontSize: '18px', color: '#1976d2' }}>
                {loading ? '...' : students.length}
              </strong>
              {classRecord.params?.maxStudents && (
                <span style={{ color: '#666' }}> / {classRecord.params?.maxStudents}</span>
              )}
              {' sinh viên'}
            </Text>
          </ValueGroup>
        </Box>

        {/* Thông tin giáo viên */}
        <Box mt="xl" pt="lg" style={{ borderTop: '1px solid #e0e0e0' }}>
          <Text variant="h6" mb="default">👨‍🏫 Giáo viên phụ trách</Text>
          <Box
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '15px'
            }}
          >
            {classRecord.params?.homeroomTeacherId && (
              <ValueGroup label="Giáo viên chủ nhiệm">
                <Text>{getTeacherName(classRecord.params.homeroomTeacherId)}</Text>
              </ValueGroup>
            )}

            {classRecord.params?.trainingTeacherId && (
              <ValueGroup label="Giáo viên đào tạo">
                <Text>{getTeacherName(classRecord.params.trainingTeacherId)}</Text>
              </ValueGroup>
            )}

            {classRecord.params?.examTeacherId && (
              <ValueGroup label="Giáo viên khảo thí">
                <Text>{getTeacherName(classRecord.params.examTeacherId)}</Text>
              </ValueGroup>
            )}
          </Box>
        </Box>
      </Box>

      {/* Danh sách sinh viên */}
      <Box 
        bg="white" 
        p="xxl"
        style={{
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #e0e0e0'
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" mb="lg">
          <Text variant="h5">
            📋 Danh sách sinh viên ({students.length})
          </Text>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" p="xxl">
            <Loader />
          </Box>
        ) : error ? (
          <Box p="lg" bg="errorLight" borderRadius="default">
            <Text color="error">❌ {error}</Text>
          </Box>
        ) : students.length === 0 ? (
          <Box p="xxl" textAlign="center">
            <Text color="grey60" fontSize="lg">
              📭 Chưa có sinh viên nào trong lớp này
            </Text>
          </Box>
        ) : (
          <Box style={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell style={{ fontWeight: 'bold', minWidth: '50px' }}>STT</TableCell>
                  <TableCell style={{ fontWeight: 'bold', minWidth: '100px' }}>Mã SV</TableCell>
                  <TableCell style={{ fontWeight: 'bold', minWidth: '200px' }}>Họ và tên</TableCell>
                  <TableCell style={{ fontWeight: 'bold', minWidth: '180px' }}>Email</TableCell>
                  <TableCell style={{ fontWeight: 'bold', minWidth: '120px' }}>Số điện thoại</TableCell>
                  <TableCell style={{ fontWeight: 'bold', minWidth: '100px' }}>Giới tính</TableCell>
                  <TableCell style={{ fontWeight: 'bold', minWidth: '120px' }}>Trạng thái</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map((student, index) => (
                  <TableRow key={student.studentId || index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <a 
                        href={`/admin/resources/students/records/${student.studentId}/show`}
                        style={{ color: '#1976d2', textDecoration: 'none' }}
                      >
                        {student.studentCode}
                      </a>
                    </TableCell>
                    <TableCell>{student.fullName}</TableCell>
                    <TableCell>{student.email || '-'}</TableCell>
                    <TableCell>{student.phone || '-'}</TableCell>
                    <TableCell>{getGenderDisplay(student.gender)}</TableCell>
                    <TableCell>{getStudentStatusBadge(student.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Box>

      {/* Thông tin bổ sung */}
      <Box 
        bg="white" 
        p="lg" 
        mt="lg"
        style={{
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #e0e0e0',
          fontSize: '12px',
          color: '#666'
        }}
      >
        <Text fontSize="sm" color="grey60">
          🕒 Tạo lúc: {classRecord.params?.createdAt ? new Date(classRecord.params.createdAt).toLocaleString('vi-VN') : '-'}
          {' | '}
          Cập nhật: {classRecord.params?.updatedAt ? new Date(classRecord.params.updatedAt).toLocaleString('vi-VN') : '-'}
        </Text>
      </Box>
    </Box>
  );
};

export default ClassDetailComponent;
