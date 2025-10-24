/**
 * Grade Calculation Helper
 * Các công thức tính điểm dùng chung cho toàn bộ hệ thống
 * Author: Grade Management System
 * Date: 2025-09-06
 */

/**
 * Hệ số điểm theo quy định
 */
export const GRADE_COEFFICIENTS = {
  TX: 1,    // Thường xuyên - hệ số 1
  DK: 2,    // Điều kiện - hệ số 2
};

/**
 * Trọng số điểm theo quy định mới
 */
export const GRADE_WEIGHTS = {
  FINAL: 0.6,   // Điểm thi cuối - trọng số 60%
  TBKT: 0.4,    // Điểm TBKT - trọng số 40%
};

/**
 * Tính điểm trung bình kiểm tra (TBKT)
 * Công thức: (TB_TX × hệ_số_TX + TB_ĐK × hệ_số_ĐK) ÷ (hệ_số_TX + hệ_số_ĐK)
 * 
 * @param {Object} txScore - JSON object chứa điểm TX {tx1: 8.5, tx2: 7.0, ...}
 * @param {Object} dkScore - JSON object chứa điểm ĐK {dk1: 8.0, dk2: 7.5, ...}
 * @param {Object} options - Tùy chọn tính toán
 * @param {number} options.txCoefficient - Hệ số TX (mặc định 1)
 * @param {number} options.dkCoefficient - Hệ số ĐK (mặc định 2)
 * @param {number} options.precision - Số chữ số thập phân (mặc định 2)
 * @returns {number|string} - Điểm TBKT hoặc chuỗi rỗng nếu không đủ dữ liệu
 */
export const calculateTBKT = (txScore, dkScore, options = {}) => {
  const {
    txCoefficient = GRADE_COEFFICIENTS.TX,
    dkCoefficient = GRADE_COEFFICIENTS.DK,
    precision = 2
  } = options;

  // Extract và validate điểm TX
  const txValues = Object.values(txScore || {})
    .filter(val => val !== '' && val !== null && !isNaN(val))
    .map(val => parseFloat(val));

  // Extract và validate điểm ĐK
  const dkValues = Object.values(dkScore || {})
    .filter(val => val !== '' && val !== null && !isNaN(val))
    .map(val => parseFloat(val));

  // Kiểm tra dữ liệu đầu vào
  if (txValues.length === 0 || dkValues.length === 0) {
    return '';
  }

  // Tính điểm trung bình cho từng loại
  const txAvg = txValues.reduce((sum, val) => sum + val, 0) / txValues.length;
  const dkAvg = dkValues.reduce((sum, val) => sum + val, 0) / dkValues.length;

  // Áp dụng công thức TBKT
  const tbkt = (txAvg * txCoefficient + dkAvg * dkCoefficient) / (txCoefficient + dkCoefficient);

  // Làm tròn theo precision
  return Math.round(tbkt * Math.pow(10, precision)) / Math.pow(10, precision);
};

/**
 * Tính điểm trung bình môn học (TBMH)
 * Công thức: A = (B × 0.6) + (C × 0.4)
 * Trong đó:
 * - A: Điểm môn học (TBMH) - trọng số 100%
 * - B: Điểm thi cuối kỳ - trọng số 60%
 * - C: Điểm trung bình kiểm tra (TBKT) - trọng số 40%
 * 
 * @param {number} tbktScore - Điểm TBKT (C)
 * @param {number} finalScore - Điểm thi cuối kỳ (B)
 * @param {Object} options - Tùy chọn tính toán
 * @param {number} options.finalWeight - Trọng số điểm thi (mặc định 0.6)
 * @param {number} options.tbktWeight - Trọng số điểm TBKT (mặc định 0.4)
 * @param {number} options.precision - Số chữ số thập phân (mặc định 2)
 * @returns {number|string} - Điểm TBMH hoặc chuỗi rỗng nếu không đủ dữ liệu
 */
export const calculateTBMH = (tbktScore, finalScore, options = {}) => {
  const {
    finalWeight = GRADE_WEIGHTS.FINAL,    // Trọng số điểm thi 60%
    tbktWeight = GRADE_WEIGHTS.TBKT,      // Trọng số điểm TBKT 40%
    precision = 2
  } = options;

  // Validate input
  if (tbktScore === '' || tbktScore === null || tbktScore === undefined ||
      finalScore === '' || finalScore === null || finalScore === undefined ||
      isNaN(tbktScore) || isNaN(finalScore)) {
    return '';
  }

  const tbkt = parseFloat(tbktScore);  // C - Điểm TBKT
  const thi = parseFloat(finalScore);  // B - Điểm thi

  // Áp dụng công thức TBMH: A = (B × 0.6) + (C × 0.4)
  const tbmh = (thi * finalWeight) + (tbkt * tbktWeight);

  // Làm tròn theo precision
  return Math.round(tbmh * Math.pow(10, precision)) / Math.pow(10, precision);
};

