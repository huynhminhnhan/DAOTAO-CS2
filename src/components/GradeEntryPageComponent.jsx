import React, { useState, useEffect } from 'react';
import { ApiClient } from 'adminjs';
import { 
  calculateTBKT, 
  calculateTBMH, 
  getGradeClassification, 
  getFormulaStrings,
  GRADE_COEFFICIENTS,
  GRADE_WEIGHTS 
} from '../utils/gradeCalculation';
import RetakeManagementComponent from './RetakeManagementComponent.jsx';

/**
 * Grade Entry Page Component (Simplified without retake features)
 * Trang nhập điểm với tính năng chọn lớp và môn học
 * Dynamic columns with JSON format support
 */
const GradeEntryPage = () => {
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
  const [debugInfo, setDebugInfo] = useState('');
  
  // State để quản lý các sinh viên được unlock (Hybrid Approach)
  const [unlockedStudents, setUnlockedStudents] = useState(new Set());
  
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
  
  // Load danh sách khóa học
  useEffect(() => {
    const loadCohorts = async () => {
      try {
        console.log('Loading cohorts...');
        const endpoint = (window && window.location && window.location.pathname && window.location.pathname.startsWith('/admin')) ? '/admin-api/cohorts' : '/api/cohorts';
        const response = await fetch(endpoint, { credentials: 'include' });
        const data = await response.json();
        
        if (data.success) {
          console.log('✅ Cohorts loaded:', data.data.length);
          console.log('🔍 Cohorts data sample:', data.data.slice(0, 2));
          
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
      } catch (error) {
        console.error('Error loading cohorts:', error);
        setError('Không thể tải danh sách khóa học: ' + error.message);
      }
    };
    loadCohorts();
  }, []);

  // Load danh sách lớp theo khóa học
  useEffect(() => {
    if (selectedCohort) {
      const loadClassesByCohort = async () => {
        try {
          console.log('Loading classes for cohort:', selectedCohort);
          const endpoint = `/admin-api/classes/by-cohort/${selectedCohort}`;
          const response = await fetch(endpoint, { credentials: 'include' });
          const data = await response.json();
          
          if (data.success) {
            console.log('✅ Classes loaded:', data.data.length);
            console.log('🔍 Classes data sample:', data.data.slice(0, 2));
            
            const validClasses = data.data.map(cls => {
              const classId = parseInt(cls.id);
              if (isNaN(classId)) {
                console.warn('⚠️ Invalid class ID:', cls);
                return null;
              }
              return {
                id: classId,
                params: {
                  classId: classId,
                  className: cls.className,
                  classCode: cls.classCode,
                  academicYear: cls.academicYear,
                  semester: cls.semester,
                  cohortId: cls.cohortId,
                  isRetakeClass: cls.isRetakeClass || false
                }
              };
            }).filter(Boolean);
            
            setClasses(validClasses);
            
           
          
            const retakeClasses = validClasses.filter(cls => cls.params.isRetakeClass);
            
          } else {
            console.error('❌ Failed to load classes:', data.message);
            setError('Không thể tải danh sách lớp: ' + data.message);
          }
        } catch (error) {
          console.error('Error loading classes:', error);
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
        setSubjects([]); // Clear subjects when no class selected
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
              console.warn('⚠️ Invalid subject ID in class subjects:', subject);
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
          
          console.log('✅ Subjects loaded for class:', subjects.length);
          console.log('🔍 Subjects by class sample:', subjects.slice(0, 2));
          setSubjects(subjects);
        } else {
          console.log('ℹ️ No subjects found for class:', selectedClass);
          setSubjects([]);
        }
      } catch (error) {
        console.error('Error loading subjects by class:', error);
        // Fallback to load all subjects
        loadAllSubjects();
      }
    };

    loadSubjectsByClass();
  }, [selectedClass]);

  // Fallback function to load all subjects
  const loadAllSubjects = async () => {
    try {
      console.log('Loading all subjects...');
      let response;
      try {
        response = await api.getRecordInResource('subjects', 'list');
      } catch (e) {
        // Fallback to direct API call if AdminJS client fails
        const res = await fetch('/api/subjects', { credentials: 'include' });
        const data = await res.json();
        response = { data: { records: data.subjects || [] } };
      }

      if (response && response.data && response.data.records && response.data.records.length) {
        const subjects = response.data.records.map(record => {
          // Ensure ID is a valid number
          const subjectId = record.id || record.subjectId;
          const parsedId = parseInt(subjectId);
          
          if (isNaN(parsedId)) {
            console.warn('⚠️ Invalid subject ID found:', record);
            return null; // Skip invalid records
          }
          
          return {
            id: parsedId,
            params: record.params || {
              subjectId: parsedId,
              subjectCode: record.subjectCode,
              subjectName: record.subjectName,
              credits: record.credits,
              description: record.description,
              category: record.category,
              isRequired: record.isRequired
            }
          };
        }).filter(Boolean); // Remove null entries
        
        console.log('✅ All subjects loaded as fallback:', subjects.length);
        console.log('🔍 All subjects data sample:', subjects.slice(0, 2));
        setSubjects(subjects);
      } else {
        // Direct database query fallback
        const directResponse = await fetch('/api/subjects', { credentials: 'include' });
        const directData = await directResponse.json();
        
        if (directData.success && directData.subjects) {
          const subjects = directData.subjects.map(subject => {
            const subjectId = parseInt(subject.subjectId);
            if (isNaN(subjectId)) {
              console.warn('⚠️ Invalid subject ID in direct API:', subject);
              return null;
            }
            return {
              id: subjectId,
              params: subject
            };
          }).filter(Boolean);
          
          console.log('✅ All subjects loaded from direct API:', subjects.length);
          console.log('🔍 All subjects data sample:', subjects.slice(0, 2));
          setSubjects(subjects);
        } else {
          console.error('❌ No subjects found');
          setError('Không tìm thấy môn học nào');
        }
      }
    } catch (error) {
      console.error('Error loading all subjects:', error);
      setError('Không thể tải danh sách môn học: ' + error.message);
    }
  };

  // Load danh sách sinh viên đã đăng ký khi chọn đủ thông tin
  useEffect(() => {
    if (selectedCohort && selectedClass && selectedSubject) {
      const loadEnrolledStudents = async () => {
        setLoading(true);
        try {
          console.log('🔍 Loading enrolled students:', {
            cohort: selectedCohort,
            class: selectedClass,
            subject: selectedSubject,
            subjectType: typeof selectedSubject,
            selectedSubjectInfo: selectedSubjectInfo
          });

          // Validate parameters before making API call
          if (!selectedCohort || !selectedClass || !selectedSubject) {
            console.error('❌ Missing parameters:', {
              cohortId: selectedCohort,
              classId: selectedClass,
              subjectId: selectedSubject
            });
            throw new Error('Missing required parameters: cohort, class, or subject');
          }

          // Parse to numbers and validate
          const parsedCohortId = parseInt(selectedCohort);
          const parsedClassId = parseInt(selectedClass);
          const parsedSubjectId = parseInt(selectedSubject);

          // Check for NaN values after parsing
          if (isNaN(parsedCohortId) || isNaN(parsedClassId) || isNaN(parsedSubjectId)) {
            console.error('❌ Invalid ID values (NaN after parsing):', {
              cohortId: { original: selectedCohort, parsed: parsedCohortId, type: typeof selectedCohort },
              classId: { original: selectedClass, parsed: parsedClassId, type: typeof selectedClass },
              subjectId: { original: selectedSubject, parsed: parsedSubjectId, type: typeof selectedSubject }
            });
            throw new Error('Invalid parameter values: one or more IDs cannot be converted to valid numbers');
          }

          const params = new URLSearchParams({
            cohortId: parsedCohortId,
            classId: parsedClassId,
            subjectId: parsedSubjectId,
            semester: 'HK1',
            academicYear: '2024-25'
          });

          const response = await fetch(`/api/grade/enrolled-students?${params}`, {
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
                hasRetake: student.hasRetake || false, // Flag từ GradeRetakes
                letterGrade: student.letterGrade || '',
                isPassed: student.isPassed,
                notes: student.notes || '',
                lastUpdated: student.lastUpdated
              }
            }));

            setStudents(formattedStudents);
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
      // Reset students khi chưa chọn đủ thông tin
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
      // Convert to number and validate
      const parsedSubjectId = parseInt(subjectId);
      if (isNaN(parsedSubjectId)) {
        console.error('❌ Invalid subject ID selected:', subjectId);
        setError('ID môn học không hợp lệ');
        setSelectedSubjectInfo(null);
        setGrades({});
        return;
      }
      
      const subject = subjects.find(s => s?.id === parsedSubjectId);
      console.log('🔍 Found subject:', subject);
      setSelectedSubjectInfo(subject);
      
      if (!subject) {
        console.warn('⚠️ Subject not found in subjects list:', parsedSubjectId);
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
        
        // Parse existing JSON grades và chuẩn hóa format
        const existingTxScore = studentParams.txScore || {};
        const existingDkScore = studentParams.dkScore || {};
        
        // Chuẩn hóa format số trong TX scores
        const normalizedTxScore = {};
        Object.keys(existingTxScore).forEach(key => {
          normalizedTxScore[key] = normalizeNumber(existingTxScore[key]);
        });
        
        // Chuẩn hóa format số trong DK scores  
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
          enrollmentId: student.enrollmentId,  // ⭐ QUAN TRỌNG
          txScore: normalizedTxScore, // JSON object from database - đã chuẩn hóa
          dkScore: normalizedDkScore, // JSON object from database - đã chuẩn hóa
          finalScore: normalizeNumber(studentParams.finalScore), // Chuẩn hóa format số
          tbktScore: normalizeNumber(studentParams.tbktScore), // Chuẩn hóa format số
          tbmhScore: normalizeNumber(studentParams.tbmhScore), // Chuẩn hóa format số
          attemptNumber: studentParams.attemptNumber || 1,
          hasRetake: studentParams.hasRetake || false, // Flag từ GradeRetakes để highlight
          ghiChu: studentParams.notes || '', // Map notes từ DB sang ghiChu trong state
          gradeId: studentParams.gradeId || null
        };
      });
      
      // ⚠️ FIX: Set trực tiếp giá trị phát hiện được từ dữ liệu môn học hiện tại
      // KHÔNG dùng Math.max với prev để tránh giữ lại cấu hình của môn học trước
      setGradeConfig(prev => ({
        ...prev,
        txColumns: maxTxColumns || 1,
        dkColumns: maxDkColumns || 1
      }));
      
      setGrades(initialGrades);
  
    } else if (!selectedSubject) {
      setGrades({});
      // Reset gradeConfig về mặc định khi không có môn học được chọn
      setGradeConfig(prev => ({
        ...prev,
        txColumns: 1,
        dkColumns: 1
      }));
    }
  }, [selectedSubject, students, selectedSubjectInfo]);

  // Hàm xử lý unlock sinh viên
  const handleUnlock = (studentId, studentName) => {
    const confirmMessage = `⚠️ CẢNH BÁO: MỞ KHÓA CHỈNH SỬa\n\n` +
      `Sinh viên: ${studentName}\n\n` +
      `- Sửa điểm trực tiếp sẽ KHÔNG lưu lịch sử học lại/thi lại\n` +
      `- Khuyến nghị: Dùng nút "Thi lại/Học lại" để có lịch sử\n\n` +
      `Bạn có chắc muốn tiếp tục?`;
    
    if (window.confirm(confirmMessage)) {
      setUnlockedStudents(prev => {
        const newSet = new Set(prev);
        newSet.add(studentId);
        return newSet;
      });
      
      // Hiển thị thông báo
      alert(`✅ Đã mở khóa chỉnh sửa cho sinh viên: ${studentName}\n\nLưu ý: Thay đổi sẽ KHÔNG lưu lịch sử!`);
    }
  };
  
  // Hàm xử lý lock lại
  const handleLock = (studentId) => {
    setUnlockedStudents(prev => {
      const newSet = new Set(prev);
      newSet.delete(studentId);
      return newSet;
    });
  };

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
      
      // Kiểm tra TBKT < 5 để reset finalScore và tbmhScore
      const tbktScore = studentGrades.tbktScore;
      const isTbktFailed = tbktScore !== '' && tbktScore !== null && tbktScore !== undefined && Number(tbktScore) < 5;
      
      if (isTbktFailed) {
        newGrades[studentId].finalScore = '';
        newGrades[studentId].tbmhScore = '';
      } else {
        // Auto calculate TBMH when TBKT and finalScore are available
        const finalScore = studentGrades.finalScore;
        if (tbktScore && finalScore) {
          newGrades[studentId].tbmhScore = calculateTBMH(tbktScore, finalScore);
        }
      }
      
      return newGrades;
    });
  };

  const saveGrades = async () => {
    try {
      setLoading(true);
      setError('');
     
      // Validate required selections
      if (!selectedCohort || !selectedClass || !selectedSubject) {
        throw new Error('Vui lòng chọn đầy đủ khóa học, lớp và môn học');
      }

      // Validate that we have grades to save - updated for JSON format
      const studentsWithGrades = Object.entries(grades).filter(([studentId, gradeInfo]) => {
        const txScore = gradeInfo.txScore || {};
        const dkScore = gradeInfo.dkScore || {};
        const finalScore = gradeInfo.finalScore;
        
        return Object.values(txScore).some(val => val !== '' && val !== null) ||
               Object.values(dkScore).some(val => val !== '' && val !== null) ||
               (finalScore !== '' && finalScore !== null);
      });

      if (studentsWithGrades.length === 0) {
        throw new Error('Vui lòng nhập ít nhất một điểm trước khi lưu');
      }

      // Prepare grade data for API với JSON format cho txScore/dkScore
      const gradeData = studentsWithGrades.map(([studentId, gradeInfo]) => {
        if (!gradeInfo.enrollmentId) {
          console.warn(`⚠️ Missing enrollmentId for student ${studentId}`);
        }
        
        // txScore is already in JSON format from our dynamic inputs
        const txScoreJson = gradeInfo.txScore && Object.keys(gradeInfo.txScore).length > 0 ? gradeInfo.txScore : null;
        
        // dkScore is already in JSON format from our dynamic inputs  
        const dkScoreJson = gradeInfo.dkScore && Object.keys(gradeInfo.dkScore).length > 0 ? gradeInfo.dkScore : null;
        
        // Kiểm tra TBKT < 5 để bắt buộc lưu điểm thi và TBMH thành null
        const tbktScore = gradeInfo.tbktScore ? parseFloat(gradeInfo.tbktScore) : null;
        const isTbktFailed = tbktScore !== null && tbktScore < 5;
        
        return {
          studentId: parseInt(studentId),
          enrollmentId: gradeInfo.enrollmentId,
          cohortId: parseInt(selectedCohort),
          classId: parseInt(selectedClass), 
          subjectId: parseInt(selectedSubject),
          txScore: txScoreJson,
          dkScore: dkScoreJson,
          finalScore: isTbktFailed ? null : (gradeInfo.finalScore ? parseFloat(gradeInfo.finalScore) : null),
          tbktScore: tbktScore,
          tbmhScore: isTbktFailed ? null : (gradeInfo.tbmhScore ? parseFloat(gradeInfo.tbmhScore) : null),
          isRetake: gradeInfo.thiLai || false,
          notes: gradeInfo.ghiChu || '',
          semester: 'HK1',
          academicYear: '2024-25',
          hasExistingGrade: gradeInfo.hasExistingGrade || false,
          gradeId: gradeInfo.gradeId || null
        };
      });
      
      // Send to API endpoint
      const response = await fetch('/api/grade/save-bulk', {
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

      // Success feedback
      const successMessage = `✅ Đã lưu thành công ${studentsWithGrades.length} bản ghi điểm!`;
      alert(successMessage);
      setError('');
      
    } catch (error) {
      console.error('❌ Error saving grades:', error);
      setError('Không thể lưu điểm: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px'}}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>📊 Trang Nhập Điểm</h1>
      
      {/* Form chọn lớp và môn học */}
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
              🎓 Khóa học:
            </label>
            <select
              value={selectedCohort}
              onChange={handleCohortChange}
              style={{
                width: '100%',
                padding: '8px 12px',
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
                padding: '8px 12px',
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
                  {cls.params?.className || cls.params?.classCode || `Lớp ${cls.id}`}
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
                padding: '8px 12px',
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
              {(() => {
                console.log('🔍 Rendering subjects options:', { 
                  subjectsCount: subjects.length, 
                  selectedClass,
                  subjectsSample: subjects.slice(0, 2) 
                });
                return subjects.map((subject, index) => (
                  <option key={subject.id || `subject-${index}`} value={subject.id}>
                    {subject.params?.subjectName || subject.params?.subjectCode || `Môn ${subject.id}`}
                  </option>
                ));
              })()}
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
                <span>🏫 Lớp: {classes.find(c => c?.id?.toString() === selectedClass)?.params?.className || selectedClass}</span>
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
          border: '1px solid #dee2e6',
          marginTop: '20px'
        }}>
          {/* Basic info */}
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

          {students.length > 0 ? (
            <>
              <h3 style={{ marginBottom: '15px', color: '#495057' }}>
                📝 Nhập điểm môn: {selectedSubjectInfo?.params?.subjectName || selectedSubject} 
                ({selectedSubjectInfo?.params?.credits || 2} tín chỉ)
              </h3>
          
              {students.length > 0 && (
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
                
                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                  💡 Thêm/bớt cột điểm theo nhu cầu.
                </div>
              </div>
            </div>
          )}
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ color: '#6c757d' }}>Đang tải danh sách sinh viên...</div>
            </div>
          ) : students.length > 0 ? (
            <>
              {/* Legend - Hướng dẫn sử dụng */}
              <div style={{
                padding: '12px',
                marginBottom: '15px',
                backgroundColor: '#e7f3ff',
                border: '1px solid #0d6efd',
                borderRadius: '5px',
                fontSize: '13px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#0d6efd' }}>
                  📌 Hướng dẫn nhập điểm:
                </div>
                <ul style={{ margin: '0', paddingLeft: '20px', lineHeight: '1.8' }}>
                  <li>✏️ <strong>Lần đầu nhập điểm:</strong> Nhập tự do vào các ô điểm</li>
                  <li>🔒 <strong>Đã có điểm:</strong> Các ô sẽ bị khóa để bảo vệ dữ liệu</li>
                  <li>🎯 <strong>Sửa điểm (có lịch sử):</strong> Dùng nút "Thi lại/Học lại" → Lưu đầy đủ lịch sử</li>
                  <li>🔓 <strong>Sửa khẩn cấp (không lịch sử):</strong> Click "Mở khóa" → Sửa trực tiếp (⚠️ không lưu lịch sử)</li>
                  <li>🔵 <strong>Row màu xanh nhạt:</strong> Sinh viên đã có học lại/thi lại</li>
                  <li>🟡 <strong>Row màu vàng:</strong> TBKT {'<'} 5 (không được thi cuối kỳ)</li>
                </ul>
              </div>
              
              <div style={{ overflowX: 'auto',maxWidth: '100%'  }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #dee2e6',
                  fontSize: '13px'
                }}>
                <thead>
                  <tr style={{ backgroundColor: '#007bff', color: 'white' }}>
                    <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center', minWidth: '80px' }}>
                      Mã SV
                    </th>
                    <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center', minWidth: '150px' }}>
                      Tên sinh viên
                    </th>
                    {/* Dynamic TX columns */}
                    {Array.from({ length: gradeConfig.txColumns }, (_, i) => (
                      <th key={`tx${i + 1}`} style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center', minWidth: '80px' }}>
                        {gradeConfig.txColumns === 1 ? 'TX' : `TX${i + 1}`}
                      </th>
                    ))}
                    {/* Dynamic DK columns */}
                    {Array.from({ length: gradeConfig.dkColumns }, (_, i) => (
                      <th key={`dk${i + 1}`} style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center', minWidth: '80px' }}>
                        {gradeConfig.dkColumns === 1 ? 'ĐK' : `ĐK${i + 1}`}
                      </th>
                    ))}
                  
                    <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center', minWidth: '80px' }}>
                      TBKT
                    </th>
                      <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center', minWidth: '80px' }}>
                      Thi
                    </th>
                    <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center', minWidth: '80px' }}>
                      TBMH
                    </th>
                    <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center', minWidth: '120px' }}>
                      Trạng thái
                    </th>
                    <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center', minWidth: '120px' }}>
                      Xếp loại
                    </th>
                    <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center', minWidth: '120px' }}>
                      Ghi chú
                    </th>
                    <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center', minWidth: '200px' }}>
                      Thi lại/Học lại
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => {
                    const studentGrade = grades[student.id] || {};
                    
                    // Kiểm tra TBKT < 5 để disable điểm thi và tô vàng row
                    const tbktScore = studentGrade.tbktScore;
                    const isTbktFailed = tbktScore !== '' && tbktScore !== null && tbktScore !== undefined && Number(tbktScore) < 5;
                    
                    // Kiểm tra có học lại/thi lại từ GradeRetakes
                    const hasRetake = studentGrade.hasRetake === true;
                    
                    // ========== HYBRID APPROACH LOGIC ==========
                    // 1. Kiểm tra đã có điểm trong database
                    const hasExistingGrade = studentGrade.gradeId !== null && studentGrade.gradeId !== undefined;
                    
                    // 2. Kiểm tra điểm đã đạt
                    const isPassed = studentGrade.tbmhScore && studentGrade.tbmhScore >= 5;
                    
                    // 3. Kiểm tra đã được unlock
                    const isUnlocked = unlockedStudents.has(student.id);
                    
                    // 4. Quyết định lock hay không
                    // - Chưa có điểm: Không lock (cho phép nhập tự do)
                    // - Đã có điểm + đã unlock: Không lock
                    // - Đã có điểm + chưa unlock: Lock
                    const isLocked = hasExistingGrade && !isUnlocked;
                    
                    // 5. Lý do lock
                    let lockReason = '';
                    if (isLocked) {
                      if (isPassed) {
                        lockReason = '🔒 Điểm đã đạt - Dùng nút bên phải nếu cần xem lịch sử';
                      } else {
                        lockReason = '🔒 Dùng nút "Thi lại/Học lại" để cập nhật điểm và lưu lịch sử';
                      }
                    }
                    // ==========================================
                    
                    // Xác định màu background cho row
                    let rowBackgroundColor = 'white';
                    if (isTbktFailed) {
                      rowBackgroundColor = '#fff3cd'; // Vàng cho TBKT < 5
                    } else if (hasRetake) {
                      rowBackgroundColor = '#e7f3ff'; // Xanh nhạt cho học lại/thi lại
                    }
                    
                    return (
                      <tr key={student.id || `student-${index}`} style={{ backgroundColor: rowBackgroundColor }}>
                        {/* Mã SV */}
                        <td style={{ padding: '5px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                          {student.params?.studentCode || student.id}
                        </td>
                        
                        {/* Tên sinh viên */}
                        <td style={{ padding: '5px', border: '1px solid #dee2e6' }}>
                          {student.params?.fullName || 'N/A'}
                        </td>
                        
                        {/* Dynamic TX columns */}
                        {Array.from({ length: gradeConfig.txColumns }, (_, i) => {
                          const txKey = `tx${i + 1}`;
                          const txValue = studentGrade.txScore?.[txKey] || '';
                          
                          return (
                            <td key={txKey} style={{ padding: '5px', border: '1px solid #dee2e6', textAlign: 'center', position: 'relative' }}>
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.01"
                                value={txValue}
                                disabled={isLocked}
                                onChange={(e) => handleGradeChange(student.id, 'txScore', e.target.value, txKey)}
                                onBlur={(e) => {
                                  const normalized = normalizeNumber(e.target.value);
                                  if (normalized !== e.target.value) {
                                    handleGradeChange(student.id, 'txScore', normalized, txKey);
                                  }
                                }}
                                style={{
                                  width: '60px',
                                  padding: '4px',
                                  border: '1px solid #ccc',
                                  borderRadius: '3px',
                                  textAlign: 'center',
                                  backgroundColor: isLocked ? '#f8f9fa' : 'white',
                                  cursor: isLocked ? 'not-allowed' : 'text',
                                  color: isLocked ? '#6c757d' : 'inherit'
                                }}
                                title={isLocked ? lockReason : "Nhập điểm thường xuyên"}
                              />
                            </td>
                          );
                        })}
                        
                        {/* Dynamic DK columns */}
                        {Array.from({ length: gradeConfig.dkColumns }, (_, i) => {
                          const dkKey = `dk${i + 1}`;
                          const dkValue = studentGrade.dkScore?.[dkKey] || '';
                          return (
                            <td key={dkKey} style={{ padding: '5px', border: '1px solid #dee2e6', textAlign: 'center', position: 'relative' }}>
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.01"
                                value={dkValue}
                                disabled={isLocked}
                                onChange={(e) => handleGradeChange(student.id, 'dkScore', e.target.value, dkKey)}
                                onBlur={(e) => {
                                  const normalized = normalizeNumber(e.target.value);
                                  if (normalized !== e.target.value) {
                                    handleGradeChange(student.id, 'dkScore', normalized, dkKey);
                                  }
                                }}
                                style={{
                                  width: '60px',
                                  padding: '4px',
                                  border: '1px solid #ccc',
                                  borderRadius: '3px',
                                  textAlign: 'center',
                                  backgroundColor: isLocked ? '#f8f9fa' : 'white',
                                  cursor: isLocked ? 'not-allowed' : 'text',
                                  color: isLocked ? '#6c757d' : 'inherit'
                                }}
                                title={isLocked ? lockReason : "Nhập điểm định kỳ"}
                              />
                            </td>
                          );
                        })}
                        
                        
                        {/* TBKT (calculated) */}
                        <td style={{ 
                          padding: '5px', 
                          border: '1px solid #dee2e6', 
                          textAlign: 'center',
                          backgroundColor: '#f8f9fa',
                          fontWeight: 'bold',
                          color: studentGrade.tbktScore ? '#28a745' : '#6c757d'
                        }}>
                          {studentGrade.tbktScore || '-'}
                        </td>
                        {/* Điểm Thi */}
                        <td style={{ padding: '5px', border: '1px solid #dee2e6', textAlign: 'center', position: 'relative' }}>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.01"
                            value={isTbktFailed ? '' : (studentGrade.finalScore || '')}
                            disabled={isTbktFailed || isLocked}
                            onChange={(e) => handleGradeChange(student.id, 'finalScore', e.target.value)}
                            onBlur={(e) => {
                              // Chuẩn hóa format khi rời khỏi input
                              const normalized = normalizeNumber(e.target.value);
                              if (normalized !== e.target.value) {
                                handleGradeChange(student.id, 'finalScore', normalized);
                              }
                            }}
                            style={{
                              width: '60px',
                              padding: '4px',
                              border: '1px solid #ccc',
                              borderRadius: '3px',
                              textAlign: 'center',
                              backgroundColor: (isTbktFailed || isLocked) ? '#f8f9fa' : 'white',
                              cursor: (isTbktFailed || isLocked) ? 'not-allowed' : 'text',
                              color: isLocked ? '#6c757d' : 'inherit'
                            }}
                            title={isTbktFailed ? 'Không thể nhập điểm thi do TBKT < 5' : (isLocked ? lockReason : 'Nhập điểm thi cuối kỳ')}
                          />
                        </td>
                        
                        {/* TBMH (calculated) */}
                        <td style={{ 
                          padding: '5px', 
                          border: '1px solid #dee2e6', 
                          textAlign: 'center',
                          backgroundColor: '#f8f9fa',
                          fontWeight: 'bold',
                          color: (isTbktFailed ? false : studentGrade.tbmhScore) ? '#007bff' : '#6c757d'
                        }}>
                          {isTbktFailed ? '-' : (studentGrade.tbmhScore || '-')}
                        </td>
                        
                        {/* Trạng thái */}
                        <td style={{ padding: '5px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                          {studentGrade.tbmhScore >= 5 ? 
                            <span style={{ color: '#28a745', fontWeight: 'bold' }}>✅ Đạt</span> :
                            studentGrade.tbmhScore > 0 ? 
                              <span style={{ color: '#dc3545', fontWeight: 'bold' }}>❌ Không đạt</span> :
                              <span style={{ color: '#6c757d' }}>⏳ Chưa có điểm</span>
                          }
                        </td>
                        
                        {/* Xếp loại */}
                         <td style={{ padding: '5px', border: '1px solid #dee2e6', textAlign: 'center', fontWeight: 'bold', color: '#6c757d' }}>
                          {isTbktFailed ? '-' : getGradeClassification(studentGrade.tbmhScore)}
                        </td>
                        
                        {/* Ghi chú */}
                        <td style={{ padding: '5px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                          <input
                            type="text"
                            value={studentGrade.ghiChu || ''}
                            onChange={(e) => handleGradeChange(student.id, 'ghiChu', e.target.value)}
                            placeholder="Ghi chú..."
                            style={{
                              width: '250px', // tăng chiều rộng
                              padding: '4px',
                              border: '1px solid #ccc',
                              borderRadius: '3px'
                            }}
                          />
                        </td>
                        
                        {/* Thi lại/Học lại */}
                        <td style={{ padding: '5px', border: '1px solid #dee2e6', textAlign: 'left' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <RetakeManagementComponent
                              student={{
                                id: student.id,
                                studentCode: student.params?.studentCode,
                                fullName: student.params?.fullName
                              }}
                              gradeData={{
                                gradeId: studentGrade.gradeId,
                                txScore: studentGrade.txScore,
                                dkScore: studentGrade.dkScore,
                                tbktScore: studentGrade.tbktScore,
                                finalScore: studentGrade.finalScore,
                                tbmhScore: studentGrade.tbmhScore,
                                attemptNumber: studentGrade.attemptNumber || 1
                              }}
                              gradeConfig={gradeConfig} // Truyền gradeConfig
                              hasExistingGrade={hasExistingGrade} // Truyền flag đã có điểm
                              subjectId={parseInt(selectedSubject)}
                              onGradeUpdate={(updatedGradeData) => {
                                console.log('Grade updated:', updatedGradeData);
                                // Cập nhật state điểm cho sinh viên này
                                setGrades(prevGrades => ({
                                  ...prevGrades,
                                  [student.id]: {
                                    ...prevGrades[student.id],
                                    ...updatedGradeData,
                                    hasRetake: true // Đánh dấu đã có học lại/thi lại
                                  }
                                }));
                                // Component sẽ tự động re-render với grades mới
                              }}
                              showDetails={false}
                            />
                            
                            {/* Nút Unlock/Lock */}
                            {hasExistingGrade && (
                              <>
                                {isLocked ? (
                                  <button
                                    onClick={() => handleUnlock(student.id, student.params?.fullName)}
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '11px',
                                      backgroundColor: '#ffc107',
                                      color: '#000',
                                      border: 'none',
                                      borderRadius: '3px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title="Mở khóa để sửa điểm trực tiếp (KHÔNG lưu lịch sử)"
                                  >
                                    🔓 Mở khóa
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleLock(student.id)}
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '11px',
                                      backgroundColor: '#6c757d',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '3px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title="Khóa lại để bảo vệ dữ liệu"
                                  >
                                    🔒 Khóa lại
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
              Không có sinh viên nào để nhập điểm
            </div>
          )}
          
          {/* Công thức tính điểm */}
          <div style={{
            marginTop: '15px',
            padding: '10px',
            backgroundColor: '#e7f3ff',
            border: '1px solid #b3d9ff',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            <strong>📐 Công thức tính:</strong><br/>
            • <strong>{getFormulaStrings().tbktFormula}</strong><br/>
            • <strong>{getFormulaStrings().tbmhFormula}</strong><br/>
            • <strong>{getFormulaStrings().coefficientInfo}</strong><br/>
            • <strong>{getFormulaStrings().weightInfo}</strong><br/>
            • Số cột điều kiện: {selectedSubjectInfo?.params?.credits || 2} tín chỉ → {
              (() => {
                const credits = selectedSubjectInfo?.params?.credits || 2;
                return credits === 2 ? '1 cột ĐK' : credits === 3 ? '2 cột ĐK (ĐK1, ĐK2)' : '3 cột ĐK (ĐK1, ĐK2, ĐK3)';
              })()
            }
          </div>

          {/* Quy tắc đặc biệt */}
          <div style={{
            marginTop: '10px',
            padding: '10px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            <strong>⚠️ Quy tắc quan trọng:</strong><br/>
            • Sinh viên có <strong>TBKT &lt; 5.0</strong> sẽ <strong>không được phép nhập điểm thi</strong> và được đánh dấu màu vàng<br/>
            • Sinh viên này phải thi lại các điểm TX/DK để đạt TBKT ≥ 5.0 trước khi được thi môn<br/>
            • <strong>Khi lưu:</strong> Điểm thi và TBMH sẽ tự động được xóa khỏi database nếu TBKT &lt; 5.0
          </div>

          {/* Nút lưu điểm */}
          <div style={{ 
            marginTop: '20px', 
            textAlign: 'center',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            border: '1px solid #dee2e6'
          }}>
            <button
              onClick={saveGrades}
              disabled={loading || Object.keys(grades).length === 0}
              style={{
                padding: '12px 30px',
                backgroundColor: loading ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                marginRight: '10px'
              }}
            >
              {loading ? '⏳ Đang lưu...' : '💾 Lưu điểm'}
            </button>
          </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
              Không có sinh viên nào để nhập điểm
            </div>
          )}
        </div>
      )}

      {/* Thông báo lỗi */}
      {error && (
        <div style={{
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Hướng dẫn */}
      {!selectedCohort && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#fff3cd',
          color: '#856404',
          border: '1px solid #ffeaa7',
          borderRadius: '4px'
        }}>
          💡 <strong>Bước 1:</strong> Vui lòng chọn khóa học trước để xem danh sách lớp thuộc khóa đó.
        </div>
      )}

      {selectedCohort && !selectedClass && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#d1ecf1',
          color: '#0c5460',
          border: '1px solid #bee5eb',
          borderRadius: '4px'
        }}>
          🏫 <strong>Bước 2:</strong> Vui lòng chọn lớp học từ khóa {cohorts.find(c => c?.cohortId?.toString() === selectedCohort)?.name}.
          {classes.length === 0 && (
            <div style={{ marginTop: '5px', fontSize: '14px' }}>
              ⚠️ Khóa học này chưa có lớp nào. Vui lòng tạo lớp trước.
            </div>
          )}
        </div>
      )}

      {selectedCohort && selectedClass && !selectedSubject && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#d4edda',
          color: '#155724',
          border: '1px solid #c3e6cb',
          borderRadius: '4px'
        }}>
          📚 <strong>Bước 3:</strong> Vui lòng chọn môn học để hiển thị bảng nhập điểm chi tiết.
        </div>
      )}

      {/* Debug section - chỉ hiện trong development */}
      {selectedCohort && selectedClass && selectedSubject && !students.length && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#fff3cd',
          color: '#856404',
          border: '1px solid #ffeaa7',
          borderRadius: '4px'
        }}>
          ⚠️ <strong>Chưa có sinh viên:</strong> Lớp này chưa có sinh viên nào. Vui lòng thêm sinh viên vào lớp trước khi nhập điểm.
        </div>
      )}
    </div>
  );
};

export default GradeEntryPage;