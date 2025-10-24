import React, { useState, useEffect } from 'react';
import RetakeScoreEntryForm from './RetakeScoreEntryForm';

/**
 * Grade Retake Modal Component - Enhanced Version
 * Modal hiển thị lịch sử thi lại và nhập điểm chi tiết
 */
const GradeRetakeModal = ({ 
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
      case 'EXAM': return '🔄 Thi lại';
      case 'COURSE': return '📚 Học lại';
      default: return type;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PENDING': return '⏳ Chờ xử lý';
      case 'PASS': return '✅ Đạt';
      case 'FAIL_EXAM': return '❌ Trượt thi';
      case 'FAIL_TBKT': return '❌ Trượt TBKT';
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
        width: '800px',
        maxHeight: '80vh',
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
            📋 Lịch sử thi lại - {studentName}
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
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '15px',
            border: '1px solid #f5c6cb'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Action buttons */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px'
        }}>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: showCreateForm ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {showCreateForm ? '❌ Hủy' : '➕ Tạo lần thi lại mới'}
          </button>
          
          <button
            onClick={loadRetakeHistory}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '⏳ Đang tải...' : '🔄 Làm mới'}
          </button>
        </div>

        {/* Create new retake form */}
        {showCreateForm && (
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '20px',
            border: '1px solid #dee2e6'
          }}>
            <h5 style={{ marginTop: 0, marginBottom: '15px', color: '#495057' }}>
              ➕ Tạo lần thi lại mới
            </h5>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
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
                  <option value="EXAM">🔄 Thi lại (điểm thi)</option>
                  <option value="COURSE">📚 Học lại (toàn môn)</option>
                </select>
              </div>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Lý do: <span style={{ color: 'red' }}>*</span>
              </label>
              <textarea
                value={newRetake.reason}
                onChange={(e) => setNewRetake(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Nhập lý do cần thi lại..."
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
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Ghi chú thêm:
              </label>
              <textarea
                value={newRetake.notes}
                onChange={(e) => setNewRetake(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Ghi chú thêm (tùy chọn)..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <button
              onClick={handleCreateRetake}
              disabled={loading || !newRetake.retakeType || !newRetake.reason.trim()}
              style={{
                padding: '10px 20px',
                backgroundColor: loading || !newRetake.retakeType || !newRetake.reason.trim() ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading || !newRetake.retakeType || !newRetake.reason.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {loading ? '⏳ Đang tạo...' : '✅ Tạo lần thi lại'}
            </button>
          </div>
        )}

        {/* Retake history table */}
        <div>
          <h5 style={{ marginBottom: '15px', color: '#495057' }}>
            📚 Lịch sử thi lại ({retakeHistory.length} lần)
          </h5>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
              ⏳ Đang tải lịch sử...
            </div>
          ) : retakeHistory.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '30px',
              color: '#6c757d',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              border: '1px solid #dee2e6'
            }}>
              📝 Chưa có lịch sử thi lại nào
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #dee2e6',
                fontSize: '13px'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#007bff', color: 'white' }}>
                    <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                      Lần thứ
                    </th>
                    <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                      Loại
                    </th>
                    <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                      Trạng thái
                    </th>
                    <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                      Ngày tạo
                    </th>
                    <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                      Lý do
                    </th>
                    <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                      Ghi chú
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {retakeHistory.map((retake, index) => (
                    <tr key={retake.id || index} style={{ 
                      backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' 
                    }}>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center', fontWeight: 'bold' }}>
                        {retake.attemptNumber}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                        {getRetakeTypeLabel(retake.retakeType)}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: getStatusColor(retake.status) + '20',
                          color: getStatusColor(retake.status),
                          border: `1px solid ${getStatusColor(retake.status)}40`
                        }}>
                          {getStatusLabel(retake.status)}
                        </span>
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                        {formatDate(retake.createdAt)}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>
                        <div style={{ maxWidth: '200px', wordWrap: 'break-word' }}>
                          {retake.retakeReason}
                        </div>
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>
                        <div style={{ maxWidth: '150px', wordWrap: 'break-word' }}>
                          {retake.retakeReason || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '20px',
          paddingTop: '15px',
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
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default GradeRetakeModal;
