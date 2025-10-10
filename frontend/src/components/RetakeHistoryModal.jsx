import React, { useState } from 'react';
import { getRetakeHistory } from '../utils/retakeHelper.js';

/**
 * Helper function để format score display
 */
const formatScore = (score) => {
  if (!score) return '-';
  
  // Nếu là object (nhiều cột TX/DK)
  if (typeof score === 'object') {
    const values = Object.entries(score)
      .filter(([key, value]) => value !== null && value !== '' && value !== undefined)
      .map(([key, value]) => `${key.toUpperCase()}: ${value}`);
    return values.length > 0 ? values.join(', ') : '-';
  }
  
  // Nếu là number hoặc string
  return score.toString();
};

/**
 * Helper function để format date an toàn
 */
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('vi-VN');
  } catch (error) {
    return '-';
  }
};

/**
 * Modal hiển thị lịch sử thi lại/học lại
 */
const RetakeHistoryModal = ({ 
  isOpen, 
  onClose, 
  student, 
  subjectId 
}) => {
  const [retakeHistory, setRetakeHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load lịch sử khi modal mở
  React.useEffect(() => {
    if (isOpen && student && subjectId) {
      loadRetakeHistory();
    }
  }, [isOpen, student, subjectId]);

  const loadRetakeHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const history = await getRetakeHistory(student.id, subjectId);
      console.log('📚 Retake History Data:', history); // Debug log
      if (history && history.retakeHistory) {
        console.log('📝 Retake Records:', history.retakeHistory); // Debug log  
      }
      if (history && history.originalGrade) {
        console.log('🎯 Original Grade:', history.originalGrade); // Debug log
        console.log('🗓️ Original Grade CreatedAt:', history.originalGrade.createdAt); // Debug log
      }
      setRetakeHistory(history);
    } catch (error) {
      console.error('Error loading retake history:', error);
      setError('Lỗi tải lịch sử: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        width: '800px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '2px solid #007bff',
          paddingBottom: '10px'
        }}>
          <h3 style={{ margin: 0, color: '#0056b3' }}>
            📚 Lịch sử thi lại/học lại - {student.fullName}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6c757d'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '18px', color: '#6c757d' }}>⏳ Đang tải lịch sử...</div>
          </div>
        ) : error ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px',
            color: '#dc3545',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '6px'
          }}>
            ❌ {error}
          </div>
        ) : retakeHistory ? (
          <div>
            {/* Thông tin tổng quan */}
            <div style={{
              backgroundColor: '#e7f3ff',
              border: '1px solid #b3d7ff',
              borderRadius: '6px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#0056b3' }}>
                📊 Tổng quan
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <strong>Sinh viên:</strong> {student.studentCode} - {student.fullName}
                </div>
                <div>
                  <strong>Số lần học lại/thi lại:</strong> {
                    retakeHistory.retakeHistory 
                      ? retakeHistory.retakeHistory.filter(r => !r.retakeReason?.includes('[\u0110I\u1ec2M G\u1ed0C]')).length 
                      : 0
                  } lần
                </div>
              </div>
            </div>


            {/* Lịch sử các lần thi/học lại */}
            {retakeHistory.retakeHistory && retakeHistory.retakeHistory.length > 0 ? (
              <div>
                <h5 style={{ margin: '0 0 16px 0', color: '#495057' }}>
                  🔄 Lịch sử thi lại/học lại ({
                    retakeHistory.retakeHistory.filter(r => !r.retakeReason?.includes('[\u0110I\u1ec2M G\u1ed0C]')).length
                  } lần)
                </h5>
                {retakeHistory.retakeHistory.map((retake, index) => {
                  // Kiểm tra xem có phải điểm gốc không (dựa vào retakeReason)
                  const isOriginalGrade = retake.retakeReason && retake.retakeReason.includes('[ĐIỂM GỐC]');
                  
                  return (
                  <div 
                    key={retake.id} 
                    style={{
                      backgroundColor: retake.isCurrent ? '#d1ecf1' : '#ffffff',
                      border: retake.isCurrent ? '2px solid #bee5eb' : '1px solid #dee2e6',
                      borderRadius: '6px',
                      padding: '16px',
                      marginBottom: '12px'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}>
                      <h6 style={{ margin: 0, color: '#495057' }}>
                        {isOriginalGrade ? (
                          <span>🎯 Điểm gốc ({retake.retakeType === 'RETAKE_COURSE' ? 'Khiến phải học lại' : 'Khiến phải thi lại'})</span>
                        ) : (
                          <span>
                            {retake.retakeType === 'RETAKE_COURSE' ? '🔄 Học lại' : '📝 Thi lại'} - Lần thứ {
                              retakeHistory.retakeHistory
                                .slice(0, index)
                                .filter(r => !r.retakeReason?.includes('[\u0110I\u1ec2M G\u1ed0C]')).length + 1
                            }
                            {retake.isCurrent && <span style={{ color: '#0c5460', marginLeft: '8px' }}>⭐ Điểm hiện tại</span>}
                          </span>
                        )}
                      </h6>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: retake.resultStatus === 'PASS' ? '#d4edda' : 
                                        retake.resultStatus === 'PENDING' ? '#fff3cd' : '#f8d7da',
                        color: retake.resultStatus === 'PASS' ? '#155724' :
                               retake.resultStatus === 'PENDING' ? '#856404' : '#721c24'
                      }}>
                        {retake.resultStatus === 'PASS' ? '✅ Đạt' :
                         retake.resultStatus === 'PENDING' ? '⏳ Chờ' : '❌ Chưa đạt'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', fontSize: '14px' }}>
                      <div><strong>TX:</strong> {formatScore(retake.txScore)}</div>
                      <div><strong>DK:</strong> {formatScore(retake.dkScore)}</div>
                      <div><strong>TBKT:</strong> {retake.tbktScore || '-'}</div>
                      <div><strong>Thi:</strong> {retake.finalScore || '-'}</div>
                      <div><strong>TBMH:</strong> {retake.tbmhScore || '-'}</div>
                    </div>

                    <div style={{ marginTop: '12px', fontSize: '12px', color: '#6c757d' }}>
                      <div><strong>Lý do:</strong> {retake.retakeReason}</div>
                      <div><strong>Học kỳ:</strong> {retake.semester} {retake.academicYear}</div>
                      <div>
                        <strong>Ngày {retake.retakeType === 'RETAKE_COURSE' ? 'học lại' : 'thi lại'}:</strong>{' '}
                        {retake.completed_at ? formatDate(retake.completed_at) : '-'}
                      </div>
                      <div><strong>Ngày tạo:</strong> {formatDate(retake.createdAt)}</div>
                      
                      {/* Cảnh báo nếu học lại nhưng điểm thi vẫn dưới 5 */}
                      {retake.retakeType === 'RETAKE_COURSE' && retake.resultStatus === 'FAIL_EXAM' && !isOriginalGrade && (
                        <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#dc3545', marginTop: '4px', fontWeight: 'bold' }}>
                          ⚠️ Học lại nhưng điểm thi vẫn dưới trung bình (TBKT đạt nhưng điểm thi dưới 5)
                        </div>
                      )}
                      
                      {/* Cảnh báo nếu học lại nhưng TBKT vẫn dưới 5 */}
                      {retake.retakeType === 'RETAKE_COURSE' && retake.resultStatus === 'FAIL_TBKT' && !isOriginalGrade && (
                        <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#dc3545', marginTop: '4px', fontWeight: 'bold' }}>
                          ⚠️ Học lại nhưng TBKT vẫn dưới trung bình (dưới 5) - Cần học lại tiếp
                        </div>
                      )}
                      
                      {/* Thông báo nếu là kết quả cuối cùng */}
                      {index === retakeHistory.retakeHistory.length - 1 && retake.isCurrent && (
                        <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#007bff', marginTop: '4px' }}>
                          📌 Đây là kết quả cuối cùng và được tính vào bảng điểm chính
                        </div>
                      )}
                    </div>
                  </div>
                );
                })}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#6c757d',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '6px'
              }}>
                ℹ️ Chưa có lịch sử thi lại/học lại
              </div>
            )}
 
           
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
            ℹ️ Không có dữ liệu lịch sử
          </div>
        )}

        {/* Footer */}
        <div style={{ 
          marginTop: '24px', 
          padding: '16px 0', 
          borderTop: '1px solid #dee2e6',
          textAlign: 'right' 
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default RetakeHistoryModal;