/**
 * Xếp loại học lực dựa vào điểm TBMH
 * 
 * @param {number} tbmhScore - Điểm TBMH
 * @returns {string} - Xếp loại học lực
 */
export const getGradeClassification = (tbmhScore) => {
  if (tbmhScore === '' || tbmhScore === undefined || tbmhScore === null) {
    return '';
  }

  const score = parseFloat(tbmhScore);
  
  if (isNaN(score)) return '';
  
  if (score >= 9.0) return 'Xuất sắc';
  if (score >= 8.0) return 'Giỏi';
  if (score >= 7.0) return 'Khá';
  if (score >= 5.0) return 'Trung bình';
  if (score >= 4.0) return 'Yếu';
  return 'Kém';
};

/**
 * Kiểm tra điều kiện đạt môn học
 * 
 * @param {number} tbmhScore - Điểm TBMH
 * @param {number} minPassScore - Điểm tối thiểu để đạt (mặc định 4.0)
 * @returns {boolean} - True nếu đạt, false nếu không đạt
 */
export const isPassingGrade = (tbmhScore, minPassScore = 4.0) => {
  if (tbmhScore === '' || tbmhScore === undefined || tbmhScore === null) {
    return false;
  }

  const score = parseFloat(tbmhScore);
  return !isNaN(score) && score >= minPassScore;
};

/**
 * Validate điểm số đầu vào
 * 
 * @param {number} score - Điểm cần validate
 * @param {number} min - Điểm tối thiểu (mặc định 0)
 * @param {number} max - Điểm tối đa (mặc định 10)
 * @returns {Object} - {isValid: boolean, message: string}
 */
export const validateScore = (score, min = 0, max = 10) => {
  if (score === '' || score === null || score === undefined) {
    return { isValid: true, message: '' }; // Cho phép giá trị rỗng
  }

  const numScore = parseFloat(score);

  if (isNaN(numScore)) {
    return { isValid: false, message: 'Điểm phải là số' };
  }

  if (numScore < min || numScore > max) {
    return { isValid: false, message: `Điểm phải từ ${min} đến ${max}` };
  }

  return { isValid: true, message: '' };
};

/**
 * Tính toán tổng hợp tất cả điểm cho một sinh viên
 * 
 * @param {Object} gradeData - Dữ liệu điểm {txScore: {}, dkScore: {}, finalScore: number}
 * @param {Object} options - Tùy chọn tính toán
 * @returns {Object} - Kết quả tính toán {tbkt, tbmh, classification, isPassing}
 */
export const calculateAllGrades = (gradeData, options = {}) => {
  const { txScore, dkScore, finalScore } = gradeData;

  // Tính TBKT
  const tbkt = calculateTBKT(txScore, dkScore, options);

  // Tính TBMH
  const tbmh = tbkt ? calculateTBMH(tbkt, finalScore, options) : '';

  // Xếp loại
  const classification = getGradeClassification(tbmh);

  // Kiểm tra đạt/không đạt
  const isPassing = isPassingGrade(tbmh);

  return {
    tbkt,
    tbmh,
    classification,
    isPassing
  };
};

/**
 * Format hiển thị công thức tính điểm
 * 
 * @param {Object} coefficients - Hệ số {tx, dk} và trọng số {finalWeight, tbktWeight}
 * @returns {Object} - Các công thức đã format
 */
export const getFormulaStrings = (coefficients = GRADE_COEFFICIENTS, weights = GRADE_WEIGHTS) => {
  const { TX: txCoeff, DK: dkCoeff } = coefficients;
  const { FINAL: finalWeight, TBKT: tbktWeight } = weights;

  return {
    tbktFormula: `TBKT = (TB_TX × ${txCoeff} + TB_ĐK × ${dkCoeff}) ÷ ${txCoeff + dkCoeff}`,
    tbmhFormula: `TBMH = (Thi × ${finalWeight}) + (TBKT × ${tbktWeight})`,
    coefficientInfo: `Hệ số: TX = ${txCoeff}, ĐK = ${dkCoeff}`,
    weightInfo: `Trọng số: Thi = ${finalWeight * 100}%, TBKT = ${tbktWeight * 100}%`
  };
};

// Export default object với tất cả functions
export default {
  GRADE_COEFFICIENTS,
  GRADE_WEIGHTS,
  calculateTBKT,
  calculateTBMH,
  getGradeClassification,
  isPassingGrade,
  validateScore,
  calculateAllGrades,
  getFormulaStrings
};
