/**
 * Teacher Permission Management Component
 * Custom UI cho việc gán quyền nhập điểm cho giảng viên
 */

import React, { useState, useEffect } from 'react';
import { Box, Button, Label, Text, Icon, Loader, MessageBox } from '@adminjs/design-system';
import { ApiClient, useNotice } from 'adminjs';

const TeacherPermissionManagement = () => {
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]); // Tất cả classes
  const [subjects, setSubjects] = useState([]); // Tất cả subjects
  const [cohorts, setCohorts] = useState([]);
  const [semesters, setSemesters] = useState([]); // Tất cả semesters
  const [enrollments, setEnrollments] = useState([]); // Tất cả enrollments
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

  // Load dữ liệu ban đầu
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

      // Load classes
      const classesResponse = await api.resourceAction({
        resourceId: 'classes',
        actionName: 'list',
        params: {}
      });
      setClasses(classesResponse.data.records || []);

      // Load subjects
      const subjectsResponse = await api.resourceAction({
        resourceId: 'subjects',
        actionName: 'list',
        params: {}
      });
      setSubjects(subjectsResponse.data.records || []);

      // Load cohorts
      const cohortsResponse = await api.resourceAction({
        resourceId: 'Cohorts',
        actionName: 'list',
        params: {}
      });
      setCohorts(cohortsResponse.data.records || []);

      // Load semesters
      const semestersResponse = await api.resourceAction({
        resourceId: 'Semesters',
        actionName: 'list',
        params: {}
      });
      setSemesters(semestersResponse.data.records || []);

      // Load enrollments để lấy danh sách môn học theo lớp
      const enrollmentsResponse = await api.resourceAction({
        resourceId: 'Enrollments',
        actionName: 'list',
        params: {}
      });
      setEnrollments(enrollmentsResponse.data.records || []);

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      sendNotice({ message: 'Lỗi khi tải dữ liệu', type: 'error' });
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

      setPermissions(response.data.records || []);
    } catch (error) {
      console.error('Error loading permissions:', error);
      sendNotice({ message: 'Lỗi khi tải quyền của user', type: 'error' });
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

  // Update permission trong list với cascade logic
  const updatePermission = (index, field, value) => {
    const newList = [...permissionList];
    newList[index][field] = value;

    // Cascade logic
    if (field === 'cohortId') {
      // Reset các field phụ thuộc khi đổi khóa
      newList[index].semesterId = '';
      newList[index].classId = '';
      newList[index].subjectId = '';
    } else if (field === 'classId') {
      // Reset môn học khi đổi lớp
      newList[index].subjectId = '';
    }

    setPermissionList(newList);
  };

  // Lấy danh sách học kỳ theo khóa
  const getFilteredSemesters = (cohortId) => {
    if (!cohortId) return semesters;
    return semesters.filter(sem => sem.params.cohort_id === cohortId);
  };

  // Lấy danh sách lớp học theo khóa
  const getFilteredClasses = (cohortId) => {
    if (!cohortId) return classes;
    return classes.filter(cls => cls.params.cohort_id === cohortId);
  };

  // Lấy danh sách môn học theo lớp (từ enrollments)
  const getFilteredSubjects = (classId) => {
    if (!classId) return subjects;
    
    // Lấy tất cả subjectId từ enrollments của lớp này
    const subjectIds = enrollments
      .filter(enr => enr.params.classId === parseInt(classId))
      .map(enr => enr.params.subjectId);
    
    // Loại bỏ duplicate
    const uniqueSubjectIds = [...new Set(subjectIds)];
    
    // Lọc subjects
    return subjects.filter(subj => uniqueSubjectIds.includes(subj.params.id));
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

      // Tạo từng permission
      for (const perm of permissionList) {
        await api.resourceAction({
          resourceId: 'teacher_permissions',
          actionName: 'new',
          params: {
            userId: selectedUser,
            semesterId: perm.semesterId,
            classId: perm.classId || null,
            subjectId: perm.subjectId || null,
            cohortId: perm.cohortId || null,
            validFrom: perm.validFrom,
            validTo: perm.validTo,
            status: 'active',
            notes: perm.notes
          }
        });
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
                <th style={{ padding: '12px', textAlign: 'left' }}>Học kỳ</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Lớp</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Môn</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Thời hạn</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Trạng thái</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map(perm => (
                <tr key={perm.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{perm.populated?.Semester?.semesterName || perm.params.semesterId}</td>
                  <td style={{ padding: '12px' }}>
                    {perm.params.classId ? (perm.populated?.Class?.className || perm.params.classId) : <em>Tất cả</em>}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {perm.params.subjectId ? (perm.populated?.Subject?.subjectName || perm.params.subjectId) : <em>Tất cả</em>}
                  </td>
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
              ))}
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
                  <Label>🎓 Khóa (để trống = tất cả)</Label>
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
                    <option value="">-- Tất cả các khóa --</option>
                    {cohorts.map(cohort => (
                      <option key={cohort.id} value={cohort.params.cohort_id}>
                        {cohort.params.name}
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
                    {getFilteredSemesters(perm.cohortId).map(sem => (
                      <option key={sem.id} value={sem.params.semester_id}>
                        {sem.params.semesterName}
                      </option>
                    ))}
                  </select>
                </Box>

                {/* Lớp */}
                <Box>
                  <Label>🏫 Lớp (để trống = tất cả)</Label>
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
                      <option key={cls.id} value={cls.params.id}>
                        {cls.params.className} ({cls.params.classCode})
                      </option>
                    ))}
                  </select>
                </Box>

                {/* Môn học */}
                <Box>
                  <Label>📚 Môn học (để trống = tất cả)</Label>
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
                      <option key={subj.id} value={subj.params.id}>
                        {subj.params.subjectName} ({subj.params.subjectCode})
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
            message="ℹ️ Cascade Loading: Chọn Khóa → Học kỳ/Lớp được lọc → Chọn Lớp → Môn học được lọc từ enrollments" 
            variant="info" 
          />
        </Box>
      )}
    </Box>
  );
};

export default TeacherPermissionManagement;
