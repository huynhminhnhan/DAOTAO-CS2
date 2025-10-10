import React, { useState, useEffect } from 'react';
import SimpleDatePicker from './SimpleDatePicker.jsx';
import { formatDateToYYYYMMDD } from '../utils/dateHelper.js';

/**
 * Modal cho quản lý thi lại
 * Chỉ cho phép nhập lại điểm thi cuối kỳ, giữ nguyên TX, DK, TBKT
 */
const RetakeExamModal = ({ 
  isOpen, 
  onClose, 
  student, 
  gradeData, 
  subjectId,
  onGradeUpdate 
}) => {
  const [examScore, setExamScore] = useState('');
  const [retakeDate, setRetakeDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // Reset form khi modal mở
  useEffect(() => {
    if (isOpen && gradeData) {
      setExamScore(gradeData.finalScore || '');
      setRetakeDate(new Date()); // Reset về ngày hiện tại
    }
  }, [isOpen, gradeData]);

  // Tính điểm TBMH tự động
  const calculateTBMH = (finalScore) => {
    const tbkt = parseFloat(gradeData.tbktScore) || 0;
    const final = parseFloat(finalScore) || 0;
    
    if (tbkt > 0 && final > 0) {
      // TBMH = (TBKT * 0.3) + (Điểm thi * 0.7)
      return ((tbkt * 0.3) + (final * 0.7)).toFixed(1);
    }
    return '';
  };

  // Xử lý submit điểm thi lại
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const finalScore = parseFloat(examScore);
    if (isNaN(finalScore) || finalScore < 0 || finalScore > 10) {
      alert('Vui lòng nhập điểm thi hợp lệ (0-10)');
      return;
    }

    const tbmhScore = calculateTBMH(finalScore);
    
    if (!confirm(`Xác nhận cập nhật điểm thi lại:\n- Điểm thi: ${finalScore}\n- TBMH mới: ${tbmhScore}`)) {
      return;
    }

    setLoading(true);
    try {
      // Cập nhật điểm vào Grade table (điểm hiển thị chính)
      const updateResponse = await fetch('/admin-api/grades/update-retake-exam', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          gradeId: gradeData.gradeId,
          studentId: student.id,
          subjectId,
          finalScore,
          tbmhScore: parseFloat(tbmhScore),
          attemptNumber: (gradeData.attemptNumber || 1) + 1,
          retakeDate: formatDateToYYYYMMDD(retakeDate) // Format YYYY-MM-DD theo local time
        })
      });

      if (!updateResponse.ok) {
        throw new Error(`HTTP ${updateResponse.status}: ${updateResponse.statusText}`);
      }

      const updateResult = await updateResponse.json();
      
      if (!updateResult.success) {
        throw new Error(updateResult.message || 'Lỗi cập nhật điểm');
      }

      alert('✅ Cập nhật điểm thi lại thành công!');
      
      // Thông báo parent component cập nhật
      if (onGradeUpdate) {
        onGradeUpdate({
          ...gradeData,
          finalScore,
          tbmhScore: parseFloat(tbmhScore),
          attemptNumber: (gradeData.attemptNumber || 1) + 1
        });
      }

      // Đóng modal và reset loading
      setLoading(false);
      onClose();
      
    } catch (error) {
      alert('❌ Lỗi: ' + error.message);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentTBMH = calculateTBMH(examScore);

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
        width: '600px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        position: 'relative',
        overflow: 'visible'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '2px solid #ffc107',
          paddingBottom: '10px'
        }}>
          <h3 style={{ margin: 0, color: '#856404' }}>
            📝 Thi Lại - {student.fullName}
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

        {/* Thông tin hiện tại */}
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#856404' }}>📊 Điểm hiện tại:</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '14px' }}>
            <div><strong>TX:</strong> {
              typeof gradeData.txScore === 'object' && gradeData.txScore ? 
                Object.entries(gradeData.txScore).map(([key, value]) => `${key.toUpperCase()}: ${value || '-'}`).join(', ') || '-' 
                : gradeData.txScore || '-'
            }</div>
            <div><strong>DK:</strong> {
              typeof gradeData.dkScore === 'object' && gradeData.dkScore ? 
                Object.entries(gradeData.dkScore).map(([key, value]) => `${key.toUpperCase()}: ${value || '-'}`).join(', ') || '-' 
                : gradeData.dkScore || '-'
            }</div>
            <div><strong>TBKT:</strong> {gradeData.tbktScore || '-'}</div>
            <div><strong>Thi:</strong> {gradeData.finalScore || '-'}</div>
            <div><strong>TBMH:</strong> {gradeData.tbmhScore || '-'}</div>
            <div><strong>Lần:</strong> {gradeData.attemptNumber || 1}</div>
          </div>
        </div>

        {/* Form nhập điểm thi lại */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Điểm thi cuối kỳ (0-10):
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={examScore}
              onChange={(e) => setExamScore(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ffc107',
                borderRadius: '6px',
                fontSize: '16px'
              }}
              required
            />
          </div>

          {/* Input ngày thi lại */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              📅 Ngày thi lại:
            </label>
            <SimpleDatePicker
              selectedDate={retakeDate}
              onChange={setRetakeDate}
              placeholder="Chọn ngày thi lại"
              style={{
                border: '2px solid #ffc107'
              }}
            />
          </div>

          {/* Hiển thị TBMH tự động tính */}
          {currentTBMH && (
            <div style={{
              backgroundColor: '#d1ecf1',
              border: '1px solid #bee5eb',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '20px'
            }}>
              <strong>📈 TBMH mới sẽ là: {currentTBMH}</strong>
              <div style={{ fontSize: '12px', color: '#0c5460', marginTop: '4px' }}>
                Công thức: (TBKT × 0.3) + (Điểm thi × 0.7) = ({gradeData.tbktScore} × 0.3) + ({examScore} × 0.7) = {currentTBMH}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: loading ? '#6c757d' : '#ffc107',
                color: loading ? 'white' : '#212529',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {loading ? '⏳ Đang lưu...' : '💾 Cập nhật điểm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RetakeExamModal;