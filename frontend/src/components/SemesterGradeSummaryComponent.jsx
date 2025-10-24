import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { API_ENDPOINTS } from '../config/api.config.js';

const SemesterGradeSummaryComponent = () => {
  // States
  const [cohorts, setCohorts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedCohort, setSelectedCohort] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSemesters, setSelectedSemesters] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch cohorts on mount
  useEffect(() => {
    fetchCohorts();
  }, []);

  // Fetch classes when cohort changes
  useEffect(() => {
    if (selectedCohort) {
      fetchClasses(selectedCohort);
      fetchSemesters(selectedCohort);
    } else {
      setClasses([]);
      setSemesters([]);
    }
  }, [selectedCohort]);

  const fetchCohorts = async () => {
    try {
      const response = await fetch('/admin-api/cohorts', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        const validCohorts = data.data.map(cohort => {
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
        console.error('❌ Failed to load cohorts:', data.message);
        setError('Không thể tải danh sách khóa học: ' + data.message);
      }
    } catch (err) {
      console.error('Error fetching cohorts:', err);
      setError('Lỗi khi tải danh sách khóa học: ' + err.message);
    }
  };

  const fetchClasses = async (cohortId) => {
    try {
      const endpoint = `/admin-api/classes/by-cohort/${cohortId}`;
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        const validClasses = data.data.map(cls => {
          const classId = parseInt(cls.id);
          if (isNaN(classId)) {
            console.warn('⚠️ Invalid class ID:', cls);
            return null;
          }
          return {
            classId: classId,
            className: cls.className,
            classCode: cls.classCode,
            academicYear: cls.academicYear,
            semester: cls.semester,
            cohortId: cls.cohortId
          };
        }).filter(Boolean);
        
        setClasses(validClasses);
      } else {
        console.error('❌ Failed to load classes:', data.message);
        setError('Không thể tải danh sách lớp: ' + data.message);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError('Lỗi khi tải danh sách lớp: ' + err.message);
    }
  };

  const fetchSemesters = async (cohortId) => {
    try {
      // Assuming there's an API to get semesters by cohort
      // If not, we'll need to create one
      const response = await fetch(`/admin-api/semesters/by-cohort/${cohortId}`, {
        credentials: 'include'
      });
      const data = await response.json();
      console.log('🔍 fetchSemesters response:', data);

      if (data && data.success) {
        // support both `data.semesters` or `data.data` shapes
        const sems = data.semesters || data.data || [];
        if (!Array.isArray(sems) || sems.length === 0) {
          console.warn('⚠️ No semesters returned for cohort', cohortId);
          setSemesters([]);
          setError('Không có học kỳ nào cho khóa này. Vui lòng kiểm tra dữ liệu khóa hoặc tạo học kỳ.');
        } else {
          setSemesters(sems);
          setError('');
        }
      } else {
        console.warn('⚠️ fetchSemesters failed:', data && data.message);
        setSemesters([]);
        setError('Không thể tải danh sách học kỳ: ' + (data && data.message ? data.message : 'Unknown error'));
      }
    } catch (err) {
      console.error('Error fetching semesters:', err);
      // Fallback: Create dummy semesters if API doesn't exist
      setSemesters([
        { semesterId: 1, name: 'HK1', order: 1 },
        { semesterId: 2, name: 'HK2', order: 2 },
        { semesterId: 3, name: 'HK3', order: 3 }
      ]);
      setError('Lỗi khi tải học kỳ: ' + err.message);
    }
  };

  const handleSemesterToggle = (semesterId) => {
    setSelectedSemesters(prev => {
      if (prev.includes(semesterId)) {
        return prev.filter(id => id !== semesterId);
      } else {
        return [...prev, semesterId].sort((a, b) => a - b);
      }
    });
  };

  const fetchSummaryData = async () => {
    if (!selectedCohort || !selectedClass || selectedSemesters.length === 0) {
      setError('Vui lòng chọn đầy đủ khóa, lớp và học kỳ');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        cohortId: selectedCohort,
        classId: selectedClass
      });
      
      selectedSemesters.forEach(id => params.append('semesterIds', id));

      const response = await fetch(`${API_ENDPOINTS.GRADE.SEMESTER_SUMMARY}?${params}`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setSummaryData(data.data);
      } else {
        setError(data.message || 'Không thể tải dữ liệu');
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
      setError('Lỗi khi tải dữ liệu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getClassificationColor = (classification) => {
    switch (classification) {
      case 'Xuất sắc': return '#28a745';
      case 'Giỏi': return '#17a2b8';
      case 'Khá': return '#ffc107';
      case 'Trung bình': return '#6c757d';
      case 'Yếu': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // Compute stable subjects list per semester to ensure header/body alignment
  const subjectsBySemester = React.useMemo(() => {
    if (!summaryData) return {};
    const map = {};
    const allSubjects = summaryData.subjects || [];
    (summaryData.semesters || []).forEach(sem => {
      // collect subjects that appear for any student in this semester
      const subjectIds = new Set();
      summaryData.studentsData.forEach(sd => {
        const grades = sd.gradesBySemester[sem.semesterId] || {};
        Object.keys(grades).forEach(subId => subjectIds.add(parseInt(subId)));
      });
      // preserve order according to allSubjects array
      map[sem.semesterId] = allSubjects.filter(s => subjectIds.has(s.id));
    });
    return map;
  }, [summaryData]);

  const exportToExcel = () => {
    if (!summaryData) return;

    const { semesters, studentsData } = summaryData;
    const allSubjects = summaryData.subjects || [];

    // Prepare data for Excel
    const excelData = studentsData.map((studentData, index) => {
      const row = {
        'TT': index + 1,
        'Họ và tên': studentData.student.fullName,
        'GT': studentData.student.gender === 'Male' ? 'Nam' : 'Nữ',
        'Ngày sinh': studentData.student.dateOfBirth ? new Date(studentData.student.dateOfBirth).toLocaleDateString('vi-VN') : ''
      };

      // Add semester columns using stable subjectsBySemester ordering
      semesters.forEach(sem => {
        const gradesBySem = studentData.gradesBySemester[sem.semesterId] || {};
        const subjectsInSemester = subjectsBySemester[sem.semesterId] || [];
        if (subjectsInSemester.length === 0) {
          const colName = `${sem.name}_-`;
          row[colName] = '';
        } else {
          subjectsInSemester.forEach(subject => {
            const grade = gradesBySem[subject.id];
            const colName = `${sem.name}_${subject.subjectCode}`;
            row[colName] = grade ? grade.tbmhScore : '';
          });
        }
      });

      // Add ĐTBC and classification
      row['ĐTBC'] = studentData.overallDtbc || '';
      row['Xếp loại'] = studentData.classification;

      // Add retake info
      const retakeList = [];
      Object.entries(studentData.retakeInfo).forEach(([subjectId, retakes]) => {
        const subject = allSubjects.find(s => s.id === parseInt(subjectId));
        if (subject && retakes.length > 0) {
          retakes.forEach(retake => {
            retakeList.push(`${subject.subjectCode} (${retake.semester} ${retake.academicYear}): ${retake.tbmhScore || 'N/A'}`);
          });
        }
      });
      row['Các môn thi lại'] = retakeList.join('; ');

      return row;
    });

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bảng điểm tổng kết');

    // Auto-size columns
    const colWidths = Object.keys(excelData[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    ws['!cols'] = colWidths;

    // Export
    const className = classes.find(c => c.classId === parseInt(selectedClass))?.className || 'Class';
    XLSX.writeFile(wb, `Bang_Diem_Tong_Ket_${className}.xlsx`);
  };

  const renderRetakeInfo = (retakeInfo, subjects) => {
    if (!retakeInfo || Object.keys(retakeInfo).length === 0) {
      return <span style={{ color: '#999' }}>-</span>;
    }

    const retakeList = [];
    Object.entries(retakeInfo).forEach(([subjectId, retakes]) => {
      const subject = subjects.find(s => s.id === parseInt(subjectId));
      if (subject && retakes.length > 0) {
        retakes.forEach(retake => {
          retakeList.push(
            <div key={`${subjectId}-${retake.attemptNumber}`} style={{ marginBottom: '4px' }}>
              <strong>{subject.subjectCode}</strong>:{' '}
              {retake.retakeType === 'RETAKE_EXAM' ? 'Thi lại' : 'Học lại'}{' '}
              <span style={{ color: '#666' }}>
                ({retake.semester} {retake.academicYear})
              </span>{' '}
              - Điểm: <strong>{retake.tbmhScore || 'N/A'}</strong>
              {retake.completedAt && (
                <span style={{ fontSize: '11px', color: '#999' }}>
                  {' '}[{new Date(retake.completedAt).toLocaleDateString('vi-VN')}]
                </span>
              )}
            </div>
          );
        });
      }
    });

    return retakeList.length > 0 ? retakeList : <span style={{ color: '#999' }}>-</span>;
  };

  const hasRetake = (studentData, subjectId, semesterId) => {
    const retakes = studentData.retakeInfo[subjectId];
    return retakes && retakes.length > 0;
  };

  return (
    <div style={{ padding: '20px', maxWidth: '100%', overflowX: 'auto' }}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>
        📊 Bảng Điểm Tổng Kết Theo Học Kỳ
      </h1>

      {/* Filters */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          {/* Cohort Select */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              🎓 Khóa:
            </label>
            <select
              value={selectedCohort}
              onChange={(e) => {
                setSelectedCohort(e.target.value);
                setSelectedClass('');
                setSelectedSemesters([]);
                setSummaryData(null);
              }}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ced4da'
              }}
            >
              <option value="">-- Chọn khóa --</option>
              {cohorts.map(cohort => (
                <option key={cohort.cohortId} value={cohort.cohortId}>
                  {cohort.name}
                </option>
              ))}
            </select>
          </div>

          {/* Class Select */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              👥 Lớp:
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSummaryData(null);
              }}
              disabled={!selectedCohort}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                backgroundColor: !selectedCohort ? '#e9ecef' : 'white'
              }}
            >
              <option value="">-- Chọn lớp --</option>
              {classes.map(cls => (
                <option key={cls.classId} value={cls.classId}>
                  {cls.className}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Semester Checkboxes or friendly message */}
        {selectedCohort && (
          <div style={{ marginTop: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              📚 Chọn học kỳ:
            </label>
            {semesters.length === 0 ? (
              <div style={{ padding: '12px', backgroundColor: '#fff3cd', borderRadius: '6px', border: '1px solid #ffeeba', color: '#856404' }}>
                ⚠️ Không tìm thấy học kỳ cho khóa này hoặc dữ liệu học kỳ đang bị thiếu. Vui lòng kiểm tra <strong>Quản trị → Học kỳ</strong> hoặc liên hệ quản trị viên.
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                {semesters.map(sem => (
                  <label
                    key={sem.semesterId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      padding: '8px 12px',
                      backgroundColor: selectedSemesters.includes(sem.semesterId) ? '#e7f3ff' : 'white',
                      border: `2px solid ${selectedSemesters.includes(sem.semesterId) ? '#007bff' : '#dee2e6'}`,
                      borderRadius: '6px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSemesters.includes(sem.semesterId)}
                      onChange={() => handleSemesterToggle(sem.semesterId)}
                      style={{ marginRight: '8px' }}
                    />
                    <span>{sem.name}</span>
                    {sem.academicYear && (
                      <span style={{ marginLeft: '5px', fontSize: '12px', color: '#666' }}>
                        ({sem.academicYear})
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchSummaryData}
            disabled={!selectedCohort || !selectedClass || selectedSemesters.length === 0 || loading}
            style={{
              padding: '10px 20px',
              backgroundColor: loading ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {loading ? '⏳ Đang tải...' : '📊 Xem bảng điểm'}
          </button>

          {summaryData && (
            <button
              onClick={exportToExcel}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              📥 Xuất Excel
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          color: '#721c24',
          marginBottom: '20px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Summary Table */}
      {summaryData && (
        <div style={{ overflowX: 'auto', marginTop: '20px' }}>
          <h3 style={{ marginBottom: '15px' }}>
            Lớp: {summaryData.classInfo.className}
          </h3>
          
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
            minWidth: '1200px'
          }}>
            <thead>
              {/* Header Row 1: Semester Names */}
              <tr style={{ backgroundColor: '#007bff', color: 'white' }}>
                <th rowSpan="2" style={headerStyle}>TT</th>
                <th rowSpan="2" style={headerStyle}>Họ và tên</th>
                <th rowSpan="2" style={headerStyle}>GT</th>
                <th rowSpan="2" style={headerStyle}>Ngày sinh</th>
                
                {summaryData.semesters.map(sem => {
                  const subjectsInSemester = subjectsBySemester[sem.semesterId] || [];
                  return (
                    <th 
                      key={sem.semesterId} 
                      colSpan={subjectsInSemester.length || 1}
                      style={{...headerStyle, backgroundColor: '#0056b3'}}
                    >
                      {sem.name}
                    </th>
                  );
                })}
                
                <th rowSpan="2" style={headerStyle}>ĐTBC</th>
                <th rowSpan="2" style={headerStyle}>Xếp loại</th>
                <th rowSpan="2" style={{...headerStyle, minWidth: '200px'}}>Các môn thi lại</th>
              </tr>

              {/* Header Row 2: Subject Codes & Credits */}
              <tr style={{ backgroundColor: '#0056b3', color: 'white' }}>
                {summaryData.semesters.map(sem => {
                  const subjectsInSemester = subjectsBySemester[sem.semesterId] || [];
                  return (subjectsInSemester.length > 0 ? subjectsInSemester.map(subject => (
                    <th 
                      key={`${sem.semesterId}-${subject.id}`}
                      style={headerStyle}
                      title={`${subject.subjectName} (${subject.credits} tín chỉ)`}
                    >
                      <div>{subject.subjectCode}</div>
                      <div style={{ fontSize: '10px', fontWeight: 'normal' }}>
                        ({subject.credits} TC)
                      </div>
                    </th>
                  )) : (
                    <th key={`${sem.semesterId}-empty`} style={headerStyle}>-</th>
                  ));
                })}
              </tr>
            </thead>

            <tbody>
              {summaryData.studentsData.map((studentData, index) => (
                <tr 
                  key={studentData.student.id}
                  style={{ 
                    backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa'
                  }}
                >
                  <td style={cellStyle}>{index + 1}</td>
                  <td style={{...cellStyle, textAlign: 'left', fontWeight: 'bold'}}>
                    {studentData.student.fullName}
                  </td>
                  <td style={cellStyle}>
                    {studentData.student.gender === 'Male' ? 'Nam' : 'Nữ'}
                  </td>
                  <td style={cellStyle}>
                    {studentData.student.dateOfBirth 
                      ? new Date(studentData.student.dateOfBirth).toLocaleDateString('vi-VN')
                      : '-'
                    }
                  </td>

                  {/* Grade cells */}
                  {summaryData.semesters.map(sem => {
                    const subjectsInSemester = subjectsBySemester[sem.semesterId] || [];
                    if (subjectsInSemester.length === 0) {
                      return (
                        <td key={`${sem.semesterId}-empty`} style={cellStyle}>-</td>
                      );
                    }

                    return subjectsInSemester.map(subject => {
                      const grade = studentData.gradesBySemester[sem.semesterId]?.[subject.id];
                      const hasRetakeForSubject = hasRetake(studentData, subject.id, sem.semesterId);
                      
                      return (
                        <td 
                          key={`${sem.semesterId}-${subject.id}`}
                          style={{
                            ...cellStyle,
                            backgroundColor: hasRetakeForSubject ? '#fff3cd' : 'inherit',
                            fontWeight: hasRetakeForSubject ? 'bold' : 'normal',
                            color: grade?.tbmhScore && grade.tbmhScore < 5 ? '#dc3545' : 'inherit'
                          }}
                        >
                          {grade ? grade.tbmhScore : '-'}
                        </td>
                      );
                    });
                  })}

                  {/* ĐTBC */}
                  <td style={{
                    ...cellStyle,
                    fontWeight: 'bold',
                    fontSize: '14px',
                    backgroundColor: '#e7f3ff'
                  }}>
                    {studentData.overallDtbc || '-'}
                  </td>

                  {/* Classification */}
                  <td style={{
                    ...cellStyle,
                    fontWeight: 'bold',
                    color: getClassificationColor(studentData.classification)
                  }}>
                    {studentData.classification}
                  </td>

                  {/* Retake Info */}
                  <td style={{...cellStyle, textAlign: 'left', fontSize: '11px'}}>
                    {renderRetakeInfo(studentData.retakeInfo, summaryData.subjects)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Styles
const headerStyle = {
  padding: '12px 8px',
  border: '1px solid #dee2e6',
  textAlign: 'center',
  fontWeight: 'bold',
  fontSize: '12px'
};

const cellStyle = {
  padding: '8px',
  border: '1px solid #dee2e6',
  textAlign: 'center',
  fontSize: '13px'
};

export default SemesterGradeSummaryComponent;
