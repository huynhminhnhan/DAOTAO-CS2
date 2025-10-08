import React, { useState, useEffect } from 'react';
import RetakeScoreEntryForm from './RetakeScoreEntryForm';

/**
 * Enhanced Grade Retake Modal Component
 * Modal hiển thị lịch sử chi tiết và nhập điểm thi lại/học lại
 */
const EnhancedGradeRetakeModal = ({ 
  isOpen, 
  onClose, 
  studentId, 
  studentName, 
  classId, 
  subjectId, 
  onRetakeCreated 
}) => {
  const [detailedHistory, setDetailedHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRetake, setEditingRetake] = useState(null);
  
  // Form data for creating new retake
  const [newRetake, setNewRetake] = useState({
    retakeType: 'EXAM',
    reason: '',
    notes: ''
  });

  // Load detailed retake history when modal opens
  useEffect(() => {
    if (isOpen && studentId) {
      loadDetailedHistory();
    }
  }, [isOpen, studentId]);

  const loadDetailedHistory = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        studentId,
        classId,
        subjectId
      });
      
      const response = await fetch(`/admin-api/retake/detailed-history?${params}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setDetailedHistory(data.data);
      } else {
        throw new Error(data.message || 'Không thể tải lịch sử chi tiết');
      }
    } catch (error) {
      console.error('Error loading detailed history:', error);
      setError('Không thể tải lịch sử: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRetake = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Validate form
      if (!newRetake.retakeType || !newRetake.reason.trim()) {
        throw new Error('Vui lòng điền đầy đủ thông tin bắt buộc');
      }
      
      const retakeData = {
        studentId: parseInt(studentId),
        classId: parseInt(classId),
        subjectId: parseInt(subjectId),
        retakeType: newRetake.retakeType,
        reason: newRetake.reason.trim(),
        notes: newRetake.notes.trim() || null
      };
      
      const response = await fetch('/admin-api/retake/create', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(retakeData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Reset form
        setNewRetake({
          retakeType: 'EXAM',
          reason: '',
          notes: ''
        });
        setShowCreateForm(false);
        
        // Reload detailed history
        await loadDetailedHistory();
        
        // Notify parent component
        if (onRetakeCreated) {
          onRetakeCreated(data.data);
        }
        
        alert('✅ Đã tạo lần thi lại thành công!');
      } else {
        throw new Error(data.message || 'Không thể tạo lần thi lại');
      }
    } catch (error) {
      console.error('Error creating retake:', error);
      setError('Không thể tạo lần thi lại: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handler để submit điểm cho retake
  const handleScoreSubmit = async (scoreData) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/admin-api/retake/submit-scores', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scoreData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Reload history
        await loadDetailedHistory();
        setEditingRetake(null);
        
        // Auto promote if passed
        if (data.data.isPassed) {
          const confirmPromote = window.confirm(
            '🎉 Điểm đã đạt! Bạn có muốn cập nhật vào bảng điểm chính không?'
          );
          if (confirmPromote) {
            await handlePromoteToMain(scoreData.retakeId);
          }
        }
        
        alert('✅ Đã lưu điểm thành công!');
      } else {
        throw new Error(data.message || 'Không thể lưu điểm');
      }
    } catch (error) {
      console.error('Error submitting scores:', error);
      setError('Không thể lưu điểm: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handler để promote điểm lên bảng chính
  const handlePromoteToMain = async (retakeId) => {
    try {
      setLoading(true);
      
      const response = await fetch('/admin-api/retake/promote-to-main', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ retakeId })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        await loadDetailedHistory();
        alert('✅ Đã cập nhật điểm vào bảng chính!');
        
        // Notify parent để refresh bảng điểm chính
        if (onRetakeCreated) {
          onRetakeCreated({ updated: true });
        }
      } else {
        throw new Error(data.message || 'Không thể promote điểm');
      }
    } catch (error) {
      console.error('Error promoting scores:', error);
      setError('Không thể promote điểm: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('vi-VN');
    } catch {
      return dateString;
    }
  };

  const getRetakeTypeLabel = (type) => {
    switch (type) {
      case 'RETAKE_EXAM': return '🔄 Thi lại';
      case 'RETAKE_COURSE': return '📚 Học lại';
      default: return type;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PENDING': return 'Chờ xử lý';
      case 'PASS': return 'Đạt';
      case 'FAIL_EXAM': return 'Trượt thi';
      case 'FAIL_TBKT': return 'Trượt TBKT';
      default: return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return '#ffc107';
      case 'PASS': return '#28a745';
      case 'FAIL_EXAM': return '#dc3545';
      case 'FAIL_TBKT': return '#dc3545';
      default: return '#6c757d';
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
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        width: '900px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #dee2e6',
          paddingBottom: '15px'
        }}>
          <h3 style={{ margin: 0, color: '#495057' }}>
            📋 Lịch sử chi tiết - {studentName}
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

        {/* Error message */}
        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '15px',
            border: '1px solid #f5c6cb'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div>🔄 Đang tải...</div>
          </div>
        )}

        {/* Main Content */}
        {!loading && detailedHistory && (
          <>
            {/* Current Grade Display */}
            {detailedHistory.currentGrade && (
              <div style={{
                backgroundColor: '#d4edda',
                padding: '15px',
                borderRadius: '6px',
                marginBottom: '20px',
                border: '1px solid #c3e6cb'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#155724' }}>
                  🏆 Điểm hiện tại (Đã đạt)
                </h4>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', fontSize: '14px' }}>
                  <span><strong>TX:</strong> {JSON.stringify(detailedHistory.currentGrade.txScore)}</span>
                  <span><strong>DK:</strong> {JSON.stringify(detailedHistory.currentGrade.dkScore)}</span>
                  <span><strong>Thi:</strong> {detailedHistory.currentGrade.finalScore || '-'}</span>
                  <span><strong>TBKT:</strong> {detailedHistory.currentGrade.tbktScore || '-'}</span>
                  <span><strong>TBMH:</strong> {detailedHistory.currentGrade.tbmhScore || '-'}</span>
                  <span><strong>Lần:</strong> {detailedHistory.currentGrade.currentAttempt}</span>
                </div>
              </div>
            )}

            {/* Retake History */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ color: '#495057', margin: 0 }}>
                  📚 Lịch sử các lần thi/học ({detailedHistory.retakeHistory.length} lần)
                </h4>
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  disabled={loading}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: showCreateForm ? '#6c757d' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '13px'
                  }}
                >
                  {showCreateForm ? '❌ Hủy' : '➕ Tạo lần mới'}
                </button>
              </div>
              
              {detailedHistory.retakeHistory.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  color: '#6c757d'
                }}>
                  Chưa có lần thi lại nào
                </div>
              ) : (
                <div style={{ space: '10px' }}>
                  {detailedHistory.retakeHistory.map((retake, index) => (
                    <div key={retake.id} style={{
                      border: '1px solid #dee2e6',
                      borderRadius: '6px',
                      padding: '15px',
                      marginBottom: '10px',
                      backgroundColor: retake.isCurrent ? '#e7f3ff' : '#f8f9fa'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong style={{ color: '#495057' }}>
                          Lần {retake.attemptNumber} - {getRetakeTypeLabel(retake.retakeType)}
                          {retake.isCurrent && <span style={{ color: '#0056b3' }}> (Hiện tại)</span>}
                        </strong>
                        <span style={{
                          backgroundColor: getStatusColor(retake.resultStatus),
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {getStatusLabel(retake.resultStatus)}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '8px' }}>
                        <strong>Lý do:</strong> {retake.retakeReason}
                      </div>
                      
                      {/* Điểm của lần này */}
                      {(retake.retakeTxScore || retake.retakeDkScore || retake.retakeFinalScore) ? (
                        <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                          <strong>Điểm:</strong>
                          {retake.retakeType === 'RETAKE_COURSE' && (
                            <>
                              <span style={{ marginRight: '10px' }}>TX: {JSON.stringify(retake.retakeTxScore || {})}</span>
                              <span style={{ marginRight: '10px' }}>DK: {JSON.stringify(retake.retakeDkScore || {})}</span>
                            </>
                          )}
                          <span style={{ marginRight: '10px' }}>Thi: {retake.retakeFinalScore || '-'}</span>
                          <span style={{ marginRight: '10px' }}>TBKT: {retake.retakeTbktScore || '-'}</span>
                          <span>TBMH: {retake.retakeTbmhScore || '-'}</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '13px', color: '#dc3545', fontStyle: 'italic' }}>
                          Chưa nhập điểm
                        </div>
                      )}
                      
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        Tạo: {formatDate(retake.createdAt)} | 
                        {retake.completedAt && ` Hoàn thành: ${formatDate(retake.completedAt)}`}
                      </div>
                      
                      {/* Action buttons */}
                      <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                        {retake.resultStatus === 'PENDING' && (
                          <button
                            onClick={() => setEditingRetake(retake)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            📝 Nhập điểm
                          </button>
                        )}
                        {retake.isPassed && !retake.isCurrent && (
                          <button
                            onClick={() => handlePromoteToMain(retake.id)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            ⬆️ Áp dụng điểm
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Create New Retake Form */}
        {showCreateForm && (
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            marginBottom: '20px'
          }}>
            <h4 style={{ marginBottom: '15px', color: '#495057' }}>
              ➕ Tạo lần thi lại mới
            </h4>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Loại thi lại: <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                value={newRetake.retakeType}
                onChange={(e) => setNewRetake(prev => ({ ...prev, retakeType: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px'
                }}
              >
                <option value="EXAM">🔄 Thi lại (chỉ thi cuối kỳ)</option>
                <option value="COURSE">📚 Học lại (toàn bộ môn học)</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Lý do: <span style={{ color: 'red' }}>*</span>
              </label>
              <textarea
                value={newRetake.reason}
                onChange={(e) => setNewRetake(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="VD: Điểm TBKT = 4.5 < 5, cần học lại..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateForm(false)}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleCreateRetake}
                disabled={loading || !newRetake.retakeType || !newRetake.reason.trim()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (loading || !newRetake.retakeType || !newRetake.reason.trim()) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Đang tạo...' : 'Tạo lần thi lại'}
              </button>
            </div>
          </div>
        )}

        {/* Score Entry Form */}
        {editingRetake && (
          <RetakeScoreEntryForm
            retakeRecord={editingRetake}
            onScoreSubmit={handleScoreSubmit}
            onCancel={() => setEditingRetake(null)}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};

export default EnhancedGradeRetakeModal;
