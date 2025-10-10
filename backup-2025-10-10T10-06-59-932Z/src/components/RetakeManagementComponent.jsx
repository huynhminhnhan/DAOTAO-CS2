import React, { useState, useEffect } from 'react';
import { 
  analyzeGradeStatus, 
  createRetakeRegistration, 
  getRetakeHistory,
  getRetakeStatusStyle,
  getRetakeButtonStyle,
  getRetakeInfoData
} from '../utils/retakeHelper.js';
import RetakeExamModal from './RetakeExamModal.jsx';
import RetakeCourseModal from './RetakeCourseModal.jsx';
import RetakeHistoryModal from './RetakeHistoryModal.jsx';

/**
 * RetakeStatusBadge - Component hiển thị trạng thái thi lại/học lại
 */
const RetakeStatusBadge = ({ analysis }) => {
  const statusConfig = getRetakeStatusStyle(analysis);
  
  if (!statusConfig) return null;
  
  return (
    <span style={statusConfig.style}>
      {statusConfig.text}
    </span>
  );
};

/**
 * RetakeActionButton - Component nút tạo đăng ký thi lại/học lại
 */
const RetakeActionButton = ({ analysis, gradeId, studentId, subjectId, onRetakeCreated }) => {
  const [loading, setLoading] = useState(false);

  const buttonConfig = getRetakeButtonStyle(analysis, loading);
  if (!buttonConfig) return null;

  const handleCreateRetake = async () => {
    if (!confirm(`Bạn có chắc muốn tạo ${analysis.actionType === 'RETAKE_COURSE' ? 'học lại' : 'thi lại'} cho sinh viên này?`)) {
      return;
    }

    setLoading(true);
    try {
      const result = await createRetakeRegistration(
        gradeId,
        studentId,
        subjectId,
        analysis.actionType,
        analysis.reason
      );

      alert('✅ ' + result.message);
      
      if (onRetakeCreated) {
        onRetakeCreated(result);
      }
      
    } catch (error) {
      alert('❌ Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCreateRetake}
      disabled={loading}
      style={buttonConfig.style}
    >
      {buttonConfig.text}
    </button>
  );
};

/**
 * RetakeManagementComponent - Component quản lý thi lại và học lại
 * Sử dụng trong bảng điểm của GradeEntryPageComponent
 */
const RetakeManagementComponent = ({ 
  student, 
  gradeData, 
  subjectId, 
  gradeConfig = { txColumns: 1, dkColumns: 1 }, // Thêm gradeConfig
  hasExistingGrade = false, // Flag kiểm tra đã có điểm trong DB
  onGradeUpdate,
  showDetails = false 
}) => {
  const [showRetakeExamModal, setShowRetakeExamModal] = useState(false);
  const [showRetakeCourseModal, setShowRetakeCourseModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [hasRetakeHistory, setHasRetakeHistory] = useState(false);
  const [checkingHistory, setCheckingHistory] = useState(false);

  // Kiểm tra xem sinh viên có lịch sử thi lại/học lại không
  useEffect(() => {
    const checkRetakeHistory = async () => {
      if (!student?.id || !subjectId) return;
      
      setCheckingHistory(true);
      try {
        const history = await getRetakeHistory(student.id, subjectId);
        // Có lịch sử nếu có attempt > 1 hoặc có retake records
        const hasHistory = history && (
          history.totalAttempts > 1 || 
          (history.retakeHistory && history.retakeHistory.length > 0)
        );
        setHasRetakeHistory(hasHistory);
      } catch (error) {
        console.error('Error checking retake history:', error);
        setHasRetakeHistory(false);
      } finally {
        setCheckingHistory(false);
      }
    };

    checkRetakeHistory();
  }, [student?.id, subjectId, gradeData?.attemptNumber]);

  // Phân tích trạng thái điểm
  const analysis = analyzeGradeStatus({
    tbktScore: gradeData.tbktScore,
    finalScore: gradeData.finalScore,
    tbmhScore: gradeData.tbmhScore,
    attemptNumber: gradeData.attemptNumber || 1
  });

  // Xử lý mở modal tương ứng
  const handleOpenModal = () => {
    if (analysis.actionType === 'RETAKE_EXAM') {
      setShowRetakeExamModal(true);
    } else if (analysis.actionType === 'RETAKE_COURSE') {
      setShowRetakeCourseModal(true);
    }
  };

  // Xử lý khi cập nhật điểm thành công
  const handleGradeUpdate = (updatedGradeData) => {
    // Notify parent component
    if (onGradeUpdate) {
      onGradeUpdate(updatedGradeData);
    }
  };

  return (
    <div style={{ minWidth: '200px' }}>
      {/* Chú thích cho sinh viên có lịch sử */}
      {hasRetakeHistory && (
        <div style={{
          fontSize: '11px',
          color: '#0c5460',
          fontWeight: 'bold',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          📚 Có lịch sử thi lại/học lại
        </div>
      )}
      
      {/* Status Badge - Chỉ hiển thị khi đã có điểm */}
      {hasExistingGrade && <RetakeStatusBadge analysis={analysis} />}
      
      {/* Action Button - Mở Modal - Chỉ hiển thị khi đã có điểm */}
      {hasExistingGrade && analysis.needsAction && (
        <button
          onClick={handleOpenModal}
          style={{
            padding: '6px 12px',
            backgroundColor: analysis.buttonColor,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            marginTop: '4px',
            display: 'block',
            width: '100%'
          }}
        >
          {analysis.actionType === 'RETAKE_COURSE' ? '🔄 Nhập điểm học lại' : '📝 Nhập điểm thi lại'}
        </button>
      )}
      
      {/* History Button - Hiển thị cho tất cả sinh viên có lịch sử */}
      {hasRetakeHistory && (
        <button
          onClick={() => setShowHistoryModal(true)}
          disabled={checkingHistory}
          style={{
            padding: '4px 8px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: checkingHistory ? 'not-allowed' : 'pointer',
            marginTop: '4px',
            width: '100%'
          }}
        >
          {checkingHistory ? '⏳ Kiểm tra...' : '📚 Xem lịch sử'}
        </button>
      )}
      
      {/* Details Panel */}
      
      {/* Details Panel */}
      {showDetails && (
        <div style={{
          padding: '8px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          fontSize: '12px',
          marginTop: '4px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            📋 Chi tiết:
          </div>
          <div style={{ marginBottom: '2px' }}>
            <strong>Lý do:</strong> {analysis.reason}
          </div>
          <div style={{ marginBottom: '2px' }}>
            <strong>Hành động:</strong> {analysis.action}
          </div>
          <div style={{ color: '#6c757d', fontStyle: 'italic' }}>
            {analysis.description}
          </div>
        </div>
      )}

      {/* Modal cho Thi lại */}
      <RetakeExamModal
        isOpen={showRetakeExamModal}
        onClose={() => setShowRetakeExamModal(false)}
        student={student}
        gradeData={gradeData}
        subjectId={subjectId}
        onGradeUpdate={handleGradeUpdate}
      />

      {/* Modal cho Học lại */}
      <RetakeCourseModal
        isOpen={showRetakeCourseModal}
        onClose={() => setShowRetakeCourseModal(false)}
        student={student}
        gradeData={gradeData}
        gradeConfig={gradeConfig}
        subjectId={subjectId}
        onGradeUpdate={handleGradeUpdate}
      />

      {/* Modal xem lịch sử */}
      <RetakeHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        student={student}
        subjectId={subjectId}
      />
    </div>
  );
};

export default RetakeManagementComponent;