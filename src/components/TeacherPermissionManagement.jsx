/**
 * Teacher Permission Management Component
 * Custom UI cho việc gán quyền nhập điểm cho giảng viên
 */

import React, { useState, useEffect } from 'react';
import { Box, Button, Label, Text, Icon, Loader, MessageBox } from '@adminjs/design-system';
import { ApiClient, useNotice } from 'adminjs';

const TeacherPermissionManagement = () => {
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]); // Classes theo cohort đã chọn
  const [subjects, setSubjects] = useState([]); // Subjects theo class đã chọn
  const [cohorts, setCohorts] = useState([]); // Tất cả cohorts
  const [semesters, setSemesters] = useState([]); // Tất cả semesters
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState('');
  const [permissionList, setPermissionList] = useState([
    {
      semesterId: '',
      classId: '',
      subjectId: '',
      cohortId: '',
      validFrom: '',
      validTo: '',
      notes: ''
    }
  ]);

  const sendNotice = useNotice();
  const api = new ApiClient();

  // Load dữ liệu ban đầu (users, cohorts, semesters)
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Load users (chỉ teachers)
      const usersResponse = await api.resourceAction({
        resourceId: 'users',
        actionName: 'list',
        params: {}
      });
      
      const teacherUsers = (usersResponse.data.records || []).filter(
        r => r.params.role === 'teacher'
      );
      setUsers(teacherUsers);

      // Load cohorts từ API endpoint (giống GradeEntryPageComponent)
      console.log('Loading cohorts...');
      const endpoint = '/admin-api/cohorts';
      const cohortResponse = await fetch(endpoint, { credentials: 'include' });
      const cohortData = await cohortResponse.json();
      
      if (cohortData.success) {
        console.log('✅ Cohorts loaded:', cohortData.data.length);
        
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
      } else {
        console.error('❌ Failed to load cohorts:', cohortData.message);
        sendNotice({ message: 'Không thể tải danh sách khóa học: ' + cohortData.message, type: 'error' });
      }

      // Load semesters (giữ nguyên từ AdminJS)
      const semestersResponse = await api.resourceAction({
        resourceId: 'Semesters',
        actionName: 'list',
        params: {}
      });
      const loadedSemesters = semestersResponse.data.records || [];
      console.log('✅ Semesters loaded:', loadedSemesters.length);
      console.log('📋 Sample semester:', loadedSemesters[0]);
      setSemesters(loadedSemesters);

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      sendNotice({ message: 'Lỗi khi tải dữ liệu: ' + error.message, type: 'error' });
      setLoading(false);
    }
  };

  // Load permissions của user đã chọn
  const loadUserPermissions = async (userId) => {
    if (!userId) return;
    
    try {
      const response = await api.resourceAction({
        resourceId: 'teacher_permissions',
        actionName: 'list',
        params: {
          filters: {
            userId: userId
          }
        }
      });

      const loadedPermissions = response.data.records || [];
      setPermissions(loadedPermissions);
      
      // Load all classes và subjects cần thiết để display
      await loadDataForPermissions(loadedPermissions);
      
    } catch (error) {
      console.error('Error loading permissions:', error);
      sendNotice({ message: 'Lỗi khi tải quyền của user', type: 'error' });
    }
  };
  
  // Load classes và subjects cần thiết cho permissions display
  const loadDataForPermissions = async (permissions) => {
    try {
      // Lấy unique cohortIds và classIds từ permissions
      const cohortIds = [...new Set(permissions.map(p => p.params.cohortId).filter(id => id))];
      const classIds = [...new Set(permissions.map(p => p.params.classId).filter(id => id))];
      
      // Load classes cho các cohorts
      const allClasses = [];
      for (const cohortId of cohortIds) {
        const response = await fetch(`/admin-api/classes/by-cohort/${cohortId}`, { 
          credentials: 'include' 
        });
        const data = await response.json();
        if (data.success) {
          const validClasses = data.data.map(cls => ({
            id: parseInt(cls.id),
            cohortId: parseInt(cohortId),
            className: cls.className,
            classCode: cls.classCode
          })).filter(c => !isNaN(c.id));
          allClasses.push(...validClasses);
        }
      }
      
      // Load subjects cho các classes
      const allSubjects = [];
      for (const classId of classIds) {
        const response = await fetch(`/admin-api/subjects/by-class/${classId}`, { 
          credentials: 'include' 
        });
        const data = await response.json();
        if (data.success && data.data) {
          const subjects = data.data.map(cs => {
            const subject = cs.subject;
            return {
              id: parseInt(subject.id || subject.subjectId),
              classId: parseInt(classId),
              subjectName: subject.subjectName,
              subjectCode: subject.subjectCode
            };
          }).filter(s => !isNaN(s.id));
          allSubjects.push(...subjects);
        }
      }
      
      // Merge vào state hiện tại (không overwrite)
      setClasses(prevClasses => {
        const merged = [...prevClasses];
        allClasses.forEach(cls => {
          if (!merged.find(c => c.id === cls.id)) {
            merged.push(cls);
          }
        });
        return merged;
      });
      
      setSubjects(prevSubjects => {
        const merged = [...prevSubjects];
        allSubjects.forEach(subj => {
          if (!merged.find(s => s.id === subj.id)) {
            merged.push(subj);
          }
        });
        return merged;
      });
      
      console.log('✅ Loaded data for permissions display:', {
        classes: allClasses.length,
        subjects: allSubjects.length
      });
      
    } catch (error) {
      console.error('Error loading data for permissions:', error);
    }
  };

  // Thêm permission mới vào list
  const addPermission = () => {
    setPermissionList([
      ...permissionList,
      {
        semesterId: '',
        classId: '',
        subjectId: '',
        cohortId: '',
        validFrom: '',
        validTo: '',
        notes: ''
      }
    ]);
  };

  // Xóa permission khỏi list
  const removePermission = (index) => {
    const newList = permissionList.filter((_, i) => i !== index);
    setPermissionList(newList);
  };

  // Load classes khi cohort được chọn trong bất kỳ permission nào
  useEffect(() => {
    const loadClassesForPermissions = async () => {
      // Lấy tất cả cohortId đã được chọn
      const selectedCohortIds = [...new Set(
        permissionList
          .map(perm => perm.cohortId)
          .filter(id => id)
      )];
      
      console.log('🔄 useEffect triggered - Selected cohort IDs:', selectedCohortIds);
      
      if (selectedCohortIds.length === 0) {
        console.log('⚠️ No cohort selected, clearing classes');
        setClasses([]);
        return;
      }
      
      // Load classes cho tất cả cohort đã chọn
      try {
        const allClasses = [];
        
        for (const cohortId of selectedCohortIds) {
          console.log('📡 Loading classes for cohort:', cohortId);
          const endpoint = `/admin-api/classes/by-cohort/${cohortId}`;
          const response = await fetch(endpoint, { credentials: 'include' });
          const data = await response.json();
          
          console.log('📥 Response data:', data);
          
          if (data.success) {
            console.log('✅ Classes received:', data.data.length);
            const validClasses = data.data.map(cls => {
              const classId = parseInt(cls.id);
              if (isNaN(classId)) {
                console.warn('⚠️ Invalid class ID:', cls);
                return null;
              }
              return {
                id: classId,
                cohortId: parseInt(cohortId), // Lưu cohortId để filter (convert to int)
                className: cls.className,
                classCode: cls.classCode,
                academicYear: cls.academicYear,
                semester: cls.semester,
                isRetakeClass: cls.isRetakeClass || false
              };
            }).filter(Boolean);
            
            console.log('✅ Valid classes after processing:', validClasses.length);
            allClasses.push(...validClasses);
          } else {
            console.error('❌ Failed to load classes:', data.message);
          }
        }
        
        console.log('✅ Total classes loaded:', allClasses.length);
        console.log('📋 Classes array:', allClasses);
        setClasses(allClasses);
      } catch (error) {
        console.error('❌ Error loading classes:', error);
        sendNotice({ message: 'Không thể tải danh sách lớp: ' + error.message, type: 'error' });
      }
    };
    
    loadClassesForPermissions();
  }, [permissionList.map(p => p.cohortId).join(',')]); // Trigger khi cohortId thay đổi

  // Load subjects khi class được chọn trong bất kỳ permission nào
  useEffect(() => {
    const loadSubjectsForPermissions = async () => {
      // Lấy tất cả classId đã được chọn
      const selectedClassIds = [...new Set(
        permissionList
          .map(perm => perm.classId)
          .filter(id => id)
      )];
      
      console.log('🔄 useEffect (subjects) triggered - Selected class IDs:', selectedClassIds);
      
      if (selectedClassIds.length === 0) {
        console.log('⚠️ No class selected, clearing subjects');
        setSubjects([]);
        return;
      }
      
      // Load subjects cho tất cả class đã chọn
      try {
        const allSubjects = [];
        
        for (const classId of selectedClassIds) {
          console.log('📡 Loading subjects for class:', classId);
          const response = await fetch(`/admin-api/subjects/by-class/${classId}`, { 
            credentials: 'include' 
          });
          const data = await response.json();
          
          console.log('📥 Subjects response for class', classId, ':', data);
          
          if (data.success && data.data) {
            console.log('✅ Subjects received:', data.data.length);
            console.log('📋 Sample classSubject:', data.data[0]);
            
            const subjects = data.data.map(classSubject => {
              const subject = classSubject.subject;
              const subjectId = parseInt(subject.id || subject.subjectId);
              
              if (isNaN(subjectId)) {
                console.warn('⚠️ Invalid subject ID:', subject);
                return null;
              }
              
              // Format giống GradeEntryPageComponent
              return {
                id: subjectId,
                classId: parseInt(classId), // Lưu classId để filter (convert to int)
                subjectCode: subject.subjectCode,
                subjectName: subject.subjectName,
                credits: subject.credits,
                description: subject.description,
                category: subject.category,
                isRequired: subject.isRequired
              };
            }).filter(Boolean);
            
            console.log('✅ Valid subjects after processing:', subjects.length);
            allSubjects.push(...subjects);
          } else {
            console.warn('⚠️ No subjects found for class:', classId, 'or response failed');
          }
        }
        
        // Remove duplicates based on subjectId (một môn có thể có trong nhiều lớp)
        const uniqueSubjects = allSubjects.reduce((acc, subject) => {
          if (!acc.find(s => s.id === subject.id)) {
            acc.push(subject);
          }
          return acc;
        }, []);
        
        console.log('✅ Total unique subjects loaded:', uniqueSubjects.length);
        console.log('📋 Subjects array:', uniqueSubjects);
        setSubjects(uniqueSubjects);
      } catch (error) {
        console.error('❌ Error loading subjects:', error);
        sendNotice({ message: 'Không thể tải danh sách môn học: ' + error.message, type: 'error' });
      }
    };
    
    loadSubjectsForPermissions();
  }, [permissionList.map(p => p.classId).join(',')]); // Trigger khi classId thay đổi

  // Update permission trong list với cascade logic
  // Pattern theo GradeEntryPageComponent: tạo object mới hoàn toàn để React nhận biết thay đổi
  const updatePermission = (index, field, value) => {
    console.log(`🔄 updatePermission: index=${index}, field=${field}, value=${value}`);
    
    setPermissionList(prevList => {
      const newList = prevList.map((perm, i) => {
        if (i !== index) return perm;
        
        // Tạo object mới hoàn toàn (không mutate object cũ)
        let newPerm = { ...perm, [field]: value };
        
        // Cascade logic: reset các field phụ thuộc
        if (field === 'cohortId') {
          console.log(`  ↪️ Reset semesterId, classId, subjectId vì cohortId changed`);
          newPerm = { ...newPerm, semesterId: '', classId: '', subjectId: '' };
        } else if (field === 'classId') {
          console.log(`  ↪️ Reset subjectId vì classId changed`);
          newPerm = { ...newPerm, subjectId: '' };
        }
        
        console.log(`  ✅ New permission object:`, newPerm);
        return newPerm;
      });
      
      console.log(`📋 New permissionList:`, newList);
      return newList;
    });
  };

  // Lấy danh sách học kỳ theo khóa
  const getFilteredSemesters = (cohortId) => {
    if (!cohortId) return [];
    
    console.log('🔍 Filtering semesters for cohortId:', cohortId, 'Type:', typeof cohortId);
    console.log('📋 Total semesters:', semesters.length);
    
    if (semesters[0]) {
      console.log('📋 Sample semester structure:', JSON.stringify({
        id: semesters[0].id,
        params: semesters[0].params
      }, null, 2));
    }
    
    const cohortIdInt = parseInt(cohortId, 10);
    
    // Try multiple possible field names for cohortId
    const filtered = semesters.filter(sem => {
      const semCohortId = sem.params?.cohortId 
        || sem.params?.cohort_id 
        || sem.cohortId;
      
      const semCohortIdInt = parseInt(semCohortId, 10);
      const match = semCohortIdInt === cohortIdInt;
      
      if (match) {
        console.log('✅ Matched semester:', {
          name: sem.params?.name || sem.params?.semesterName,
          semCohortId,
          cohortIdInt
        });
      }
      
      return match;
    });
    
    console.log('✅ Filtered semesters count:', filtered.length);
    return filtered;
  };

  // Lấy danh sách lớp học theo khóa (từ state classes đã được load)
  const getFilteredClasses = (cohortId) => {
    if (!cohortId) return [];
    
    console.log('🔍 Filtering classes for cohortId:', cohortId);
    console.log('📋 All classes:', classes);
    
    const filtered = classes.filter(cls => cls.cohortId === parseInt(cohortId));
    
    console.log('✅ Filtered classes:', filtered.length);
    return filtered;
  };

  // Lấy danh sách môn học theo lớp (từ state subjects đã được load)
  const getFilteredSubjects = (classId) => {
    if (!classId) return [];
    
    console.log('🔍 Filtering subjects for classId:', classId);
    console.log('📋 All subjects:', subjects);
    console.log('📋 Sample subject structure:', subjects[0]);
    
    const filtered = subjects.filter(subj => subj.classId === parseInt(classId));
    
    console.log('✅ Filtered subjects:', filtered.length);
    return filtered;
  };

  // Helper function để parse integer hoặc trả về null
  const parseIntOrNull = (value) => {
    if (!value || value === '') return null;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  };

  // Lưu tất cả permissions
  const savePermissions = async () => {
    if (!selectedUser) {
      sendNotice({ message: 'Vui lòng chọn giảng viên', type: 'error' });
      return;
    }

    // Validate
    for (let i = 0; i < permissionList.length; i++) {
      const perm = permissionList[i];
      if (!perm.cohortId) {
        sendNotice({ message: `Permission ${i + 1}: Khóa học là bắt buộc`, type: 'error' });
        return;
      }
      if (!perm.semesterId) {
        sendNotice({ message: `Permission ${i + 1}: Học kỳ là bắt buộc`, type: 'error' });
        return;
      }
      if (!perm.validFrom || !perm.validTo) {
        sendNotice({ message: `Permission ${i + 1}: Ngày bắt đầu và kết thúc là bắt buộc`, type: 'error' });
        return;
      }
    }

    try {
      setLoading(true);

      // Tạo từng permission qua custom API endpoint
      for (const perm of permissionList) {
        // Convert tất cả IDs sang integer để tránh lỗi MySQL type mismatch
        const permissionData = {
          userId: parseInt(selectedUser, 10),
          semesterId: parseInt(perm.semesterId, 10),
          classId: parseIntOrNull(perm.classId),
          subjectId: parseIntOrNull(perm.subjectId),
          cohortId: parseIntOrNull(perm.cohortId),
          validFrom: perm.validFrom,
          validTo: perm.validTo,
          status: 'active',
          notes: perm.notes || ''
        };

        // Debug: Log data và types
        console.log('📤 Sending permission data:', permissionData);
        console.log('📊 Data types:', {
          userId: typeof permissionData.userId,
          semesterId: typeof permissionData.semesterId,
          classId: typeof permissionData.classId,
          subjectId: typeof permissionData.subjectId,
          cohortId: typeof permissionData.cohortId
        });

        // Validate required IDs are valid numbers
        if (isNaN(permissionData.userId)) {
          throw new Error('User ID không hợp lệ');
        }
        if (isNaN(permissionData.semesterId)) {
          throw new Error('Semester ID không hợp lệ');
        }

        const response = await fetch('/admin-api/teacher-permissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(permissionData)
        });

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.message || 'Failed to save permission');
        }
      }

      sendNotice({ message: 'Đã lưu quyền thành công!', type: 'success' });
      
      // Reset form
      setPermissionList([{
        semesterId: '',
        classId: '',
        subjectId: '',
        cohortId: '',
        validFrom: '',
        validTo: '',
        notes: ''
      }]);
      
      // Reload permissions
      loadUserPermissions(selectedUser);
      
      setLoading(false);
    } catch (error) {
      console.error('Error saving permissions:', error);
      sendNotice({ message: 'Lỗi khi lưu quyền: ' + error.message, type: 'error' });
      setLoading(false);
    }
  };

  // Xóa permission đã tồn tại
  const deleteExistingPermission = async (permissionId) => {
    if (!confirm('Bạn có chắc muốn xóa quyền này?')) return;

    try {
      await api.resourceAction({
        resourceId: 'teacher_permissions',
        actionName: 'delete',
        recordId: permissionId
      });

      sendNotice({ message: 'Đã xóa quyền', type: 'success' });
      loadUserPermissions(selectedUser);
    } catch (error) {
      console.error('Error deleting permission:', error);
      sendNotice({ message: 'Lỗi khi xóa quyền', type: 'error' });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Loader />
      </Box>
    );
  }

  return (
    <Box p="xxl">
      <Box mb="xxl">
        <Text fontSize="h2" fontWeight="bold" mb="md">
          🔐 Quản lý quyền nhập điểm cho giảng viên
        </Text>
        <Text color="grey60" mb="lg">
          Gán quyền nhập điểm cho giảng viên theo lớp, môn, học kỳ với thời gian có hiệu lực
        </Text>
      </Box>

      {/* Chọn giảng viên */}
      <Box bg="white" border="default" borderRadius="default" p="xl" mb="lg">
        <Label htmlFor="user-select" required>
          👤 Chọn giảng viên
        </Label>
        <select
          id="user-select"
          value={selectedUser}
          onChange={(e) => {
            setSelectedUser(e.target.value);
            loadUserPermissions(e.target.value);
          }}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            marginTop: '8px'
          }}
        >
          <option value="">-- Chọn giảng viên --</option>
          {users.map(user => (
            <option key={user.id} value={user.params.id}>
              {user.params.email} ({user.params.username})
            </option>
          ))}
        </select>
      </Box>

      {/* Quyền hiện tại */}
      {selectedUser && permissions.length > 0 && (
        <Box bg="white" border="default" borderRadius="default" p="xl" mb="lg">
          <Text fontSize="h4" fontWeight="bold" mb="md">
            📋 Quyền hiện tại ({permissions.length})
          </Text>
          
          <Box as="table" width="100%" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Khóa</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Học kỳ</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Lớp</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Môn</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Thời hạn</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Trạng thái</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map(perm => {
                // Helper function để tìm tên từ ID
                const getCohortName = (cohortId) => {
                  if (!cohortId) return <em>Tất cả</em>;
                  const cohort = cohorts.find(c => c.cohortId === cohortId);
                  return cohort ? cohort.name : `Khóa #${cohortId}`;
                };
                
                const getSemesterName = (semesterId) => {
                  if (!semesterId) return <em>Tất cả</em>;
                  const semester = semesters.find(s => {
                    const sid = s.params?.semesterId || s.params?.semester_id || s.semesterId;
                    return sid === semesterId;
                  });
                  return semester ? (semester.params?.name || semester.params?.semesterName || semester.name) : `Học kỳ #${semesterId}`;
                };
                
                const getClassName = (classId) => {
                  if (!classId) return <em>Tất cả</em>;
                  const cls = classes.find(c => c.id === classId);
                  return cls ? cls.className : `Lớp #${classId}`;
                };
                
                const getSubjectName = (subjectId) => {
                  if (!subjectId) return <em>Tất cả</em>;
                  const subject = subjects.find(s => s.id === subjectId);
                  return subject ? subject.subjectName : `Môn #${subjectId}`;
                };
                
                return (
                  <tr key={perm.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{getCohortName(perm.params.cohortId)}</td>
                    <td style={{ padding: '12px' }}>{getSemesterName(perm.params.semesterId)}</td>
                    <td style={{ padding: '12px' }}>{getClassName(perm.params.classId)}</td>
                    <td style={{ padding: '12px' }}>{getSubjectName(perm.params.subjectId)}</td>
                    <td style={{ padding: '12px' }}>
                      {perm.params.validFrom} → {perm.params.validTo}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        background: perm.params.status === 'active' ? '#d4edda' : '#f8d7da',
                        color: perm.params.status === 'active' ? '#155724' : '#721c24'
                      }}>
                        {perm.params.status === 'active' ? '✅ Active' : '❌ ' + perm.params.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => deleteExistingPermission(perm.id)}
                      >
                        Xóa
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Box>
        </Box>
      )}

      {/* Form thêm quyền mới */}
      {selectedUser && (
        <Box bg="white" border="default" borderRadius="default" p="xl">
          <Text fontSize="h4" fontWeight="bold" mb="md">
            ➕ Thêm quyền mới
          </Text>

          {permissionList.map((perm, index) => (
            <Box
              key={index}
              border="default"
              borderRadius="default"
              p="lg"
              mb="md"
              bg={index % 2 === 0 ? 'grey10' : 'white'}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb="md">
                <Text fontWeight="bold">Permission #{index + 1}</Text>
                {permissionList.length > 1 && (
                  <Button size="sm" variant="danger" onClick={() => removePermission(index)}>
                    Xóa
                  </Button>
                )}
              </Box>

              <Box display="grid" gridTemplateColumns="1fr 1fr" gridGap="md">
                {/* Khóa */}
                <Box>
                  <Label required>🎓 Khóa</Label>
                  <select
                    value={perm.cohortId}
                    onChange={(e) => updatePermission(index, 'cohortId', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '14px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      marginTop: '4px'
                    }}
                  >
                    <option value="">-- Chọn khóa học --</option>
                    {cohorts.map(cohort => (
                      <option key={cohort.cohortId} value={cohort.cohortId}>
                        {cohort.name} ({cohort.startYear} - {cohort.endYear})
                      </option>
                    ))}
                  </select>
                </Box>

                {/* Học kỳ */}
                <Box>
                  <Label required>📅 Học kỳ</Label>
                  <select
                    value={perm.semesterId}
                    onChange={(e) => updatePermission(index, 'semesterId', e.target.value)}
                    disabled={!perm.cohortId}
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '14px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      marginTop: '4px',
                      backgroundColor: !perm.cohortId ? '#f5f5f5' : 'white',
                      cursor: !perm.cohortId ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <option value="">
                      {!perm.cohortId ? '-- Vui lòng chọn khóa trước --' : '-- Chọn học kỳ --'}
                    </option>
                    {getFilteredSemesters(perm.cohortId).map(sem => {
                      // Try multiple field names for semesterId (AdminJS may use different fields)
                      const semesterId = sem.params?.semesterId 
                        || sem.params?.semester_id 
                        || sem.semesterId 
                        || sem.id;
                      
                      // Try multiple field names for semester name
                      const semesterName = sem.params?.name 
                        || sem.params?.semesterName 
                        || sem.name;
                      
                      console.log('🔍 Rendering semester option:', { semesterId, semesterName, rawSem: sem });
                      
                      return (
                        <option key={sem.id || semesterId} value={semesterId}>
                          {semesterName}
                        </option>
                      );
                    })}
                  </select>
                </Box>

                {/* Lớp */}
                <Box>
                  <Label>🏫 Lớp (để trống = tất cả lớp trong khóa)</Label>
                  <select
                    value={perm.classId}
                    onChange={(e) => updatePermission(index, 'classId', e.target.value)}
                    disabled={!perm.cohortId}
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '14px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      marginTop: '4px',
                      backgroundColor: !perm.cohortId ? '#f5f5f5' : 'white',
                      cursor: !perm.cohortId ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <option value="">
                      {!perm.cohortId ? '-- Vui lòng chọn khóa trước --' : '-- Tất cả các lớp --'}
                    </option>
                    {getFilteredClasses(perm.cohortId).map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.className} ({cls.classCode})
                      </option>
                    ))}
                  </select>
                </Box>

                {/* Môn học */}
                <Box>
                  <Label>📚 Môn học (để trống = tất cả môn trong lớp)</Label>
                  <select
                    value={perm.subjectId}
                    onChange={(e) => updatePermission(index, 'subjectId', e.target.value)}
                    disabled={!perm.classId}
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '14px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      marginTop: '4px',
                      backgroundColor: !perm.classId ? '#f5f5f5' : 'white',
                      cursor: !perm.classId ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <option value="">
                      {!perm.classId ? '-- Vui lòng chọn lớp trước --' : '-- Tất cả các môn --'}
                    </option>
                    {getFilteredSubjects(perm.classId).map(subj => (
                      <option key={subj.id} value={subj.id}>
                        {subj.subjectName} ({subj.subjectCode})
                      </option>
                    ))}
                  </select>
                </Box>

                {/* Ngày bắt đầu */}
                <Box>
                  <Label required>📆 Ngày bắt đầu</Label>
                  <input
                    type="date"
                    value={perm.validFrom}
                    onChange={(e) => updatePermission(index, 'validFrom', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '14px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      marginTop: '4px'
                    }}
                  />
                </Box>

                {/* Ngày kết thúc */}
                <Box>
                  <Label required>📆 Ngày kết thúc</Label>
                  <input
                    type="date"
                    value={perm.validTo}
                    onChange={(e) => updatePermission(index, 'validTo', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '14px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      marginTop: '4px'
                    }}
                  />
                </Box>
              </Box>

              {/* Ghi chú */}
              <Box mt="md">
                <Label>📝 Ghi chú</Label>
                <textarea
                  value={perm.notes}
                  onChange={(e) => updatePermission(index, 'notes', e.target.value)}
                  placeholder="Ghi chú thêm về quyền này..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginTop: '4px',
                    fontFamily: 'inherit'
                  }}
                />
              </Box>
            </Box>
          ))}

          {/* Buttons */}
          <Box display="flex" justifyContent="space-between" mt="lg">
            <Button onClick={addPermission} variant="light">
              ➕ Thêm permission
            </Button>
            <Button onClick={savePermissions} variant="primary">
              💾 Lưu tất cả quyền
            </Button>
          </Box>
        </Box>
      )}

      {/* Hướng dẫn */}
      {!selectedUser && (
        <MessageBox 
          message="💡 Vui lòng chọn giảng viên để bắt đầu gán quyền" 
          variant="info" 
        />
      )}

      {selectedUser && (
        <Box mt="md">
          <MessageBox 
            message="ℹ️ Chọn Khóa → Lớp được load từ API → Chọn Lớp → Môn học được load từ API" 
            variant="info" 
          />
        </Box>
      )}
    </Box>
  );
};

export default TeacherPermissionManagement;
