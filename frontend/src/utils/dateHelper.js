/**
 * Helper function để format Date object thành YYYY-MM-DD
 * Sử dụng local time (không bị ảnh hưởng timezone)
 * 
 * @param {Date} date - Date object cần format
 * @returns {string} - String YYYY-MM-DD
 * 
 * @example
 * const date = new Date('2025-09-04'); // Local time
 * formatDateToYYYYMMDD(date); // '2025-09-04' (không bị giảm 1 ngày do UTC)
 */
export const formatDateToYYYYMMDD = (date) => {
  if (!date || !(date instanceof Date)) {
    return null;
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Helper function để format date string sang dd/mm/yyyy (Vietnamese format)
 * 
 * @param {string|Date} dateInput - Date string hoặc Date object
 * @returns {string} - String dd/mm/yyyy
 */
export const formatDateToDDMMYYYY = (dateInput) => {
  if (!dateInput) return '-';
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    if (isNaN(date.getTime())) {
      return '-';
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

/**
 * Helper function để parse date string YYYY-MM-DD thành Date object (local time)
 * 
 * @param {string} dateString - Date string YYYY-MM-DD
 * @returns {Date} - Date object với local time
 */
export const parseDateFromYYYYMMDD = (dateString) => {
  if (!dateString) return null;
  
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // Local time
};

export default {
  formatDateToYYYYMMDD,
  formatDateToDDMMYYYY,
  parseDateFromYYYYMMDD
};
