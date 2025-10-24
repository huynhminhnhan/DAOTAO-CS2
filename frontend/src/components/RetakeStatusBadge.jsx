import React from 'react';

/**
 * RetakeStatusBadge Component
 * Hiển thị trạng thái thi lại/học lại với màu sắc và icon phù hợp
 */
const RetakeStatusBadge = ({ 
  tbktScore, 
  finalScore, 
  attemptNumber = 1, 
  retakeType = null,
  size = 'normal' // 'small', 'normal', 'large'
}) => {
  
  // Logic xác định trạng thái
  const getStatus = () => {
    // Rule 1: TBKT < 5 → Học lại
    if (tbktScore !== null && tbktScore !== undefined && tbktScore !== '' && Number(tbktScore) < 5) {
      return {
        status: 'RETAKE_COURSE',
        text: 'Phải học lại',
        color: '#dc3545', // Đỏ
        bgColor: '#f8d7da',
        icon: '🔄',
        reason: `TBKT = ${tbktScore} < 5.0`
      };
    }
    
    // Rule 2: Điểm thi < 5
    if (finalScore !== null && finalScore !== undefined && finalScore !== '' && Number(finalScore) < 5) {
      if (attemptNumber === 1) {
        return {
          status: 'RETAKE_EXAM',
          text: 'Cần thi lại',
          color: '#ffc107', // Vàng
          bgColor: '#fff3cd',
          icon: '⚠️',
          reason: `Điểm thi = ${finalScore} < 5.0`
        };
      } else {
        return {
          status: 'RETAKE_COURSE',
          text: 'Phải học lại',
          color: '#dc3545', // Đỏ
          bgColor: '#f8d7da',
          icon: '🔄',
          reason: `Thi lại vẫn dưới 5: ${finalScore}`
        };
      }
    }
    
    // Rule 3: Đạt
    const hasScores = (tbktScore !== null && tbktScore !== undefined && tbktScore !== '') || 
                     (finalScore !== null && finalScore !== undefined && finalScore !== '');
    
    if (hasScores) {
      return {
        status: 'PASS',
        text: attemptNumber > 1 ? `Đạt (Lần ${attemptNumber})` : 'Đạt',
        color: '#28a745', // Xanh lá
        bgColor: '#d4edda',
        icon: '✅',
        reason: 'Đạt tất cả yêu cầu'
      };
    }
    
    // Chưa có điểm
    return {
      status: 'PENDING',
      text: 'Chưa có điểm',
      color: '#6c757d', // Xám
      bgColor: '#e2e3e5',
      icon: '⏳',
      reason: 'Chưa nhập điểm'
    };
  };
  
  const statusInfo = getStatus();
  
  // Xác định kích thước
  const sizeConfig = {
    small: {
      fontSize: '10px',
      padding: '2px 6px',
      iconSize: '12px'
    },
    normal: {
      fontSize: '12px',
      padding: '4px 8px',
      iconSize: '14px'
    },
    large: {
      fontSize: '14px',
      padding: '6px 12px',
      iconSize: '16px'
    }
  };
  
  const config = sizeConfig[size] || sizeConfig.normal;
  
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: config.padding,
        fontSize: config.fontSize,
        fontWeight: 'bold',
        color: statusInfo.color,
        backgroundColor: statusInfo.bgColor,
        border: `1px solid ${statusInfo.color}`,
        borderRadius: '12px',
        whiteSpace: 'nowrap',
        cursor: 'help'
      }}
      title={statusInfo.reason}
    >
      <span style={{ fontSize: config.iconSize }}>
        {statusInfo.icon}
      </span>
      <span>
        {statusInfo.text}
      </span>
    </span>
  );
};

export default RetakeStatusBadge;
