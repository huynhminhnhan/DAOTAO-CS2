import React, { useState, useEffect } from 'react';
import SimpleDatePicker from './SimpleDatePicker.jsx';
import { formatDateToYYYYMMDD } from '../utils/dateHelper.js';

/**
 * Modal cho quản lý học lại
 * Cho phép nhập lại toàn bộ điểm: TX, DK, TBKT, Thi, TBMH
 */
const RetakeCourseModal = ({ 
  isOpen, 
  onClose, 
  student, 
  gradeData, 
  subjectId,
  gradeConfig = { txColumns: 1, dkColumns: 1 }, // Thêm gradeConfig
  onGradeUpdate 
}) => {
  const [scores, setScores] = useState({
    txScore: {}, // Object cho nhiều cột TX
    dkScore: {}, // Object cho nhiều cột DK
    finalScore: ''
  });
  const [retakeDate, setRetakeDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // Reset form khi modal mở
  useEffect(() => {
    if (isOpen && gradeData && gradeConfig) {
      // Khởi tạo txScore object theo số cột
      const txScoreObj = {};
      for (let i = 1; i <= gradeConfig.txColumns; i++) {
        const txKey = `tx${i}`;
        if (typeof gradeData.txScore === 'object' && gradeData.txScore) {
          txScoreObj[txKey] = gradeData.txScore[txKey] || '';
        } else {
          // Nếu chỉ có 1 cột và là giá trị đơn
          txScoreObj[txKey] = i === 1 ? (gradeData.txScore || '') : '';
        }
      }

      // Khởi tạo dkScore object theo số cột
      const dkScoreObj = {};
      for (let i = 1; i <= gradeConfig.dkColumns; i++) {
        const dkKey = `dk${i}`;
        if (typeof gradeData.dkScore === 'object' && gradeData.dkScore) {
          dkScoreObj[dkKey] = gradeData.dkScore[dkKey] || '';
        } else {
          // Nếu chỉ có 1 cột và là giá trị đơn
          dkScoreObj[dkKey] = i === 1 ? (gradeData.dkScore || '') : '';
        }
      }

      setScores({
        txScore: txScoreObj,
        dkScore: dkScoreObj,
        finalScore: gradeData.finalScore || ''
      });
      setRetakeDate(new Date()); // Reset về ngày hiện tại
    }
  }, [isOpen, gradeData, gradeConfig]);

  // Tính điểm TBKT tự động
  const calculateTBKT = (txScoreObj, dkScoreObj) => {
    // Tính trung bình TX
    const txValues = Object.values(txScoreObj).filter(v => v !== '' && v != null).map(v => parseFloat(v));
    const avgTx = txValues.length > 0 ? txValues.reduce((sum, val) => sum + val, 0) / txValues.length : 0;
    
    // Tính trung bình DK
    const dkValues = Object.values(dkScoreObj).filter(v => v !== '' && v != null).map(v => parseFloat(v));
    const avgDk = dkValues.length > 0 ? dkValues.reduce((sum, val) => sum + val, 0) / dkValues.length : 0;
    
    if (avgTx > 0 && avgDk > 0) {
      // TBKT = (TX * 0.3) + (DK * 0.7)
      return ((avgTx * 0.3) + (avgDk * 0.7)).toFixed(1);
    }
    return '';
  };

  // Tính điểm TBMH tự động
  const calculateTBMH = (tbktScore, finalScore) => {
    const tbkt = parseFloat(tbktScore) || 0;
    const final = parseFloat(finalScore) || 0;
    
    if (tbkt > 0 && final > 0) {
      // TBMH = (TBKT * 0.3) + (Điểm thi * 0.7)
      return ((tbkt * 0.3) + (final * 0.7)).toFixed(1);
    }
    return '';
  };

  // Xử lý thay đổi điểm
  const handleScoreChange = (field, value, subKey = null) => {
    setScores(prev => {
      if (subKey) {
        // Đối với TX/DK có nhiều cột
        return {
          ...prev,
          [field]: {
            ...prev[field],
            [subKey]: value
          }
        };
      } else {
        // Đối với final score
        return {
          ...prev,
          [field]: value
        };
      }
    });
  };

  // Xử lý submit điểm học lại
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation cho tất cả cột TX
    const txValues = Object.values(scores.txScore).filter(v => v !== '' && v != null);
    for (const txValue of txValues) {
      const tx = parseFloat(txValue);
      if (isNaN(tx) || tx < 0 || tx > 10) {
        alert('Vui lòng nhập tất cả điểm TX hợp lệ (0-10)');
        return;
      }
    }
    
    // Validation cho tất cả cột DK
    const dkValues = Object.values(scores.dkScore).filter(v => v !== '' && v != null);
    for (const dkValue of dkValues) {
      const dk = parseFloat(dkValue);
      if (isNaN(dk) || dk < 0 || dk > 10) {
        alert('Vui lòng nhập tất cả điểm DK hợp lệ (0-10)');
        return;
      }
    }
    
    const finalScore = parseFloat(scores.finalScore);
    if (isNaN(finalScore) || finalScore < 0 || finalScore > 10) {
      alert('Vui lòng nhập điểm thi hợp lệ (0-10)');
      return;
    }

    // Kiểm tra phải có ít nhất 1 điểm TX và 1 điểm DK
    if (txValues.length === 0) {
      alert('Vui lòng nhập ít nhất 1 điểm TX');
      return;
    }
    if (dkValues.length === 0) {
      alert('Vui lòng nhập ít nhất 1 điểm DK');
      return;
    }

    const tbktScore = calculateTBKT(scores.txScore, scores.dkScore);
    const tbmhScore = calculateTBMH(tbktScore, scores.finalScore);
    
    // Hiển thị thông tin xác nhận
    const txSummary = Object.entries(scores.txScore).filter(([k,v]) => v !== '' && v != null).map(([k,v]) => `${k.toUpperCase()}: ${v}`).join(', ');
    const dkSummary = Object.entries(scores.dkScore).filter(([k,v]) => v !== '' && v != null).map(([k,v]) => `${k.toUpperCase()}: ${v}`).join(', ');
    
    if (!confirm(`Xác nhận cập nhật điểm học lại:\n- TX: ${txSummary}\n- DK: ${dkSummary}\n- TBKT: ${tbktScore}\n- Thi: ${finalScore}\n- TBMH: ${tbmhScore}`)) {
      return;
    }

    setLoading(true);
    try {
      // Cập nhật điểm vào Grade table (điểm hiển thị chính)
      const updateResponse = await fetch('/admin-api/grades/update-retake-course', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          gradeId: gradeData.gradeId,
          studentId: student.id,
          subjectId,
          txScore: scores.txScore, // Gửi object
          dkScore: scores.dkScore, // Gửi object
          tbktScore: parseFloat(tbktScore),
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

      alert('✅ Cập nhật điểm học lại thành công!');
      
      // Thông báo parent component cập nhật
      if (onGradeUpdate) {
        onGradeUpdate({
          ...gradeData,
          txScore: scores.txScore, // Gửi object
          dkScore: scores.dkScore, // Gửi object
          tbktScore: parseFloat(tbktScore),
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

  const currentTBKT = calculateTBKT(scores.txScore, scores.dkScore);
  const currentTBMH = calculateTBMH(currentTBKT, scores.finalScore);

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
        width: '700px',
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
          borderBottom: '2px solid #dc3545',
          paddingBottom: '10px'
        }}>
          <h3 style={{ margin: 0, color: '#721c24' }}>
            🔄 Học Lại - {student.fullName}
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
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#721c24' }}>📊 Điểm hiện tại:</h4>
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

        {/* Form nhập điểm học lại */}
        <form onSubmit={handleSubmit}>
          {/* Điểm TX - Dynamic columns */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Điểm TX (0-10):
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gradeConfig.txColumns}, 1fr)`, gap: '12px' }}>
              {Array.from({ length: gradeConfig.txColumns }, (_, i) => {
                const txKey = `tx${i + 1}`;
                return (
                  <div key={txKey}>
                    <label style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px', display: 'block' }}>
                      {txKey.toUpperCase()}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={scores.txScore[txKey] || ''}
                      onChange={(e) => handleScoreChange('txScore', e.target.value, txKey)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '2px solid #dc3545',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Điểm DK - Dynamic columns */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Điểm DK (0-10):
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gradeConfig.dkColumns}, 1fr)`, gap: '12px' }}>
              {Array.from({ length: gradeConfig.dkColumns }, (_, i) => {
                const dkKey = `dk${i + 1}`;
                return (
                  <div key={dkKey}>
                    <label style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px', display: 'block' }}>
                      {dkKey.toUpperCase()}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={scores.dkScore[dkKey] || ''}
                      onChange={(e) => handleScoreChange('dkScore', e.target.value, dkKey)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '2px solid #dc3545',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Điểm Thi */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Điểm thi cuối kỳ (0-10):
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={scores.finalScore}
              onChange={(e) => handleScoreChange('finalScore', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #dc3545',
                borderRadius: '6px',
                fontSize: '16px'
              }}
              required
            />
          </div>

          {/* Input ngày học lại */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              📅 Ngày học lại:
            </label>
            <SimpleDatePicker
              selectedDate={retakeDate}
              onChange={setRetakeDate}
              placeholder="Chọn ngày học lại"
              style={{
                border: '2px solid #dc3545'
              }}
            />
          </div>

          {/* Hiển thị điểm tự động tính */}
          {(currentTBKT || currentTBMH) && (
            <div style={{
              backgroundColor: '#d1ecf1',
              border: '1px solid #bee5eb',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {currentTBKT && (
                  <div>
                    <strong>📈 TBKT mới: {currentTBKT}</strong>
                    <div style={{ fontSize: '12px', color: '#0c5460', marginTop: '4px' }}>
                      (TX × 0.3) + (DK × 0.7) = {currentTBKT}
                    </div>
                  </div>
                )}
                {currentTBMH && (
                  <div>
                    <strong>📊 TBMH mới: {currentTBMH}</strong>
                    <div style={{ fontSize: '12px', color: '#0c5460', marginTop: '4px' }}>
                      (TBKT × 0.3) + (Thi × 0.7) = {currentTBMH}
                    </div>
                  </div>
                )}
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
                backgroundColor: loading ? '#6c757d' : '#dc3545',
                color: 'white',
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

export default RetakeCourseModal;