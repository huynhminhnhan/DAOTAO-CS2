import React, { useState, useEffect } from 'react';
import { ApiClient } from 'adminjs';
import { 
  calculateTBKT, 
  getFormulaStrings,
  GRADE_COEFFICIENTS,
  GRADE_WEIGHTS 
} from '../utils/gradeCalculation';

/**
 * Teacher Grade Entry Component - Simplified for Teachers
 * Giáo viên CHỈ được nhập điểm TX và ĐK, KHÔNG được nhập điểm thi cuối kỳ
 * Admin mới có quyền nhập điểm thi cuối kỳ
 */
const TeacherGradeEntry = () => {
  const [cohorts, setCohorts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCohort, setSelectedCohort] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSubjectInfo, setSelectedSubjectInfo] = useState(null);
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  
  // State Management
  const [gradeStatuses, setGradeStatuses] = useState({}); // {studentId: {status, lockStatus, ...}}
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, DRAFT, PENDING_REVIEW, APPROVED_TX_DK
  
  // Dynamic grade configuration
  const [gradeConfig, setGradeConfig] = useState({
    txColumns: 1,
    dkColumns: 1,
    maxTxColumns: 10,
    maxDkColumns: 10
  });

  const api = new ApiClient();
  
  // Helper function để chuẩn hóa format số
  const normalizeNumber = (value) => {
    if (value === '' || value === null || value === undefined) {
      return '';
    }
    const num = Number(value);
    return isNaN(num) ? '' : num.toString();
  };
  
  // Helper functions for grade status
  const getStatusColor = (status) => {
    const colors = {
      'DRAFT': '#6c757d',
      'PENDING_REVIEW': '#ffc107',
      'APPROVED_TX_DK': '#17a2b8',
      'FINAL_ENTERED': '#007bff',
      'FINALIZED': '#28a745'
    };
    return colors[status] || '#6c757d';
  };
  
  const getStatusText = (status) => {
    const texts = {
      'DRAFT': 'Bản nháp',
      'PENDING_REVIEW': 'Chờ duyệt',
      'APPROVED_TX_DK': 'Đã duyệt TX/ĐK',
      'FINAL_ENTERED': 'Đã nhập điểm thi',
      'FINALIZED': 'Hoàn tất'
    };
    return texts[status] || status;
  };
  
  const canEditGrade = (studentId) => {
    const gradeStatus = gradeStatuses[studentId];
    if (!gradeStatus) return true; // New grade, can edit
    
    // Teacher can only edit in DRAFT status
    return gradeStatus.gradeStatus === 'DRAFT';
  };
  
  const isFieldLocked = (studentId, fieldName) => {
    const gradeStatus = gradeStatuses[studentId];
    if (!gradeStatus || !gradeStatus.lockStatus) return false;
    
    if (fieldName === 'txScore') return gradeStatus.lockStatus.txLocked === true;
    if (fieldName === 'dkScore') return gradeStatus.lockStatus.dkLocked === true;
    return false;
  };
  
  // Add handlers for dynamic columns
  const addTxColumn = () => {
    if (gradeConfig.txColumns < gradeConfig.maxTxColumns) {
      setGradeConfig(prev => ({
        ...prev,
        txColumns: prev.txColumns + 1
      }));
    }
  };

  const removeTxColumn = () => {
    if (gradeConfig.txColumns > 1) {
      setGradeConfig(prev => ({
        ...prev,
        txColumns: prev.txColumns - 1
      }));
      // Remove the last TX column data for all students
      setGrades(prevGrades => {
        const newGrades = { ...prevGrades };
        Object.keys(newGrades).forEach(studentId => {
          if (newGrades[studentId].txScore) {
            delete newGrades[studentId].txScore[`tx${gradeConfig.txColumns}`];
          }
        });
        return newGrades;
      });
    }
  };

  const addDkColumn = () => {
    if (gradeConfig.dkColumns < gradeConfig.maxDkColumns) {
      setGradeConfig(prev => ({
        ...prev,
        dkColumns: prev.dkColumns + 1
      }));
    }
  };

  const removeDkColumn = () => {
    if (gradeConfig.dkColumns > 1) {
      setGradeConfig(prev => ({
        ...prev,
        dkColumns: prev.dkColumns - 1
      }));
      // Remove the last DK column data for all students
      setGrades(prevGrades => {
        const newGrades = { ...prevGrades };
        Object.keys(newGrades).forEach(studentId => {
          if (newGrades[studentId].dkScore) {
            delete newGrades[studentId].dkScore[`dk${gradeConfig.dkColumns}`];
          }
        });
        return newGrades;
      });
    }
  };
  
  // Load current user info
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await fetch('/admin-api/auth/current-user', { 
          credentials: 'include' 
        });
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
          console.log('✅ Current user loaded:', data.user);
        }
      } catch (error) {
        console.error('Error loading current user:', error);
      }
    };
    loadCurrentUser();
  }, []);

  // Load danh sách khóa học mà giáo viên được phân công
  useEffect(() => {
    const loadTeacherCohorts = async () => {
      try {
        console.log('Loading teacher cohorts...');
        const response = await fetch('/admin-api/teacher-permissions/my-cohorts', { 
          credentials: 'include' 
        });
        const data = await response.json();
        
        if (data.success) {
          console.log('✅ Teacher cohorts loaded:', data.data.length);
          setCohorts(data.data);
        } else {
          console.error('❌ Failed to load cohorts:', data.message);
          setError('Không thể tải danh sách khóa học được phân công: ' + data.message);
        }
      } catch (error) {
        console.error('Error loading teacher cohorts:', error);
        setError('Không thể tải danh sách khóa học: ' + error.message);
      }
    };
    loadTeacherCohorts();
  }, []);

  // Load danh sách lớp theo khóa học được chọn
  useEffect(() => {
    if (selectedCohort) {
      const loadClassesByCohort = async () => {
        try {
          console.log('Loading teacher classes for cohort:', selectedCohort);
          const response = await fetch(`/admin-api/teacher-permissions/my-classes/${selectedCohort}`, { 
            credentials: 'include' 
          });
          const data = await response.json();
          
          if (data.success) {
            console.log('✅ Teacher classes loaded:', data.data.length);
            setClasses(data.data);
          } else {
            console.error('❌ Failed to load classes:', data.message);
            setError('Không thể tải danh sách lớp: ' + data.message);
          }
        } catch (error) {
          console.error('Error loading teacher classes:', error);
          setError('Không thể tải danh sách lớp: ' + error.message);
        }
      };
      loadClassesByCohort();
    } else {
      setClasses([]);
    }
  }, [selectedCohort]);

  // Load danh sách môn học theo class đã chọn
  useEffect(() => {
    const loadSubjectsByClass = async () => {
      if (!selectedClass) {
        setSubjects([]);
        return;
      }
      
      try {
        console.log('Loading subjects for class:', selectedClass);
        const response = await fetch(`/admin-api/subjects/by-class/${selectedClass}`, { 
          credentials: 'include' 
        });
        const data = await response.json();
        
        if (data.success && data.data) {
          const subjects = data.data.map(classSubject => {
            const subject = classSubject.subject;
            const subjectId = parseInt(subject.id || subject.subjectId);
            
            if (isNaN(subjectId)) {
              console.warn('⚠️ Invalid subject ID:', subject);
              return null;
            }
            
            return {
              id: subjectId,
              params: {
                subjectId: subjectId,
                subjectCode: subject.subjectCode,
                subjectName: subject.subjectName,
                credits: subject.credits,
                description: subject.description,
                category: subject.category,
                isRequired: subject.isRequired
              }
            };
          }).filter(Boolean);
          
          console.log('✅ Subjects loaded:', subjects.length);
          setSubjects(subjects);
        } else {
          console.log('ℹ️ No subjects found for class:', selectedClass);
          setSubjects([]);
        }
      } catch (error) {
        console.error('Error loading subjects:', error);
        setError('Không thể tải danh sách môn học: ' + error.message);
      }
    };

    loadSubjectsByClass();
  }, [selectedClass]);

  // Load danh sách sinh viên đã đăng ký khi chọn đủ thông tin
  useEffect(() => {
    if (selectedCohort && selectedClass && selectedSubject) {
      const loadEnrolledStudents = async () => {
        setLoading(true);
        try {
          console.log('🔍 Loading enrolled students:', {
            cohort: selectedCohort,
            class: selectedClass,
            subject: selectedSubject
          });

          const parsedCohortId = parseInt(selectedCohort);
          const parsedClassId = parseInt(selectedClass);
          const parsedSubjectId = parseInt(selectedSubject);

          if (isNaN(parsedCohortId) || isNaN(parsedClassId) || isNaN(parsedSubjectId)) {
            throw new Error('Invalid cohort, class or subject ID');
          }

          // Get class info
          const classInfo = classes.find(c => c.id === parsedClassId);
          if (!classInfo) {
            throw new Error('Class information not found');
          }

          const params = new URLSearchParams({
            cohortId: parsedCohortId,
            classId: parsedClassId,
            subjectId: parsedSubjectId,
            semester: classInfo.semester || 'HK1',
            academicYear: classInfo.academicYear || '2024-25'
          });

          const response = await fetch(`/admin-api/grade/enrolled-students?${params}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();

          if (data.success) {
            console.log('✅ Loaded enrolled students:', data.summary);
            
            const formattedStudents = data.data.map(student => ({
              id: student.studentId,
              enrollmentId: student.enrollmentId,
              params: {
                studentId: student.studentId,
                studentCode: student.studentCode,
                fullName: student.studentName,
                email: student.email,
                phone: student.phone,
                attempt: student.attempt,
                enrollmentStatus: student.enrollmentStatus,
                hasExistingGrade: student.hasExistingGrade,
                gradeId: student.gradeId,
                txScore: student.txScore || {},
                dkScore: student.dkScore || {},
                finalScore: student.finalScore || '',
                tbktScore: student.tbktScore || null,
                tbmhScore: student.tbmhScore || null,
                attemptNumber: student.attempt || 1,
                letterGrade: student.letterGrade || '',
                isPassed: student.isPassed,
                notes: student.notes || '',
                lastUpdated: student.lastUpdated,
                // State management fields
                gradeStatus: student.gradeStatus || 'DRAFT',
                lockStatus: student.lockStatus || { txLocked: false, dkLocked: false, finalLocked: false },
                submittedForReviewAt: student.submittedForReviewAt,
                approvedAt: student.approvedAt
              }
            }));

            setStudents(formattedStudents);
            
            // Load grade statuses
            const statuses = {};
            formattedStudents.forEach(student => {
              if (student.params.gradeId) {
                statuses[student.id] = {
                  gradeId: student.params.gradeId,
                  gradeStatus: student.params.gradeStatus,
                  lockStatus: student.params.lockStatus,
                  submittedForReviewAt: student.params.submittedForReviewAt,
                  approvedAt: student.params.approvedAt
                };
              }
            });
            setGradeStatuses(statuses);
          } else {
            console.error('❌ API returned success=false:', data.message);
            setError('Lỗi từ server: ' + (data.message || 'Không thể tải danh sách sinh viên'));
          }
        } catch (error) {
          console.error('❌ Error loading enrolled students:', error);
          setError('Không thể tải danh sách sinh viên: ' + error.message);
        }
        setLoading(false);
      };
      
      loadEnrolledStudents();
    } else {
      setStudents([]);
    }
  }, [selectedCohort, selectedClass, selectedSubject]);

  const handleCohortChange = (e) => {
    const cohortId = e.target.value;
    console.log('🔍 Cohort selected:', { cohortId, type: typeof cohortId });
    
    if (cohortId && isNaN(parseInt(cohortId))) {
      console.error('❌ Invalid cohort ID:', cohortId);
      setError('ID khóa học không hợp lệ');
      return;
    }
    
    setSelectedCohort(cohortId);
    setSelectedClass('');
    setSelectedSubject('');
    setSelectedSubjectInfo(null);
    setStudents([]);
    setGrades({});
    setError('');
  };

  const handleClassChange = (e) => {
    const classId = e.target.value;
    console.log('🔍 Class selected:', { classId, type: typeof classId });
    
    if (classId && isNaN(parseInt(classId))) {
      console.error('❌ Invalid class ID:', classId);
      setError('ID lớp học không hợp lệ');
      return;
    }
    
    setSelectedClass(classId);
    setSelectedSubject('');
    setSelectedSubjectInfo(null);
    setGrades({});
    setError('');
  };

  const handleSubjectChange = (e) => {
    const subjectId = e.target.value;
    console.log('🔍 Subject selected:', { subjectId, type: typeof subjectId });
    
    setSelectedSubject(subjectId);
    setError('');
    
    if (subjectId) {
      const parsedSubjectId = parseInt(subjectId);
      if (isNaN(parsedSubjectId)) {
        console.error('❌ Invalid subject ID:', subjectId);
        setError('ID môn học không hợp lệ');
        setSelectedSubjectInfo(null);
        setGrades({});
        return;
      }
      
      const subject = subjects.find(s => s?.id === parsedSubjectId);
      console.log('🔍 Found subject:', subject);
      setSelectedSubjectInfo(subject);
      
      if (!subject) {
        console.warn('⚠️ Subject not found:', parsedSubjectId);
      }
    } else {
      setSelectedSubjectInfo(null);
      setGrades({});
    }
  };

  // Initialize grades khi có đủ students và subject
  useEffect(() => {
    if (selectedSubject && students.length > 0) {
      const initialGrades = {};
      let maxTxColumns = 1;
      let maxDkColumns = 1;
      
      students.forEach(student => {
        const studentParams = student.params || {};
        
        // Parse existing JSON grades
        const existingTxScore = studentParams.txScore || {};
        const existingDkScore = studentParams.dkScore || {};
        
        // Normalize number format
        const normalizedTxScore = {};
        Object.keys(existingTxScore).forEach(key => {
          normalizedTxScore[key] = normalizeNumber(existingTxScore[key]);
        });
        
        const normalizedDkScore = {};
        Object.keys(existingDkScore).forEach(key => {
          normalizedDkScore[key] = normalizeNumber(existingDkScore[key]);
        });
        
        // Auto-detect max columns from existing data
        const txCount = Object.keys(normalizedTxScore).length;
        const dkCount = Object.keys(normalizedDkScore).length;
        
        if (txCount > maxTxColumns) maxTxColumns = txCount;
        if (dkCount > maxDkColumns) maxDkColumns = dkCount;
        
        initialGrades[student.id] = {
          enrollmentId: student.enrollmentId,
          txScore: normalizedTxScore,
          dkScore: normalizedDkScore,
          tbktScore: normalizeNumber(studentParams.tbktScore),
          ghiChu: studentParams.notes || '',
          gradeId: studentParams.gradeId || null
        };
      });
      
      setGradeConfig(prev => ({
        ...prev,
        txColumns: maxTxColumns || 1,
        dkColumns: maxDkColumns || 1
      }));
      
      setGrades(initialGrades);
    } else if (!selectedSubject) {
      setGrades({});
      setGradeConfig(prev => ({
        ...prev,
        txColumns: 1,
        dkColumns: 1
      }));
    }
  }, [selectedSubject, students, selectedSubjectInfo]);

  const handleGradeChange = (studentId, field, value, scoreKey = null) => {
    setGrades(prevGrades => {
      const newGrades = { ...prevGrades };
      
      if (field === 'txScore') {
        if (!newGrades[studentId].txScore) newGrades[studentId].txScore = {};
        newGrades[studentId].txScore[scoreKey] = value;
      } else if (field === 'dkScore') {
        if (!newGrades[studentId].dkScore) newGrades[studentId].dkScore = {};
        newGrades[studentId].dkScore[scoreKey] = value;
      } else {
        newGrades[studentId][field] = value;
      }
      
      // Auto calculate TBKT when TX and DK scores are available
      const studentGrades = newGrades[studentId];
      const txScore = studentGrades.txScore || {};
      const dkScore = studentGrades.dkScore || {};
      
      // Check if we have at least one TX and one DK score
      const hasTxData = Object.values(txScore).some(val => val !== '' && val !== null);
      const hasDkData = Object.values(dkScore).some(val => val !== '' && val !== null);
      
      if (hasTxData && hasDkData) {
        newGrades[studentId].tbktScore = calculateTBKT(txScore, dkScore);
      }
      
      return newGrades;
    });
  };

  const submitForReview = async (studentIds) => {
    try {
      setSubmitting(true);
      setError('');
      
      console.log('📤 Submitting grades for review:', { studentIds, gradeStatuses });
      
      // Get grade IDs for students
      const gradeIds = studentIds
        .map(sid => {
          const gradeId = gradeStatuses[sid]?.gradeId;
          if (!gradeId) {
            console.warn(`⚠️ Student ${sid} không có gradeId trong gradeStatuses`);
          }
          return gradeId;
        })
        .filter(gid => gid);
      
      console.log('📤 Grade IDs to submit:', gradeIds);
      
      if (gradeIds.length === 0) {
        throw new Error('Không có điểm nào để nộp duyệt.\n\n⚠️ Lưu ý: Các điểm phải được LƯU vào hệ thống trước khi có thể nộp duyệt.\n\nVui lòng:\n1. Click "💾 Lưu điểm" trước\n2. Sau đó mới click "📤 Nộp điểm để duyệt"');
      }
      
      const response = await fetch('/admin-api/grade/state/bulk-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          gradeIds: gradeIds,
          reason: 'Giáo viên nộp điểm TX và ĐK để admin duyệt'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Lỗi không xác định từ server');
      }
      
      console.log('✅ Submit result:', result);
      
      const successCount = result.data?.successCount || 0;
      const failedCount = result.data?.failedCount || 0;
      
      if (successCount > 0) {
        // Update gradeStatuses to PENDING_REVIEW for successfully submitted grades
        const newStatuses = { ...gradeStatuses };
        if (result.data?.results) {
          result.data.results.forEach(item => {
            if (item.success && item.gradeId) {
              // Find student ID by gradeId
              const studentId = Object.keys(newStatuses).find(
                sid => newStatuses[sid].gradeId === item.gradeId
              );
              if (studentId) {
                newStatuses[studentId] = {
                  ...newStatuses[studentId],
                  gradeStatus: 'PENDING_REVIEW',
                  submittedForReviewAt: new Date().toISOString()
                };
              }
            }
          });
        }
        setGradeStatuses(newStatuses);
        
        const message = failedCount > 0 
          ? `✅ Đã nộp ${successCount}/${gradeIds.length} điểm để duyệt!\n\n⚠️ ${failedCount} điểm không thể nộp (có thể đã được nộp trước đó).`
          : `✅ Đã nộp ${successCount}/${gradeIds.length} điểm để duyệt thành công!\n\nAdmin sẽ kiểm tra và duyệt điểm của bạn.`;
        
        alert(message);
      } else {
        alert(`⚠️ Không có điểm nào được nộp duyệt.\n\nLý do: ${failedCount} điểm không đáp ứng điều kiện (có thể đã được nộp hoặc đã duyệt).`);
      }
      
    } catch (error) {
      console.error('❌ Error submitting grades for review:', error);
      setError('Không thể nộp điểm: ' + error.message);
      alert('❌ Lỗi: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const saveGrades = async () => {
    try {
      setLoading(true);
      setError('');
     
      // Validate required selections
      if (!selectedClass || !selectedSubject) {
        throw new Error('Vui lòng chọn đầy đủ lớp và môn học');
      }

      // Validate that we have grades to save
      const studentsWithGrades = Object.entries(grades).filter(([studentId, gradeInfo]) => {
        const txScore = gradeInfo.txScore || {};
        const dkScore = gradeInfo.dkScore || {};
        
        return Object.values(txScore).some(val => val !== '' && val !== null) ||
               Object.values(dkScore).some(val => val !== '' && val !== null);
      });

      if (studentsWithGrades.length === 0) {
        throw new Error('Vui lòng nhập ít nhất một điểm trước khi lưu');
      }

      // Validate cohort selected
      if (!selectedCohort) {
        throw new Error('Vui lòng chọn khóa học');
      }

      // Get class info
      const classInfo = classes.find(c => c.id === parseInt(selectedClass));
      if (!classInfo) {
        throw new Error('Class information not found');
      }

      // Prepare grade data for API
      const gradeData = studentsWithGrades.map(([studentId, gradeInfo]) => {
        if (!gradeInfo.enrollmentId) {
          console.warn(`⚠️ Missing enrollmentId for student ${studentId}`);
        }
        
        const txScoreJson = gradeInfo.txScore && Object.keys(gradeInfo.txScore).length > 0 ? gradeInfo.txScore : null;
        const dkScoreJson = gradeInfo.dkScore && Object.keys(gradeInfo.dkScore).length > 0 ? gradeInfo.dkScore : null;
        const tbktScore = gradeInfo.tbktScore ? parseFloat(gradeInfo.tbktScore) : null;
        
        return {
          studentId: parseInt(studentId),
          enrollmentId: gradeInfo.enrollmentId,
          cohortId: parseInt(selectedCohort),
          classId: parseInt(selectedClass), 
          subjectId: parseInt(selectedSubject),
          txScore: txScoreJson,
          dkScore: dkScoreJson,
          finalScore: null, // ⭐ Teacher KHÔNG được nhập điểm thi
          tbktScore: tbktScore,
          tbmhScore: null, // ⭐ Chỉ tính khi có điểm thi
          isRetake: false,
          notes: gradeInfo.ghiChu || '',
          semester: classInfo.semester || 'HK1',
          academicYear: classInfo.academicYear || '2024-25',
          hasExistingGrade: gradeInfo.hasExistingGrade || false,
          gradeId: gradeInfo.gradeId || null
        };
      });
      
      // Send to API endpoint
      const response = await fetch('/admin-api/grade/save-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          grades: gradeData,
          cohortId: selectedCohort,
          classId: selectedClass,
          subjectId: selectedSubject
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Lỗi không xác định từ server');
      }

      // Update gradeStatuses with new gradeIds from response
      console.log('📊 Save result:', result);
      
      if (result.results && result.results.details) {
        const newStatuses = { ...gradeStatuses };
        console.log('🔄 Processing details:', result.results.details);
        
        result.results.details.forEach(detail => {
          console.log('  - Detail:', detail);
          if (detail.gradeId && detail.studentId) {
            newStatuses[detail.studentId] = {
              gradeId: detail.gradeId,
              gradeStatus: 'DRAFT', // Newly saved grades are in DRAFT status
              lockStatus: { txLocked: false, dkLocked: false, finalLocked: false },
              submittedForReviewAt: null,
              approvedAt: null
            };
            console.log(`  ✅ Updated status for student ${detail.studentId} with gradeId ${detail.gradeId}`);
          } else {
            console.warn(`  ⚠️ Missing gradeId or studentId:`, detail);
          }
        });
        
        setGradeStatuses(newStatuses);
        console.log('✅ Updated gradeStatuses after save:', newStatuses);
      } else {
        console.warn('⚠️ No results.details in response:', result);
      }

      // Success feedback
      const successMessage = `✅ Đã lưu thành công ${studentsWithGrades.length} bản ghi điểm!`;
      alert(successMessage);
      setError('');
      
    } catch (error) {
      console.error('❌ Error saving grades:', error);
      setError('Không thể lưu điểm: ' + error.message);
      alert('❌ Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ 
        backgroundColor: '#fff3cd', 
        border: '1px solid #ffc107',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px'
      }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#856404', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>👨‍🏫</span>
          <span>Nhập Điểm Thường Xuyên & Điều Kiện</span>
        </h1>
        <div style={{ fontSize: '14px', color: '#856404' }}>
          <strong>⚠️ Lưu ý quan trọng:</strong>
          <ul style={{ margin: '5px 0 0 20px', paddingLeft: '0' }}>
            <li>Giáo viên chỉ được nhập <strong>điểm Thường Xuyên (TX)</strong> và <strong>điểm Điều Kiện (ĐK)</strong></li>
            <li>Hệ thống sẽ tự động tính <strong>TBKT = TX × 40% + ĐK × 60%</strong></li>
            <li><strong>Điểm Thi Cuối Kỳ</strong> chỉ do <strong>Admin</strong> nhập sau khi thi</li>
          </ul>
        </div>
      </div>
      
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          color: '#721c24',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Form chọn khóa, lớp và môn học */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ marginBottom: '15px', color: '#495057' }}>Chọn khóa học, lớp và môn học</h3>
        
        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', flexWrap: 'wrap' }}>
          {/* Chọn khóa học */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              � Khóa học được phân công:
            </label>
            <select
              value={selectedCohort}
              onChange={handleCohortChange}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">-- Chọn khóa học --</option>
              {cohorts.map((cohort, index) => (
                <option key={cohort.cohortId || `cohort-${index}`} value={cohort.cohortId}>
                  {cohort.name} ({cohort.startYear}-{cohort.endYear})
                </option>
              ))}
            </select>
          </div>

          {/* Chọn lớp */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              🏫 Lớp học:
            </label>
            <select
              value={selectedClass}
              onChange={handleClassChange}
              disabled={!selectedCohort}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: !selectedCohort ? '#e9ecef' : 'white',
                cursor: !selectedCohort ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="">
                {!selectedCohort ? '-- Chọn khóa học trước --' : '-- Chọn lớp --'}
              </option>
              {classes.map((cls, index) => (
                <option key={cls.id || `class-${index}`} value={cls.id}>
                  {cls.className} ({cls.classCode})
                </option>
              ))}
            </select>
          </div>

          {/* Chọn môn học */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              📚 Môn học:
            </label>
            <select
              value={selectedSubject}
              onChange={handleSubjectChange}
              disabled={!selectedClass}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: !selectedClass ? '#e9ecef' : 'white',
                cursor: !selectedClass ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="">
                {!selectedClass ? '-- Chọn lớp trước --' : '-- Chọn môn học --'}
              </option>
              {subjects.map((subject, index) => (
                <option key={subject.id || `subject-${index}`} value={subject.id}>
                  {subject.params?.subjectName || subject.params?.subjectCode || `Môn ${subject.id}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Hiển thị thông tin đã chọn */}
        {(selectedCohort || selectedClass || selectedSubject) && (
          <div style={{
            padding: '10px',
            backgroundColor: '#d1ecf1',
            border: '1px solid #bee5eb',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            <strong>Đã chọn:</strong>{' '}
            {selectedCohort && (
              <>
                <span>🎓 Khóa: {cohorts.find(c => c?.cohortId?.toString() === selectedCohort)?.name || selectedCohort}</span>
                {(selectedClass || selectedSubject) && ' | '}
              </>
            )}
            {selectedClass && (
              <>
                <span>🏫 Lớp: {classes.find(c => c?.id?.toString() === selectedClass)?.className || selectedClass}</span>
                {selectedSubject && ' | '}
              </>
            )}
            {selectedSubject && (
              <span>📚 Môn: {subjects.find(s => s?.id?.toString() === selectedSubject)?.params?.subjectName || selectedSubject}</span>
            )}
            
            {selectedCohort && selectedClass && selectedSubject && (
              <div style={{ marginTop: '5px', fontSize: '12px', color: '#0c5460' }}>
                ✅ Đã chọn đủ thông tin. Danh sách sinh viên sẽ được tải bên dưới.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bảng nhập điểm - chỉ hiện khi đã chọn đủ 3 thông tin */}
      {selectedCohort && selectedClass && selectedSubject && (
        <div style={{
          backgroundColor: '#fff',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              ⏳ Đang tải dữ liệu...
            </div>
          )}

          {!loading && students.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              ℹ️ Không có sinh viên nào đăng ký môn học này
            </div>
          )}

          {!loading && students.length > 0 && (
            <>
              <div style={{ 
                marginBottom: '15px',
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#6c757d'
              }}>
                <span>📊 Tổng số sinh viên: {students.length}</span>
              </div>

              <h3 style={{ marginBottom: '15px', color: '#495057' }}>
                📝 Nhập điểm môn: {selectedSubjectInfo?.params?.subjectName || selectedSubject} 
                ({selectedSubjectInfo?.params?.credits || 2} tín chỉ)
              </h3>
          
              {/* Cấu hình cột điểm */}
              <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '5px' }}>
                <h5 style={{ margin: '0 0 10px 0', color: '#495057' }}>⚙️ Cấu hình cột điểm</h5>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Điểm TX:</label>
                    <button 
                      onClick={removeTxColumn}
                      disabled={gradeConfig.txColumns <= 1}
                      style={{ 
                        padding: '4px 8px', 
                        backgroundColor: gradeConfig.txColumns <= 1 ? '#ccc' : '#dc3545', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '3px',
                        cursor: gradeConfig.txColumns <= 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      -
                    </button>
                    <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                      {gradeConfig.txColumns}
                    </span>
                    <button 
                      onClick={addTxColumn}
                      disabled={gradeConfig.txColumns >= gradeConfig.maxTxColumns}
                      style={{ 
                        padding: '4px 8px', 
                        backgroundColor: gradeConfig.txColumns >= gradeConfig.maxTxColumns ? '#ccc' : '#28a745', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '3px',
                        cursor: gradeConfig.txColumns >= gradeConfig.maxTxColumns ? 'not-allowed' : 'pointer'
                      }}
                    >
                      +
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Điểm ĐK:</label>
                    <button 
                      onClick={removeDkColumn}
                      disabled={gradeConfig.dkColumns <= 1}
                      style={{ 
                        padding: '4px 8px', 
                        backgroundColor: gradeConfig.dkColumns <= 1 ? '#ccc' : '#dc3545', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '3px',
                        cursor: gradeConfig.dkColumns <= 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      -
                    </button>
                    <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                      {gradeConfig.dkColumns}
                    </span>
                    <button 
                      onClick={addDkColumn}
                      disabled={gradeConfig.dkColumns >= gradeConfig.maxDkColumns}
                      style={{ 
                        padding: '4px 8px', 
                        backgroundColor: gradeConfig.dkColumns >= gradeConfig.maxDkColumns ? '#ccc' : '#28a745', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '3px',
                        cursor: gradeConfig.dkColumns >= gradeConfig.maxDkColumns ? 'not-allowed' : 'pointer'
                      }}
                    >
                      +
                    </button>
                  </div>
                  
                  <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#6c757d' }}>
                    <div>📋 Công thức: <strong>TBKT = (TX × {GRADE_COEFFICIENTS.TX}) + (ĐK × {GRADE_COEFFICIENTS.DK})</strong></div>
                    <div style={{ marginTop: '3px' }}>
                      TX = {GRADE_WEIGHTS.TX * 100}%, ĐK = {GRADE_WEIGHTS.DK * 100}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Bảng điểm */}
              <div style={{ overflowX: 'auto', marginTop: '15px' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  fontSize: '13px',
                  backgroundColor: 'white'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#007bff', color: 'white' }}>
                      <th style={{ padding: '10px', border: '1px solid #dee2e6', minWidth: '50px' }}>STT</th>
                      <th style={{ padding: '10px', border: '1px solid #dee2e6', minWidth: '100px' }}>Mã SV</th>
                      <th style={{ padding: '10px', border: '1px solid #dee2e6', minWidth: '180px' }}>Họ và tên</th>
                      <th style={{ padding: '10px', border: '1px solid #dee2e6', minWidth: '120px' }}>Trạng thái</th>
                      
                      {/* TX Columns */}
                      {Array.from({ length: gradeConfig.txColumns }, (_, i) => (
                        <th key={`tx${i + 1}`} style={{ 
                          padding: '10px', 
                          border: '1px solid #dee2e6',
                          minWidth: '70px',
                          backgroundColor: '#007bff'
                        }}>
                          TX{i + 1}
                        </th>
                      ))}
                      
                      {/* DK Columns */}
                      {Array.from({ length: gradeConfig.dkColumns }, (_, i) => (
                        <th key={`dk${i + 1}`} style={{ 
                          padding: '10px', 
                          border: '1px solid #dee2e6',
                          minWidth: '70px',
                          backgroundColor: '#007bff'
                        }}>
                          ĐK{i + 1}
                        </th>
                      ))}
                      
                      <th style={{ 
                        padding: '10px', 
                        border: '1px solid #dee2e6',
                        minWidth: '80px',
                        backgroundColor: '#007bff'
                      }}>
                        TBKT
                      </th>
                      
                      <th style={{ padding: '10px', border: '1px solid #dee2e6', minWidth: '150px' }}>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => {
                      const studentGrades = grades[student.id] || {};
                      const txScore = studentGrades.txScore || {};
                      const dkScore = studentGrades.dkScore || {};
                      
                      const gradeStatus = gradeStatuses[student.id];
                      const status = gradeStatus?.gradeStatus || 'DRAFT';
                      const isEditable = canEditGrade(student.id);
                      const txLocked = isFieldLocked(student.id, 'txScore');
                      const dkLocked = isFieldLocked(student.id, 'dkScore');
                      
                      return (
                        <tr key={student.id} style={{ 
                          backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white'
                        }}>
                          <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                            {index + 1}
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>
                            {student.params?.studentCode}
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>
                            {student.params?.fullName}
                          </td>
                          
                          {/* Status Badge */}
                          <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              backgroundColor: getStatusColor(status),
                              color: 'white'
                            }}>
                              {getStatusText(status)}
                            </span>
                            {txLocked && <span style={{ marginLeft: '5px', fontSize: '12px' }} title="TX đã khóa">🔒</span>}
                            {dkLocked && <span style={{ marginLeft: '2px', fontSize: '12px' }} title="ĐK đã khóa">🔒</span>}
                          </td>
                          
                          {/* TX Inputs */}
                          {Array.from({ length: gradeConfig.txColumns }, (_, i) => {
                            const key = `tx${i + 1}`;
                            return (
                              <td key={key} style={{ padding: '4px', border: '1px solid #dee2e6' }}>
                                <input
                                  type="number"
                                  min="0"
                                  max="10"
                                  step="0.1"
                                  value={txScore[key] || ''}
                                  onChange={(e) => handleGradeChange(student.id, 'txScore', e.target.value, key)}
                                  disabled={!isEditable || txLocked}
                                  style={{
                                    padding: '6px',
                                    border: '1px solid #ced4da',
                                    borderRadius: '3px',
                                    fontSize: '13px',
                                    backgroundColor: (!isEditable || txLocked) ? '#e9ecef' : 'white',
                                    cursor: (!isEditable || txLocked) ? 'not-allowed' : 'text'
                                  }}
                                  placeholder="0-10"
                                />
                              </td>
                            );
                          })}
                          
                          {/* DK Inputs */}
                          {Array.from({ length: gradeConfig.dkColumns }, (_, i) => {
                            const key = `dk${i + 1}`;
                            return (
                              <td key={key} style={{ padding: '4px', border: '1px solid #dee2e6' }}>
                                <input
                                  type="number"
                                  min="0"
                                  max="10"
                                  step="0.1"
                                  value={dkScore[key] || ''}
                                  onChange={(e) => handleGradeChange(student.id, 'dkScore', e.target.value, key)}
                                  disabled={!isEditable || dkLocked}
                                  style={{
                                    padding: '6px',
                                    border: '1px solid #ced4da',
                                    borderRadius: '3px',
                                    fontSize: '13px',
                                    backgroundColor: (!isEditable || dkLocked) ? '#e9ecef' : 'white',
                                    cursor: (!isEditable || dkLocked) ? 'not-allowed' : 'text'
                                  }}
                                  placeholder="0-10"
                                />
                              </td>
                            );
                          })}
                          
                          {/* TBKT (Auto-calculated) */}
                          <td style={{ 
                            padding: '8px', 
                            border: '1px solid #dee2e6',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            // backgroundColor: '#e8f5e9'
                          }}>
                            {studentGrades.tbktScore || '-'}
                          </td>
                          
                          {/* Ghi chú */}
                          <td style={{ padding: '4px', border: '1px solid #dee2e6' }}>
                            <input
                              type="text"
                              value={studentGrades.ghiChu || ''}
                              onChange={(e) => handleGradeChange(student.id, 'ghiChu', e.target.value)}
                              style={{
                                padding: '6px',
                                border: '1px solid #ced4da',
                                borderRadius: '3px',
                                fontSize: '13px'
                              }}
                              placeholder="Nhập ghi chú..."
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: '20px', textAlign: 'center', display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={saveGrades}
                  disabled={loading}
                  style={{
                    padding: '12px 40px',
                    backgroundColor: loading ? '#6c757d' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  {loading ? '⏳ Đang lưu...' : '💾 Lưu điểm'}
                </button>
                
                <button
                  onClick={() => {
                    // Get all students with DRAFT status and gradeId
                    const draftStudents = students
                      .filter(student => {
                        const status = gradeStatuses[student.id];
                        // Must have gradeId (grade was saved) and status is DRAFT
                        return status && status.gradeId && (!status.gradeStatus || status.gradeStatus === 'DRAFT');
                      })
                      .map(s => s.id);
                    
                    if (draftStudents.length === 0) {
                      alert('Không có điểm nào ở trạng thái Bản nháp để nộp duyệt.\n\n⚠️ Lưu ý: Vui lòng LƯU ĐIỂM trước khi nộp duyệt!\n\nCác điểm mới nhập phải được lưu vào hệ thống trước khi có thể nộp duyệt.');
                      return;
                    }
                    
                    if (confirm(`Bạn có chắc muốn nộp ${draftStudents.length} điểm để admin duyệt?\n\nSau khi nộp, bạn sẽ không thể chỉnh sửa cho đến khi admin duyệt hoặc từ chối.`)) {
                      submitForReview(draftStudents);
                    }
                  }}
                  disabled={submitting || loading}
                  style={{
                    padding: '12px 40px',
                    backgroundColor: (submitting || loading) ? '#6c757d' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: (submitting || loading) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  {submitting ? '⏳ Đang nộp...' : '📤 Nộp điểm để duyệt'}
                </button>
              </div>
              
              {/* Status Info */}
              <div style={{
                marginTop: '15px',
                padding: '10px',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '5px',
                fontSize: '13px',
                textAlign: 'center'
              }}>
                <strong>ℹ️ Lưu ý:</strong> Bạn chỉ có thể chỉnh sửa điểm ở trạng thái <strong>Bản nháp</strong>. 
                Sau khi nộp duyệt, admin sẽ kiểm tra và duyệt điểm của bạn.
              </div>

              {/* Thông tin hướng dẫn */}
              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#e7f3ff',
                border: '1px solid #b3d9ff',
                borderRadius: '5px',
                fontSize: '13px'
              }}>
                <strong>📘 Hướng dẫn sử dụng:</strong>
                <ul style={{ margin: '5px 0 0 20px', paddingLeft: '0' }}>
                  <li>Nhập điểm TX (Thường Xuyên) và ĐK (Điều Kiện) cho từng sinh viên</li>
                  <li>Điểm hợp lệ: từ 0 đến 10 (có thể nhập số thập phân)</li>
                  <li>TBKT sẽ được tính tự động: <strong>TX × 40% + ĐK × 60%</strong></li>
                  <li>Sử dụng nút <strong>+</strong> / <strong>-</strong> để thêm/bớt cột điểm TX và ĐK</li>
                  <li>Nhấn <strong>💾 Lưu điểm</strong> để lưu thay đổi</li>
                  <li>Sau khi lưu, nhấn <strong>📤 Nộp điểm để duyệt</strong> để gửi cho admin kiểm tra</li>
                  <li>Trạng thái điểm:
                    <ul style={{ marginTop: '5px' }}>
                      <li><span style={{ 
                        padding: '2px 6px', 
                        borderRadius: '8px', 
                        backgroundColor: '#6c757d', 
                        color: 'white', 
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>Bản nháp</span> - Bạn có thể chỉnh sửa</li>
                      <li><span style={{ 
                        padding: '2px 6px', 
                        borderRadius: '8px', 
                        backgroundColor: '#ffc107', 
                        color: 'white', 
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>Chờ duyệt</span> - Admin đang kiểm tra</li>
                      <li><span style={{ 
                        padding: '2px 6px', 
                        borderRadius: '8px', 
                        backgroundColor: '#17a2b8', 
                        color: 'white', 
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>Đã duyệt TX/ĐK</span> - Điểm đã được duyệt, đã khóa 🔒</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherGradeEntry;
