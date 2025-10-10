/**
 * RetakeHelper - Utility functions để hỗ trợ thi lại/học lại trong Grade Entry Component
 */

// Business rules cho thi lại và học lại
export const RETAKE_RULES = {
  RETAKE_COURSE: {
    condition: (tbktScore) => tbktScore !== null && tbktScore < 5,
    description: 'TBKT < 5.0 → Phải học lại toàn bộ môn',
    action: 'Tạo enrollment mới, nhập lại tất cả điểm TX, DK, Thi',
    severity: 'HIGH'
  },
  RETAKE_EXAM: {
    condition: (tbktScore, finalScore, tbmhScore) => {
      return (
        (tbktScore >= 5 && finalScore !== null && finalScore < 5) ||
        (tbktScore >= 5 && tbmhScore !== null && tbmhScore < 5)
      );
    },
    description: 'TBKT ≥ 5 nhưng điểm thi < 5 hoặc TBMH < 5 → Thi lại',
    action: 'Giữ nguyên TX, DK, TBKT - chỉ thi lại cuối kỳ',
    severity: 'MEDIUM'
  }
};

/**
 * Phân tích trạng thái điểm và đưa ra gợi ý
 */
export const analyzeGradeStatus = (gradeData) => {
  const { tbktScore, finalScore, tbmhScore, attemptNumber = 1 } = gradeData;
  
  // Rule 1: TBKT < 5 → Học lại
  if (RETAKE_RULES.RETAKE_COURSE.condition(tbktScore)) {
    return {
      needsAction: true,
      actionType: 'RETAKE_COURSE',
      reason: `TBKT = ${tbktScore} < 5.0`,
      description: RETAKE_RULES.RETAKE_COURSE.description,
      action: RETAKE_RULES.RETAKE_COURSE.action,
      severity: RETAKE_RULES.RETAKE_COURSE.severity,
      canTakeExam: false,
      showRetakeButton: true,
      buttonText: '🔄 Tạo học lại',
      buttonColor: '#dc3545'
    };
  }
  
  // Rule 2: Thi lại
  if (RETAKE_RULES.RETAKE_EXAM.condition(tbktScore, finalScore, tbmhScore)) {
    return {
      needsAction: true,
      actionType: 'RETAKE_EXAM',
      reason: finalScore < 5 ? `Điểm thi = ${finalScore} < 5.0` : `TBMH = ${tbmhScore} < 5.0`,
      description: RETAKE_RULES.RETAKE_EXAM.description,
      action: RETAKE_RULES.RETAKE_EXAM.action,
      severity: RETAKE_RULES.RETAKE_EXAM.severity,
      canTakeExam: false,
      showRetakeButton: true,
      buttonText: '📝 Tạo thi lại',
      buttonColor: '#ffc107'
    };
  }
  
  // Rule 3: Đạt
  if (tbmhScore >= 5) {
    return {
      needsAction: false,
      actionType: 'PASS',
      reason: `Đạt môn: TBMH = ${tbmhScore} ≥ 5.0`,
      description: 'Sinh viên đã đạt môn học',
      severity: 'NONE',
      canTakeExam: true,
      showRetakeButton: false,
      isPassed: true
    };
  }
  
  // Rule 4: Chưa có đủ điểm
  return {
    needsAction: false,
    actionType: 'PENDING',
    reason: 'Chưa có đủ điểm để đánh giá',
    description: 'Sinh viên chưa hoàn thành đủ điểm',
    severity: 'NONE',
    canTakeExam: true,
    showRetakeButton: false,
    isPending: true
  };
};

/**
 * Gọi API để tạo đăng ký thi lại/học lại
 */
export const createRetakeRegistration = async (gradeId, studentId, subjectId, actionType, reason) => {
  try {
    const endpoint = actionType === 'RETAKE_COURSE' 
      ? '/api/retake-management/create-course'
      : '/api/retake-management/create-exam';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        originalGradeId: gradeId,
        studentId,
        subjectId,
        reason,
        semester: 'HK1', // Có thể động hoá
        academicYear: '2024-25' // Có thể động hoá
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Lỗi không xác định từ server');
    }

    return result;
    
  } catch (error) {
    console.error('Error creating retake registration:', error);
    throw error;
  }
};

/**
 * Lấy lịch sử thi lại/học lại của sinh viên
 */
export const getRetakeHistory = async (studentId, subjectId) => {
  try {
    const response = await fetch(`/api/retake-management/history/${studentId}/${subjectId}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Lỗi không xác định từ server');
    }

    return result.data;
    
  } catch (error) {
    console.error('Error getting retake history:', error);
    throw error;
  }
};

/**
 * Utility function để tính toán style cho status badge
 */
export const getRetakeStatusStyle = (analysis) => {
  if (!analysis.needsAction) {
    if (analysis.isPassed) {
      return {
        style: {
          padding: '4px 8px',
          backgroundColor: '#d4edda',
          color: '#155724',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold'
        },
        text: '✅ Đạt'
      };
    }
    return null;
  }

  const colors = {
    HIGH: { bg: '#f8d7da', color: '#721c24', icon: '🚨' },
    MEDIUM: { bg: '#fff3cd', color: '#856404', icon: '⚠️' },
    LOW: { bg: '#d1ecf1', color: '#0c5460', icon: 'ℹ️' }
  };

  const styleConfig = colors[analysis.severity] || colors.LOW;

  return {
    style: {
      padding: '4px 8px',
      backgroundColor: styleConfig.bg,
      color: styleConfig.color,
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'bold',
      display: 'inline-block',
      marginBottom: '4px'
    },
    text: `${styleConfig.icon} ${analysis.actionType === 'RETAKE_COURSE' ? 'Học lại' : 'Thi lại'}`
  };
};

/**
 * Utility function để tính toán style cho action button
 */
export const getRetakeButtonStyle = (analysis, loading = false) => {
  if (!analysis.showRetakeButton) return null;

  return {
    style: {
      padding: '6px 12px',
      backgroundColor: loading ? '#6c757d' : analysis.buttonColor,
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '12px',
      cursor: loading ? 'not-allowed' : 'pointer',
      marginTop: '4px'
    },
    text: loading ? '⏳ Đang tạo...' : analysis.buttonText
  };
};

/**
 * Utility function để lấy thông tin chi tiết retake
 */
export const getRetakeInfoData = (analysis) => {
  if (!analysis.needsAction) return null;

  return {
    reason: analysis.reason,
    action: analysis.action,
    description: analysis.description
  };
};