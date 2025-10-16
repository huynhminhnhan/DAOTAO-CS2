import React, { useState, useEffect } from 'react';
import { ApiClient } from 'adminjs';
import * as XLSX from 'xlsx';
import { 
  calculateTBKT, 
  calculateTBMH, 
  getGradeClassification, 
  getFormulaStrings,
  GRADE_COEFFICIENTS,
  GRADE_WEIGHTS 
} from '../utils/gradeCalculation';
import { API_ENDPOINTS } from '../config/api.config';
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
  const [currentUser, setCurrentUser] = useState(null);
  
  // State để quản lý các sinh viên được unlock (Hybrid Approach)
  const [unlockedStudents, setUnlockedStudents] = useState(new Set());
  
  // State Management for Grade Status
  const [gradeStatuses, setGradeStatuses] = useState({}); // {studentId: {status, lockStatus, ...}}
  const [processingAction, setProcessingAction] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, DRAFT, PENDING_REVIEW, APPROVED_TX_DK, FINAL_ENTERED, FINALIZED
  const [showStateHistory, setShowStateHistory] = useState(null); // studentId to show history
  
  // Dynamic grade configuration
  const [gradeConfig, setGradeConfig] = useState({
    txColumns: 1,
    dkColumns: 1,
    maxTxColumns: 10,
    maxDkColumns: 10
  });

  // State for Import Final Score Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const api = new ApiClient();
  
  // Helper function để chuẩn hóa format số
  const normalizeNumber = (value) => {
    if (value === '' || value === null || value === undefined) {
      return '';
    }
    const num = Number(value);
    return isNaN(num) ? '' : num.toString();
  };
  
  // Helper functions for grade status (Admin version)
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
  
  const canEditGrade = (studentId, fieldName) => {
    const gradeStatus = gradeStatuses[studentId];
    if (!gradeStatus) return true; // New grade, admin can edit
    
    // Admin can always edit unless FINALIZED
    if (gradeStatus.gradeStatus === 'FINALIZED') {
      return false;
    }
    
    // Check field-level locks
    if (fieldName && gradeStatus.lockStatus) {
      if (fieldName === 'txScore' && gradeStatus.lockStatus.txLocked) return false;
      if (fieldName === 'dkScore' && gradeStatus.lockStatus.dkLocked) return false;
      if (fieldName === 'finalScore' && gradeStatus.lockStatus.finalLocked) return false;
    }
    
    return true;
  };
  
  const isFieldLocked = (studentId, fieldName) => {
    const gradeStatus = gradeStatuses[studentId];
    
    // Nếu không có gradeStatus → Chưa lưu điểm → Mở tất cả
    if (!gradeStatus) {
      return false;
    }
    
    // ✅ KIỂM TRA UNLOCK TRƯỚC (Ưu tiên cao nhất)
    // Nếu sinh viên đã được unlock → Mở tất cả các field
    const isUnlocked = unlockedStudents.has(studentId);
    if (isUnlocked) {
      console.log(`[isFieldLocked] Student ${studentId} field ${fieldName}: UNLOCKED (manual unlock)`);
      return false; // Đã unlock → Mở tất cả
    }
    
    // 🔒 LUÔN KHÓA TX VÀ ĐK SAU KHI ĐÃ LƯU (có gradeId)
    // Chỉ cho phép sửa qua nút "Thi lại/Học lại" hoặc "Mở khóa"
    if (fieldName === 'txScore' || fieldName === 'dkScore') {
      return true; // KHÓA CỨNG TX/ĐK
    }
    
    // Đối với finalScore: kiểm tra lockStatus từ backend VÀ status duyệt TX/ĐK
    if (fieldName === 'finalScore') {
      // ✅ KIỂM TRA DUYỆT TX/ĐK TRƯỚC
      // Chỉ unlock cột điểm thi khi đã duyệt TX/ĐK
      const currentStatus = gradeStatus.gradeStatus;
      const isTxDkApproved = currentStatus === 'APPROVED_TX_DK' || 
                            currentStatus === 'FINAL_ENTERED' || 
                            currentStatus === 'FINALIZED';
      
      if (!isTxDkApproved) {
        console.log(`[isFieldLocked] Student ${studentId} finalScore: LOCKED (TX/ĐK chưa duyệt, status=${currentStatus})`);
        return true; // 🔒 KHÓA nếu chưa duyệt TX/ĐK
      }
      
      // Nếu đã duyệt TX/ĐK → Check finalLocked
      let lockStatus = gradeStatus.lockStatus;
      if (!lockStatus) {
        return false; // Không có lockStatus → Mở final
      }
      
      if (typeof lockStatus === 'string') {
        try {
          lockStatus = JSON.parse(lockStatus);
        } catch (e) {
          console.error('Failed to parse lockStatus:', lockStatus);
          return false;
        }
      }
      
      const isLocked = lockStatus.finalLocked === true;
      console.log(`[isFieldLocked] Student ${studentId} finalScore: ${isLocked ? 'LOCKED' : 'UNLOCKED'} (finalLocked=${lockStatus.finalLocked})`);
      return isLocked;
    }
    
    return false;
  };
  
  const canApprove = (studentId) => {
    const gradeStatus = gradeStatuses[studentId];
    return gradeStatus && gradeStatus.gradeStatus === 'PENDING_REVIEW';
  };
  
  const canEnterFinal = (studentId) => {
    const gradeStatus = gradeStatuses[studentId];
    return gradeStatus && gradeStatus.gradeStatus === 'APPROVED_TX_DK';
  };
  
  const canFinalize = (studentId) => {
    const gradeStatus = gradeStatuses[studentId];
    return gradeStatus && gradeStatus.gradeStatus === 'FINAL_ENTERED';
  };
  
  const canReject = (studentId) => {
    const gradeStatus = gradeStatuses[studentId];
    return gradeStatus && ['PENDING_REVIEW', 'APPROVED_TX_DK', 'FINAL_ENTERED'].includes(gradeStatus.gradeStatus);
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
        const endpoint = (window && window.location && window.location.pathname && window.location.pathname.startsWith('/admin')) ? '/admin-api/cohorts' : '/admin-api/cohorts';
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
        const res = await fetch('/admin-api/subjects', { credentials: 'include' });
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
        const directResponse = await fetch('/admin-api/subjects', { credentials: 'include' });
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
                hasRetake: student.hasRetake || false, // Flag từ GradeRetakes
                letterGrade: student.letterGrade || '',
                isPassed: student.isPassed,
                notes: student.notes || '',
                lastUpdated: student.lastUpdated,
                // State management fields
                gradeStatus: student.gradeStatus || 'DRAFT',
                lockStatus: (() => {
                  // Parse lockStatus if it's a string (JSON from DB)
                  if (!student.lockStatus) {
                    return { txLocked: false, dkLocked: false, finalLocked: false };
                  }
                  if (typeof student.lockStatus === 'string') {
                    try {
                      return JSON.parse(student.lockStatus);
                    } catch (e) {
                      console.warn('Failed to parse lockStatus:', student.lockStatus);
                      return { txLocked: false, dkLocked: false, finalLocked: false };
                    }
                  }
                  return student.lockStatus;
                })(),
                submittedForReviewAt: student.submittedForReviewAt,
                approvedBy: student.approvedBy,
                approvedAt: student.approvedAt,
                finalizedAt: student.finalizedAt
              }
            }));

            setStudents(formattedStudents);
            
            // Load grade statuses
            const statuses = {};
            formattedStudents.forEach(student => {
              if (student.params.gradeId) {
                // Parse lockStatus if needed
                let lockStatus = student.params.lockStatus;
                if (typeof lockStatus === 'string') {
                  try {
                    lockStatus = JSON.parse(lockStatus);
                  } catch (e) {
                    lockStatus = { txLocked: false, dkLocked: false, finalLocked: false };
                  }
                }
                
                statuses[student.id] = {
                  gradeId: student.params.gradeId,
                  gradeStatus: student.params.gradeStatus,
                  lockStatus: lockStatus || { txLocked: false, dkLocked: false, finalLocked: false },
                  submittedForReviewAt: student.params.submittedForReviewAt,
                  approvedBy: student.params.approvedBy,
                  approvedAt: student.params.approvedAt,
                  finalizedAt: student.params.finalizedAt,
                  finalScore: student.params.finalScore  // ✅ Thêm finalScore từ DB
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
        console.log(`[Unlock] Student ${studentId} added to unlockedStudents. Total unlocked:`, newSet.size);
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

  // State Management Actions (Admin only)
  const handleApproveTxDk = async (studentId) => {
    const gradeStatus = gradeStatuses[studentId];
    if (!gradeStatus || !gradeStatus.gradeId) {
      alert('Không tìm thấy điểm để duyệt');
      return;
    }
    
    if (!confirm('Bạn có chắc muốn duyệt điểm TX/ĐK này?\nSau khi duyệt, điểm TX và ĐK sẽ bị khóa.')) {
      return;
    }
    
    try {
      setProcessingAction(true);
      const response = await fetch('/admin-api/grade/state/approve-tx-dk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          gradeId: gradeStatus.gradeId,
          reason: 'Admin duyệt điểm TX và ĐK'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('✅ Đã duyệt điểm TX/ĐK thành công!');
        // Reload data
        window.dispatchEvent(new Event('reload'));
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      alert('❌ Lỗi: ' + error.message);
    } finally {
      setProcessingAction(false);
    }
  };
  
  const handleEnterFinalScore = async (studentId, finalScore) => {
    const gradeStatus = gradeStatuses[studentId];
    if (!gradeStatus || !gradeStatus.gradeId) {
      alert('Không tìm thấy điểm');
      return;
    }
    
    if (!finalScore || finalScore === '') {
      alert('Vui lòng nhập điểm thi cuối kỳ');
      return;
    }
    
    try {
      setProcessingAction(true);
      const response = await fetch('/admin-api/grade/state/enter-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          gradeId: gradeStatus.gradeId,
          finalScore: parseFloat(finalScore),
          reason: 'Admin nhập điểm thi cuối kỳ'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('✅ Đã nhập điểm thi thành công!');
        window.dispatchEvent(new Event('reload'));
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      alert('❌ Lỗi: ' + error.message);
    } finally {
      setProcessingAction(false);
    }
  };
  
  const handleFinalize = async (studentId) => {
    const gradeStatus = gradeStatuses[studentId];
    if (!gradeStatus || !gradeStatus.gradeId) {
      alert('Không tìm thấy điểm');
      return;
    }
    
    if (!confirm('Bạn có chắc muốn hoàn tất điểm này?\nSau khi hoàn tất, TẤT CẢ các trường sẽ bị khóa và công bố cho sinh viên.')) {
      return;
    }
    
    try {
      setProcessingAction(true);
      const response = await fetch('/admin-api/grade/state/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          gradeId: gradeStatus.gradeId,
          reason: 'Admin hoàn tất và công bố điểm'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('✅ Đã hoàn tất điểm thành công!');
        window.dispatchEvent(new Event('reload'));
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      alert('❌ Lỗi: ' + error.message);
    } finally {
      setProcessingAction(false);
    }
  };
  
  const handleReject = async (studentId) => {
    const gradeStatus = gradeStatuses[studentId];
    if (!gradeStatus || !gradeStatus.gradeId) {
      alert('Không tìm thấy điểm');
      return;
    }
    
    const reason = prompt('Vui lòng nhập lý do từ chối:');
    if (!reason || reason.trim() === '') {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }
    
    try {
      setProcessingAction(true);
      const response = await fetch('/admin-api/grade/state/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          gradeId: gradeStatus.gradeId,
          reason: reason
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('✅ Đã từ chối điểm. Giáo viên có thể chỉnh sửa lại.');
        window.dispatchEvent(new Event('reload'));
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      alert('❌ Lỗi: ' + error.message);
    } finally {
      setProcessingAction(false);
    }
  };

  // 🔒 Chốt điểm thi tất cả - Bulk Lock finalScore
  const handleBulkLockFinalScore = async () => {
    // Lọc ra các sinh viên có finalScore và chưa bị lock
    const studentsToLock = students.filter(s => {
      const studentGrade = grades[s.id];
      const gradeStatus = gradeStatuses[s.id];
      
      // Phải có finalScore
      if (!studentGrade?.finalScore || !gradeStatus?.gradeId) return false;
      
      // Check finalLocked = false
      let lockStatus = gradeStatus.lockStatus;
      if (typeof lockStatus === 'string') {
        try {
          lockStatus = JSON.parse(lockStatus);
        } catch (e) {
          return true; // Parse error = chưa lock
        }
      }
      
      return lockStatus?.finalLocked !== true;
    });

    if (studentsToLock.length === 0) {
      alert('Không có sinh viên nào cần chốt điểm thi!');
      return;
    }

    const confirmMessage = `🔒 CHỐT ĐIỂM THI TẤT CẢ\n\n` +
      `Số sinh viên sẽ chốt: ${studentsToLock.length}\n\n` +
      `Sau khi chốt:\n` +
      `✅ Điểm thi sẽ được khóa lại\n` +
      `✅ Sinh viên có thể đăng ký thi lại (nếu không đạt)\n\n` +
      `Bạn có chắc muốn chốt điểm thi cho tất cả?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setProcessingAction(true);
      
      // Lấy danh sách gradeIds
      const gradeIds = studentsToLock.map(s => gradeStatuses[s.id].gradeId);
      
      const response = await fetch('/admin-api/grade/state/bulk-lock-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          gradeIds: gradeIds,
          reason: 'Admin chốt điểm thi tất cả'
        })
      });

      const result = await response.json();
      if (result.success) {
        const successCount = result.results?.filter(r => r.success).length || 0;
        const failCount = result.results?.filter(r => !r.success).length || 0;
        
        let message = `✅ Đã chốt điểm thi thành công!\n\n`;
        message += `Thành công: ${successCount}/${studentsToLock.length}\n`;
        if (failCount > 0) {
          message += `Thất bại: ${failCount}\n`;
        }
        message += `\nSinh viên có thể đăng ký thi lại nếu không đạt.`;
        
        alert(message);
        
        // ✨ Cập nhật UI ngay lập tức thay vì reload
        setGradeStatuses(prevStatuses => {
          const newStatuses = { ...prevStatuses };
          
          // Cập nhật lockStatus và gradeStatus cho tất cả gradeIds thành công
          if (result.results && Array.isArray(result.results)) {
            result.results.forEach(item => {
              if (item.success && item.gradeId) {
                // Tìm studentId từ gradeId
                const studentId = Object.keys(newStatuses).find(
                  id => newStatuses[id]?.gradeId === item.gradeId
                );
                
                if (studentId && newStatuses[studentId]) {
                  // Parse lockStatus hiện tại
                  let currentLockStatus = newStatuses[studentId].lockStatus;
                  if (typeof currentLockStatus === 'string') {
                    try {
                      currentLockStatus = JSON.parse(currentLockStatus);
                    } catch (e) {
                      currentLockStatus = { txLocked: true, dkLocked: true, finalLocked: false };
                    }
                  }
                  
                  // Update finalLocked = true AND transition to FINALIZED
                  const currentStatus = newStatuses[studentId].gradeStatus;
                  newStatuses[studentId] = {
                    ...newStatuses[studentId],
                    gradeStatus: currentStatus === 'FINAL_ENTERED' ? 'FINALIZED' : currentStatus,
                    lockStatus: {
                      ...currentLockStatus,
                      finalLocked: true // 🔒 Lock điểm thi
                    },
                    finalizedAt: currentStatus === 'FINAL_ENTERED' ? new Date().toISOString() : newStatuses[studentId].finalizedAt
                  };
                }
              }
            });
          }
          
          return newStatuses;
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      alert('❌ Lỗi: ' + error.message);
    } finally {
      setProcessingAction(false);
    }
  };
  
  const handleEmergencyUnlock = async (studentId, fieldName) => {
    const gradeStatus = gradeStatuses[studentId];
    if (!gradeStatus || !gradeStatus.gradeId) {
      alert('Không tìm thấy điểm');
      return;
    }
    
    const reason = prompt(`Mở khóa khẩn cấp cho ${fieldName}.\nVui lòng nhập lý do:`);
    if (!reason || reason.trim() === '') {
      alert('Vui lòng nhập lý do mở khóa');
      return;
    }
    
    try {
      setProcessingAction(true);
      const response = await fetch('/admin-api/grade/state/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          gradeId: gradeStatus.gradeId,
          fieldName: fieldName,
          reason: reason
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert(`✅ Đã mở khóa ${fieldName} thành công!`);
        window.dispatchEvent(new Event('reload'));
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      alert('❌ Lỗi: ' + error.message);
    } finally {
      setProcessingAction(false);
    }
  };

  // Bulk approve all pending grades
  const bulkApproveGrades = async () => {
    // ✅ DUYỆT TẤT CẢ ĐIỂM TX/ĐK CHỜ DUYỆT
    // Sau khi duyệt: gradeStatus → APPROVED_TX_DK, unlock cột điểm thi
    
    // Find all students with PENDING_REVIEW status
    const pendingStudents = students.filter(student => 
      gradeStatuses[student.id]?.gradeStatus === 'PENDING_REVIEW'
    );

    if (pendingStudents.length === 0) {
      alert('Không có điểm nào đang chờ duyệt');
      return;
    }

    if (!confirm(`Bạn có chắc muốn duyệt TẤT CẢ ${pendingStudents.length} điểm đang chờ duyệt?\n\nSau khi duyệt, điểm TX và ĐK sẽ bị khóa.`)) {
      return;
    }

    try {
      setLoading(true);
      
      // Get all gradeIds
      const gradeIds = pendingStudents
        .map(student => gradeStatuses[student.id]?.gradeId)
        .filter(id => id); // Remove undefined/null

      if (gradeIds.length === 0) {
        alert('Không tìm thấy gradeId để duyệt');
        return;
      }

      console.log('[bulkApproveGrades] Approving gradeIds:', gradeIds);

      // Call bulk approve API
      const response = await fetch('/admin-api/grade/state/bulk-approve-tx-dk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          gradeIds: gradeIds,
          reason: 'Admin duyệt hàng loạt điểm TX và ĐK'
        })
      });

      const result = await response.json();
      console.log('[bulkApproveGrades] API result:', result);
      
      if (result.success) {
        // ✅ Tính số lượng thành công/thất bại
        const successCount = result.results?.filter(r => r.success).length || result.successCount || gradeIds.length;
        const failCount = result.results?.filter(r => !r.success).length || result.failCount || 0;
        
        alert(`✅ Đã duyệt thành công ${successCount}/${gradeIds.length} điểm!${
          failCount > 0 ? `\n\n❌ Thất bại: ${failCount} điểm` : ''
        }`);
        
        // ✨ Cập nhật UI ngay lập tức thay vì reload
        setGradeStatuses(prevStatuses => {
          const newStatuses = { ...prevStatuses };
          
          console.log('[bulkApproveGrades] Updating gradeStatuses...', {
            prevStatuses: Object.keys(prevStatuses).length,
            results: result.results
          });
          
          // Cập nhật status cho tất cả sinh viên được duyệt
          if (result.results && Array.isArray(result.results)) {
            result.results.forEach(item => {
              if (item.success && item.gradeId) {
                // Tìm studentId từ gradeId
                const studentId = Object.keys(prevStatuses).find(
                  id => prevStatuses[id]?.gradeId === item.gradeId
                );
                
                if (studentId && prevStatuses[studentId]) {
                  console.log(`[bulkApproveGrades] Updating student ${studentId}:`, {
                    oldStatus: prevStatuses[studentId].gradeStatus,
                    newStatus: 'APPROVED_TX_DK'
                  });
                  
                  newStatuses[studentId] = {
                    ...prevStatuses[studentId],
                    gradeStatus: 'APPROVED_TX_DK',  // ← KEY CHANGE: Unlock cột điểm thi!
                    lockStatus: {
                      txLocked: true,
                      dkLocked: true,
                      finalLocked: false
                    }
                  };
                }
              }
            });
          } else {
            // Fallback: Nếu API không trả results, update tất cả pendingStudents
            console.log('[bulkApproveGrades] No results array, updating all pendingStudents');
            pendingStudents.forEach(student => {
              if (newStatuses[student.id]) {
                console.log(`[bulkApproveGrades] Fallback update student ${student.id}`);
                newStatuses[student.id] = {
                  ...newStatuses[student.id],
                  gradeStatus: 'APPROVED_TX_DK',
                  lockStatus: {
                    txLocked: true,
                    dkLocked: true,
                    finalLocked: false
                  }
                };
              }
            });
          }
          
          console.log('[bulkApproveGrades] Updated gradeStatuses:', Object.keys(newStatuses).length);
          return newStatuses;
        });
      } else {
        throw new Error(result.message || 'Không thể duyệt điểm hàng loạt');
      }
    } catch (error) {
      console.error('[bulkApproveGrades] Error:', error);
      alert('❌ Lỗi khi duyệt hàng loạt: ' + error.message);
    } finally {
      setLoading(false);
    }
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

      // ✅ Update gradeStatuses with new gradeIds from response
      if (result.results && result.results.details) {
        const newStatuses = { ...gradeStatuses };
        result.results.details.forEach(detail => {
          if (detail.gradeId && detail.studentId) {
            // Check if finalScore was entered to determine status
            const studentGrade = grades[detail.studentId];
            const hasFinalScore = studentGrade?.finalScore && 
                                 studentGrade.finalScore !== '' && 
                                 studentGrade.finalScore !== null;
            
            newStatuses[detail.studentId] = {
              gradeId: detail.gradeId,
              gradeStatus: hasFinalScore ? 'FINAL_ENTERED' : 'DRAFT', // FINAL_ENTERED if has final score
              lockStatus: { txLocked: false, dkLocked: false, finalLocked: false },
              submittedForReviewAt: null,
              approvedBy: null,
              approvedAt: null,
              finalizedAt: null,
              finalScore: hasFinalScore ? parseFloat(studentGrade.finalScore) : null  // ✅ Lưu finalScore từ local state
            };
          }
        });
        setGradeStatuses(newStatuses);
        console.log('✅ Updated gradeStatuses after save:', newStatuses);
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

  // ==================== IMPORT FINAL SCORE FUNCTIONS ====================
  
  const downloadImportTemplate = async () => {
    try {
      // Gọi API backend để tạo file Excel (giống TeacherGradeEntryComponent)
      const response = await fetch(API_ENDPOINTS.GRADE.DOWNLOAD_FINAL_EXAM_TEMPLATE);
      
      if (!response.ok) {
        throw new Error('Không thể tải template');
      }
      
      const blob = await response.blob();
      
      // Download file Excel
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Template_Import_DiemThi.xlsx';
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      console.log('✅ Template Excel downloaded successfully');
    } catch (error) {
      console.error('❌ Error downloading template:', error);
      alert('Lỗi khi tải template: ' + error.message);
    }
  };

  const handleImportFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
    }
  };

  const handleImportFinalScores = async () => {
    if (!importFile) {
      alert('❌ Vui lòng chọn file để import');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      let dataRows = [];
      const fileName = importFile.name.toLowerCase();

      // Kiểm tra loại file và parse tương ứng
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Parse Excel file
        const arrayBuffer = await importFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          throw new Error('File Excel không có dữ liệu');
        }

        // Convert to array of objects
        const headers = jsonData[0];
        dataRows = jsonData.slice(1)
          .filter(row => row.length > 0)
          .map(row => {
            const obj = {};
            headers.forEach((header, idx) => {
              obj[header] = row[idx] !== undefined ? row[idx] : '';
            });
            return obj;
          });

      } else if (fileName.endsWith('.csv')) {
        // Parse CSV file
        const fileContent = await importFile.text();
        const lines = fileContent.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          throw new Error('File CSV không có dữ liệu');
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        dataRows = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const obj = {};
          headers.forEach((header, idx) => {
            obj[header] = values[idx] || '';
          });
          return obj;
        });

      } else {
        throw new Error('Định dạng file không được hỗ trợ. Vui lòng chọn file .xlsx hoặc .csv');
      }

      // Find column indices
      const firstRow = dataRows[0] || {};
      const headers = Object.keys(firstRow);
      const mssvKey = headers.find(h => h.includes('MSSV') || h.includes('Mã'));
      const scoreKey = headers.find(h => h.includes('Điểm thi') || h.includes('Final'));

      if (!mssvKey || !scoreKey) {
        throw new Error('File không đúng định dạng. Cần có cột "MSSV" và "Điểm thi"');
      }

      // Parse data rows
      const importData = {};
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      dataRows.forEach((row, index) => {
        const mssv = row[mssvKey]?.toString().trim();
        const scoreStr = row[scoreKey];

        if (!mssv) return;

        // Validate score
        const score = parseFloat(scoreStr);
        if (isNaN(score) || score < 0 || score > 10) {
          errors.push(`Dòng ${index + 2}: MSSV ${mssv} - Điểm không hợp lệ: ${scoreStr}`);
          errorCount++;
          return;
        }

        importData[mssv] = score;
        successCount++;
      });

      // Apply imported scores to grades state
      const updatedGrades = { ...grades };
      let appliedCount = 0;

      students.forEach(student => {
        const studentCode = student.params?.studentCode;
        if (studentCode && importData[studentCode] !== undefined) {
          if (!updatedGrades[student.id]) {
            updatedGrades[student.id] = {
              enrollmentId: student.enrollmentId,
              txScore: {},
              dkScore: {},
              finalScore: '',
              tbktScore: '',
              tbmhScore: '',
              ghiChu: '',
              gradeId: student.params?.gradeId || null
            };
          }
          updatedGrades[student.id].finalScore = importData[studentCode].toString();
          
          // Recalculate TBMH if TBKT exists
          const tbkt = parseFloat(updatedGrades[student.id].tbktScore);
          if (!isNaN(tbkt)) {
            updatedGrades[student.id].tbmhScore = calculateTBMH(tbkt, importData[studentCode]);
          }
          
          appliedCount++;
        }
      });

      setGrades(updatedGrades);
      setImportResult({
        success: true,
        total: dataRows.length,
        successCount,
        errorCount,
        appliedCount,
        errors: errors.slice(0, 10) // Show first 10 errors
      });

      alert(`✅ Import thành công!\n\n📊 Đã import: ${appliedCount} điểm\n✅ Hợp lệ: ${successCount}\n❌ Lỗi: ${errorCount}`);

    } catch (error) {
      console.error('Import error:', error);
      alert(`❌ Lỗi import: ${error.message}`);
      setImportResult({
        success: false,
        error: error.message
      });
    } finally {
      setImporting(false);
    }
  };

  const canShowImportButton = () => {
    // Chỉ hiển thị khi:
    // 1. Đã chọn môn học
    if (!selectedSubject) return false;
    
    // 2. Có sinh viên trong danh sách
    if (students.length === 0) return false;
    
    // 3. Điểm TX/ĐK đã được duyệt (APPROVED_TX_DK hoặc cao hơn)
    const hasApprovedTxDk = students.some(student => {
      const gradeStatus = gradeStatuses[student.id];
      if (!gradeStatus) return false; // Chưa có status = chưa duyệt
      
      // Kiểm tra xem đã approved TX/ĐK chưa
      const currentStatus = gradeStatus.gradeStatus || '';
      const approvedStatuses = ['APPROVED_TX_DK', 'FINAL_ENTERED', 'FINALIZED'];
      return approvedStatuses.includes(currentStatus);
    });
    
    if (!hasApprovedTxDk) return false;
    
    // 4. Có ít nhất 1 sinh viên mà điểm thi chưa bị lock
    return students.some(student => {
      const gradeStatus = gradeStatuses[student.id];
      if (!gradeStatus) return true; // Chưa có status = chưa lock
      
      // Check finalLocked
      let lockStatus = gradeStatus?.lockStatus;
      if (typeof lockStatus === 'string') {
        try {
          lockStatus = JSON.parse(lockStatus);
        } catch (e) {
          return true;
        }
      }
      
      return lockStatus?.finalLocked !== true;
    });
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
              {/* Header với nút Import */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '15px',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <h3 style={{ margin: 0, color: '#495057' }}>
                  📝 Nhập điểm môn: {selectedSubjectInfo?.params?.subjectName || selectedSubject} 
                  ({selectedSubjectInfo?.params?.credits || 2} tín chỉ)
                </h3>
                
                {/* Nút Import điểm thi - Hiển thị khi đã chọn môn và điểm thi chưa lock */}
                {canShowImportButton() && (
                  <button
                    onClick={() => setShowImportModal(true)}
                    disabled={loading}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: loading ? '#6c757d' : '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    📥 Import điểm thi
                  </button>
                )}
              </div>
              
              {students.length > 0 && !students.some(s => grades[s.id]?.gradeId) && (
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
          {students.some(s => gradeStatuses[s.id]?.gradeStatus === 'PENDING_REVIEW') && (
                <button 
                  onClick={bulkApproveGrades}
                  disabled={loading}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: loading ? '#6c757d' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease',
                    opacity: loading ? 0.7 : 1
                  }}
                  title="Duyệt tất cả điểm đang chờ duyệt"
                >
                  {loading ? '⏳ Đang xử lý...' : '✅ Duyệt tất cả điểm TX,ĐK'}
                </button>
              )}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ color: '#6c757d' }}>Đang tải danh sách sinh viên...</div>
            </div>
          ) : students.length > 0 ? (
            <>
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
                    <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center', minWidth: '140px' }}>
                      Trạng thái điểm
                    </th>
                    <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center', minWidth: '120px' }}>
                      Trạng thái SV
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
                    <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center', minWidth: '120px' }}>
                      Thao tác
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
                                disabled={isFieldLocked(student.id, 'txScore')}
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
                                  backgroundColor: isFieldLocked(student.id, 'txScore') ? '#f8f9fa' : 'white',
                                  cursor: isFieldLocked(student.id, 'txScore') ? 'not-allowed' : 'text',
                                  color: isFieldLocked(student.id, 'txScore') ? '#6c757d' : 'inherit'
                                }}
                                title={isFieldLocked(student.id, 'txScore') ? '🔒 Điểm TX đã khóa - Dùng nút Mở khóa nếu cần sửa' : "Nhập điểm thường xuyên"}
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
                                disabled={isFieldLocked(student.id, 'dkScore')}
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
                                  backgroundColor: isFieldLocked(student.id, 'dkScore') ? '#f8f9fa' : 'white',
                                  cursor: isFieldLocked(student.id, 'dkScore') ? 'not-allowed' : 'text',
                                  color: isFieldLocked(student.id, 'dkScore') ? '#6c757d' : 'inherit'
                                }}
                                title={isFieldLocked(student.id, 'dkScore') ? '🔒 Điểm ĐK đã khóa - Dùng nút Mở khóa nếu cần sửa' : "Nhập điểm định kỳ"}
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
                            disabled={isTbktFailed || isFieldLocked(student.id, 'finalScore')}
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
                              backgroundColor: (isTbktFailed || isFieldLocked(student.id, 'finalScore')) ? '#f8f9fa' : 'white',
                              cursor: (isTbktFailed || isFieldLocked(student.id, 'finalScore')) ? 'not-allowed' : 'text',
                              color: isFieldLocked(student.id, 'finalScore') ? '#6c757d' : 'inherit'
                            }}
                            title={
                              isTbktFailed 
                                ? 'Không thể nhập điểm thi do TBKT < 5' 
                                : (() => {
                                    const status = gradeStatuses[student.id];
                                    if (!status) return 'Nhập điểm thi cuối kỳ';
                                    
                                    const currentStatus = status.gradeStatus;
                                    const isTxDkApproved = currentStatus === 'APPROVED_TX_DK' || 
                                                          currentStatus === 'FINAL_ENTERED' || 
                                                          currentStatus === 'FINALIZED';
                                    
                                    if (!isTxDkApproved) {
                                      return '🔒 Phải duyệt TX/ĐK trước khi nhập điểm thi';
                                    }
                                    
                                    let lockStatus = status.lockStatus;
                                    if (typeof lockStatus === 'string') {
                                      try { lockStatus = JSON.parse(lockStatus); } catch (e) {}
                                    }
                                    
                                    if (lockStatus?.finalLocked === true) {
                                      return '🔒 Điểm thi đã chốt - Dùng nút Mở khóa nếu cần sửa';
                                    }
                                    
                                    return 'Nhập điểm thi cuối kỳ';
                                  })()
                            }
                            key={`final-${student.id}-${gradeStatuses[student.id]?.gradeStatus || 'none'}`}
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
                        
                        {/* Trạng thái điểm - Grade Status Badge */}
                        <td style={{ padding: '5px', border: '1px solid #dee2e6', textAlign: 'center', verticalAlign: 'middle' }}>
                          {gradeStatuses[student.id] ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                backgroundColor: getStatusColor(gradeStatuses[student.id].gradeStatus),
                                color: 'white',
                                whiteSpace: 'nowrap'
                              }}>
                                {getStatusText(gradeStatuses[student.id].gradeStatus)}
                              </span>
                              
                              {/* Lock indicators */}
                              <div style={{ display: 'flex', gap: '4px', fontSize: '10px' }}>
                                {isFieldLocked(student.id, 'txScore') && (
                                  <span title="TX đã khóa" style={{ color: '#dc3545' }}>🔒TX</span>
                                )}
                                {isFieldLocked(student.id, 'dkScore') && (
                                  <span title="ĐK đã khóa" style={{ color: '#dc3545' }}>🔒ĐK</span>
                                )}
                                {isFieldLocked(student.id, 'finalScore') && (
                                  <span title="Final đã khóa" style={{ color: '#dc3545' }}>🔒Final</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span style={{ 
                              fontSize: '11px', 
                              color: '#6c757d',
                              padding: '4px 8px',
                              backgroundColor: '#f8f9fa',
                              borderRadius: '12px'
                            }}>
                              Bản nháp
                            </span>
                          )}
                        </td>
                        
                        {/* Trạng thái SV */}
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
                            gradeStatus={gradeStatuses[student.id]} // ✅ Truyền gradeStatus để check approval
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
                        </td>

                        {/* Thao tác */}
                        <td style={{ padding: '5px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
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
                                      whiteSpace: 'nowrap',
                                      margin: '0 auto'
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
           {/* Nút lưu điểm */}
          <div style={{ 
            marginTop: '20px', 
            textAlign: 'center',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            border: '1px solid #dee2e6',
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            alignItems: 'center'
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
                fontWeight: 'bold'
              }}
            >
              {loading ? '⏳ Đang lưu...' : '💾 Lưu điểm'}
            </button>

            

            {/* Nút Chốt điểm thi tất cả - Chỉ hiển thị khi có sinh viên có finalScore ĐÃ LƯU VÀO DB và chưa lock */}
            {students.some(s => {
              const studentGrade = grades[s.id];
              const gradeStatus = gradeStatuses[s.id];
              
              // 1️⃣ Check có finalScore trong local state (UI)
              if (!studentGrade?.finalScore) return false;
              
              // 2️⃣ Check đã lưu vào DB (có gradeId)
              if (!gradeStatus?.gradeId) return false;
              
              // 3️⃣ ✅ QUAN TRỌNG: Check finalScore ĐÃ LƯU VÀO DB
              // Nếu gradeStatus không có finalScore → điểm thi chưa được lưu
              // Chỉ khi nào gradeStatus.finalScore có giá trị → mới cho phép chốt
              const finalScoreInDb = gradeStatus.finalScore;
              if (!finalScoreInDb || finalScoreInDb === null || finalScoreInDb === '') {
                return false; // Điểm thi chưa lưu vào DB
              }
              
              // 4️⃣ Check finalLocked = false
              let lockStatus = gradeStatus?.lockStatus;
              if (typeof lockStatus === 'string') {
                try {
                  lockStatus = JSON.parse(lockStatus);
                } catch (e) {
                  return true; // Parse error = chưa lock
                }
              }
              
              return lockStatus?.finalLocked !== true;
            }) && (
              <button
                onClick={handleBulkLockFinalScore}
                disabled={processingAction}
                style={{
                  padding: '12px 30px',
                  backgroundColor: processingAction ? '#6c757d' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: processingAction ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
                title="Chốt điểm thi cho tất cả sinh viên có điểm thi và chưa chốt"
              >
                {processingAction ? '⏳ Đang chốt...' : ' Chốt điểm thi tất cả'}
              </button>
            )}
          </div>
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

          {/* Legend - Hướng dẫn sử dụng */}
          <div style={{
            marginTop: '10px',
            padding: '12px',
            backgroundColor: '#e7f3ff',
            border: '1px solid #0d6efd',
            borderRadius: '5px',
            fontSize: '13px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#0d6efd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📌 Hướng dẫn nhập điểm:</span>
              
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

      {/* Modal Import điểm thi */}
      {showImportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#333' }}>📥 Import Điểm Thi</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportResult(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            {/* Hướng dẫn */}
            <div style={{
              backgroundColor: '#e7f3ff',
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '20px',
              border: '1px solid #b3d9ff'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>📋 Hướng dẫn:</h4>
              <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                <li>Tải file template Excel (.xlsx) mẫu</li>
                <li>Điền điểm thi vào cột "Điểm thi" (0-10)</li>
                <li>Lưu file (giữ nguyên .xlsx hoặc lưu thành .csv)</li>
                <li>Chọn file và click "Thực hiện Import"</li>
                <li>Nhấn "💾 Lưu điểm" để lưu vào hệ thống</li>
              </ol>
              <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', fontSize: '13px' }}>
                <strong>💡 Lưu ý:</strong> Hỗ trợ định dạng <strong>.xlsx, .xls, .csv</strong>
              </div>
            </div>

            {/* Nút tải template */}
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={downloadImportTemplate}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  width: '100%'
                }}
              >
                📥 Tải Template Excel
              </button>
            </div>

            {/* File input */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                color: '#333'
              }}>
                Chọn file Excel hoặc CSV để import:
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportFileSelect}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px dashed #ccc',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              />
              {importFile && (
                <div style={{ marginTop: '8px', fontSize: '14px', color: '#28a745' }}>
                  ✅ Đã chọn: {importFile.name}
                </div>
              )}
            </div>

            {/* Import result */}
            {importResult && (
              <div style={{
                padding: '15px',
                borderRadius: '6px',
                marginBottom: '20px',
                backgroundColor: importResult.success ? '#d4edda' : '#f8d7da',
                border: `1px solid ${importResult.success ? '#c3e6cb' : '#f5c6cb'}`,
                color: importResult.success ? '#155724' : '#721c24'
              }}>
                {importResult.success ? (
                  <>
                    <strong>✅ Import thành công!</strong>
                    <div style={{ marginTop: '10px', fontSize: '14px' }}>
                      📊 Tổng: {importResult.total} dòng<br/>
                      ✅ Hợp lệ: {importResult.successCount}<br/>
                      📥 Đã áp dụng: {importResult.appliedCount}<br/>
                      ❌ Lỗi: {importResult.errorCount}
                    </div>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div style={{ marginTop: '10px', fontSize: '12px' }}>
                        <strong>Lỗi:</strong>
                        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                          {importResult.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <strong>❌ Lỗi import!</strong>
                    <div style={{ marginTop: '8px', fontSize: '14px' }}>
                      {importResult.error}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleImportFinalScores}
                disabled={!importFile || importing}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: !importFile || importing ? '#6c757d' : '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: !importFile || importing ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                {importing ? '⏳ Đang xử lý...' : '🚀 Thực hiện Import'}
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportResult(null);
                }}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Đóng
              </button>
            </div>

            {/* Lưu ý */}
            <div style={{
              marginTop: '20px',
              padding: '12px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#856404'
            }}>
              <strong>⚠️ Lưu ý:</strong>
              <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
                <li>Sau khi import, dữ liệu sẽ hiển thị trong bảng nhập điểm</li>
                <li>Bạn cần nhấn nút "💾 Lưu điểm" để lưu vào database</li>
                <li>Điểm thi phải từ 0 đến 10</li>
                <li>File CSV phải có 3 cột: MSSV, Họ và tên, Điểm thi</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeEntryPage;