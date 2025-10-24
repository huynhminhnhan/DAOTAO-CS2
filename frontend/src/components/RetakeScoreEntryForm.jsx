import React, { useState } from 'react';

/**
 * Retake Score Entry Form Component
 * Form nhập điểm cho lần thi lại/học lại cụ thể
 */
const RetakeScoreEntryForm = ({ 
  retakeRecord, 
  onScoreSubmit, 
  onCancel,
  loading = false 
}) => {
  const [scores, setScores] = useState({
    txScore: retakeRecord?.retakeTxScore || {},
    dkScore: retakeRecord?.retakeDkScore || {},
    finalScore: retakeRecord?.retakeFinalScore || ''
  });
  
  const [errors, setErrors] = useState({});
  
  const isRetakeExam = retakeRecord?.retakeType === 'RETAKE_EXAM';
  const isRetakeCourse = retakeRecord?.retakeType === 'RETAKE_COURSE';
  
  // Helper để validate điểm
  const validateScore = (value) => {
    if (value === '' || value === null || value === undefined) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 && num <= 10;
  };
  
  const handleTxScoreChange = (key, value) => {
    if (!validateScore(value)) {
      setErrors(prev => ({ ...prev, [key]: 'Điểm phải từ 0-10' }));
      return;
    }
    
    setErrors(prev => ({ ...prev, [key]: null }));
    setScores(prev => ({
      ...prev,
      txScore: { ...prev.txScore, [key]: value }
    }));
  };
  
  const handleDkScoreChange = (key, value) => {
    if (!validateScore(value)) {
      setErrors(prev => ({ ...prev, [key]: 'Điểm phải từ 0-10' }));
      return;
    }
    
    setErrors(prev => ({ ...prev, [key]: null }));
    setScores(prev => ({
      ...prev,
      dkScore: { ...prev.dkScore, [key]: value }
    }));
  };
  
  const handleFinalScoreChange = (value) => {
    if (!validateScore(value)) {
      setErrors(prev => ({ ...prev, finalScore: 'Điểm phải từ 0-10' }));
      return;
    }
    
    setErrors(prev => ({ ...prev, finalScore: null }));
    setScores(prev => ({ ...prev, finalScore: value }));
  };
  
  const handleSubmit = () => {
    // Validate dựa trên retake type
    const newErrors = {};
    
    if (isRetakeCourse) {
      // Học lại: cần TX và DK
      if (!Object.keys(scores.txScore).length || !Object.values(scores.txScore).some(v => v !== '')) {
        newErrors.txScore = 'Vui lòng nhập ít nhất một điểm TX';
      }
      if (!Object.keys(scores.dkScore).length || !Object.values(scores.dkScore).some(v => v !== '')) {
        newErrors.dkScore = 'Vui lòng nhập ít nhất một điểm DK';
      }
    }
    
    if (isRetakeExam) {
      // Thi lại: chỉ cần finalScore
      if (!scores.finalScore || scores.finalScore === '') {
        newErrors.finalScore = 'Vui lòng nhập điểm thi cuối';
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Submit scores
    onScoreSubmit({
      retakeId: retakeRecord.id,
      txScore: isRetakeCourse ? scores.txScore : null,
      dkScore: isRetakeCourse ? scores.dkScore : null,
      finalScore: scores.finalScore || null
    });
  };
  
  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #dee2e6',
      marginTop: '15px'
    }}>
      <h4 style={{ marginBottom: '15px', color: '#495057' }}>
        📝 Nhập điểm cho lần {retakeRecord?.attemptNumber} - {
          isRetakeExam ? 'Thi lại' : 'Học lại'
        }
      </h4>
      
      {/* TX Scores - chỉ hiển thị khi học lại */}
      {isRetakeCourse && (
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
            📊 Điểm TX (Thường xuyên):
          </label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[1, 2, 3].map(i => (
              <div key={`tx${i}`} style={{ minWidth: '100px' }}>
                <label style={{ fontSize: '12px', color: '#666' }}>TX{i}:</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={scores.txScore[`tx${i}`] || ''}
                  onChange={(e) => handleTxScoreChange(`tx${i}`, e.target.value)}
                  placeholder="0-10"
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: errors[`tx${i}`] ? '1px solid #dc3545' : '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
                {errors[`tx${i}`] && (
                  <div style={{ color: '#dc3545', fontSize: '11px' }}>{errors[`tx${i}`]}</div>
                )}
              </div>
            ))}
          </div>
          {errors.txScore && (
            <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>
              {errors.txScore}
            </div>
          )}
        </div>
      )}
      
      {/* DK Scores - chỉ hiển thị khi học lại */}
      {isRetakeCourse && (
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
            📋 Điểm DK (Đánh giá):
          </label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[1, 2, 3].map(i => (
              <div key={`dk${i}`} style={{ minWidth: '100px' }}>
                <label style={{ fontSize: '12px', color: '#666' }}>DK{i}:</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={scores.dkScore[`dk${i}`] || ''}
                  onChange={(e) => handleDkScoreChange(`dk${i}`, e.target.value)}
                  placeholder="0-10"
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: errors[`dk${i}`] ? '1px solid #dc3545' : '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
                {errors[`dk${i}`] && (
                  <div style={{ color: '#dc3545', fontSize: '11px' }}>{errors[`dk${i}`]}</div>
                )}
              </div>
            ))}
          </div>
          {errors.dkScore && (
            <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>
              {errors.dkScore}
            </div>
          )}
        </div>
      )}
      
      {/* Final Score */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
          🎯 Điểm thi cuối:
        </label>
        <input
          type="number"
          min="0"
          max="10"
          step="0.1"
          value={scores.finalScore}
          onChange={(e) => handleFinalScoreChange(e.target.value)}
          placeholder="0-10"
          style={{
            width: '150px',
            padding: '8px',
            border: errors.finalScore ? '1px solid #dc3545' : '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
        {errors.finalScore && (
          <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>
            {errors.finalScore}
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          Hủy
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Đang lưu...' : 'Lưu điểm'}
        </button>
      </div>
      
      {/* Info Box */}
      <div style={{
        marginTop: '15px',
        padding: '10px',
        backgroundColor: '#e7f3ff',
        border: '1px solid #b3d9ff',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#0056b3'
      }}>
        <strong>ℹ️ Lưu ý:</strong>
        <ul style={{ margin: '5px 0 0 15px', padding: 0 }}>
          {isRetakeCourse && (
            <li>Học lại: Cần nhập đầy đủ điểm TX, DK và thi cuối</li>
          )}
          {isRetakeExam && (
            <li>Thi lại: Chỉ nhập điểm thi cuối, giữ nguyên TX và DK</li>
          )}
          <li>Điểm sẽ được tự động tính TBKT và TBMH</li>
          <li>Điểm đạt sẽ được cập nhật vào bảng điểm chính</li>
        </ul>
      </div>
    </div>
  );
};

export default RetakeScoreEntryForm;
