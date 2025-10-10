/**
 * API Configuration
 * Centralized API endpoint definitions
 */

// API Base URL
export const API_BASE_URL = '/admin-api';

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    CURRENT_USER: `${API_BASE_URL}/auth/current-user`,
  },
  
  // Teacher Permission endpoints
  TEACHER_PERMISSIONS: {
    MY_COHORTS: `${API_BASE_URL}/teacher-permissions/my-cohorts`,
    MY_CLASSES: (cohortId) => `${API_BASE_URL}/teacher-permissions/my-classes/${cohortId}`,
  },
  
  // Subject endpoints
  SUBJECTS: {
    BY_CLASS: (classId) => `${API_BASE_URL}/subjects/by-class/${classId}`,
  },
  
  // Grade endpoints
  GRADE: {
    ENROLLED_STUDENTS: `${API_BASE_URL}/grade/enrolled-students`,
    SAVE_BULK: `${API_BASE_URL}/grade/save-bulk`,
    STATE: {
      SUBMIT: `${API_BASE_URL}/grade/state/submit`,
      BULK_SUBMIT: `${API_BASE_URL}/grade/state/bulk-submit`,
      APPROVE_TX_DK: `${API_BASE_URL}/grade/state/approve-tx-dk`,
      ENTER_FINAL: `${API_BASE_URL}/grade/state/enter-final`,
      FINALIZE: `${API_BASE_URL}/grade/state/finalize`,
      REJECT: `${API_BASE_URL}/grade/state/reject`,
      UNLOCK: `${API_BASE_URL}/grade/state/unlock`,
      HISTORY: (gradeId) => `${API_BASE_URL}/grade/state/history/${gradeId}`,
      VERSION_HISTORY: (gradeId) => `${API_BASE_URL}/grade/state/version-history/${gradeId}`,
      CHECK: (gradeId) => `${API_BASE_URL}/grade/state/check/${gradeId}`,
    }
  }
};

/**
 * Helper function to build query string
 * @param {Object} params - Query parameters
 * @returns {string} - Query string
 */
export const buildQueryString = (params) => {
  return new URLSearchParams(params).toString();
};

/**
 * Helper function to get full URL with query params
 * @param {string} endpoint - Base endpoint
 * @param {Object} params - Query parameters
 * @returns {string} - Full URL with query string
 */
export const getUrlWithParams = (endpoint, params) => {
  const queryString = buildQueryString(params);
  return queryString ? `${endpoint}?${queryString}` : endpoint;
};
