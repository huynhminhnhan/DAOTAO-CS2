/**
 * Grade API Routes
 * API routes cho chức năng nhập điểm
 * 
 * ⚠️ SỬ DỤNG SESSION AUTHENTICATION (AdminJS)
 */
import express from 'express';
import xlsx from 'xlsx';
import GradeApiController from '../controllers/GradeApiController.js';
import GradeBulkController from '../controllers/GradeBulkController.js';
import SemesterGradeSummaryController from '../controllers/SemesterGradeSummaryController.js';
import { Grade, Enrollment, GradeHistory } from '../database/index.js';
import { requireAdminSession, requireAdminOrTeacher } from '../middleware/session-auth.js';
import { checkGradeEntryPermission } from '../middleware/checkTeacherPermission.js';

const router = express.Router();

// ✅ SECURITY: Protect all grade routes with AdminJS session
// These routes handle sensitive grade data and must be protected
router.use(requireAdminSession);
router.use(requireAdminOrTeacher);


// API lấy sinh viên đã đăng ký môn học cụ thể (ĐÚNG LOGIC NGHIỆP VỤ)
router.get('/enrolled-students', GradeApiController.getEnrolledStudents);

// API lấy toàn bộ sinh viên theo classId cho trang nhập điểm (không bị giới hạn pagination)
router.get('/students/by-class/:classId', GradeApiController.getStudentsByClass);

// API lấy danh sách sinh viên và điểm theo lớp
router.get('/class-grades/:classId', GradeApiController.getClassGrades);

// API lấy danh sách lớp mà giáo viên quản lý
router.get('/teacher-classes', GradeApiController.getTeacherClasses);

// API để lưu điểm số hàng loạt
router.post('/save-bulk', GradeBulkController.saveBulk);

// API lấy bảng điểm tổng kết theo học kỳ
router.get('/semester-summary', SemesterGradeSummaryController.getSemesterSummary);

// API tải template Excel cho import điểm TX/ĐK
router.get('/download-txdk-template', (req, res) => {
  try {
    const { txColumns = 3, dkColumns = 1 } = req.query;
    
    // Validate số cột
    const numTX = Math.min(Math.max(parseInt(txColumns) || 3, 1), 10);
    const numDK = Math.min(Math.max(parseInt(dkColumns) || 1, 1), 10);
    
    // Tạo object mẫu với các cột động
    const sampleRow = {
      'MSSV': '2021001',
      'Họ và tên': 'Nguyễn Văn A'
    };
    
    // Thêm cột TX động
    for (let i = 1; i <= numTX; i++) {
      sampleRow[`TX${i}`] = 8.5;
    }
    
    // Thêm cột ĐK động
    for (let i = 1; i <= numDK; i++) {
      sampleRow[`ĐK${i}`] = 7.5;
    }
    
    // Tạo dữ liệu mẫu (2 dòng)
    const templateData = [
      sampleRow,
      {
        'MSSV': '2021002',
        'Họ và tên': 'Trần Thị B',
        ...Object.fromEntries(
          Object.keys(sampleRow)
            .filter(k => k.startsWith('TX') || k.startsWith('ĐK'))
            .map(k => [k, k.startsWith('TX') ? 9.0 : 8.0])
        )
      }
    ];
    
    // Tạo workbook Excel
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(templateData);
    
    // Tự động điều chỉnh độ rộng cột
    const range = xlsx.utils.decode_range(worksheet['!ref']);
    const colWidths = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxWidth = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellAddress = xlsx.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          const length = cell.v.toString().length;
          if (length > maxWidth) maxWidth = length;
        }
      }
      colWidths.push({ wch: maxWidth + 2 });
    }
    worksheet['!cols'] = colWidths;
    
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Điểm TX-ĐK');
    
    // Tạo buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set headers và gửi file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=template_txdk_${numTX}TX_${numDK}DK.xlsx`);
    res.send(buffer);
    
  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({
      success: false,
      message: `Lỗi tải template: ${error.message}`
    });
  }
});

// API tải template Excel cho import điểm thi cuối kỳ
router.get('/download-final-exam-template', (req, res) => {
  try {
    // Tạo dữ liệu mẫu (2 dòng)
    const templateData = [
      {
        'MSSV': '2021001',
        'Họ và tên': 'Nguyễn Văn A',
        'Điểm thi': 8.5
      },
      {
        'MSSV': '2021002',
        'Họ và tên': 'Trần Thị B',
        'Điểm thi': 9.0
      }
    ];
    
    // Tạo workbook Excel
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(templateData);
    
    // Tự động điều chỉnh độ rộng cột
    const range = xlsx.utils.decode_range(worksheet['!ref']);
    const colWidths = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxWidth = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellAddress = xlsx.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          const length = cell.v.toString().length;
          if (length > maxWidth) maxWidth = length;
        }
      }
      colWidths.push({ wch: maxWidth + 2 });
    }
    worksheet['!cols'] = colWidths;
    
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Điểm thi cuối kỳ');
    
    // Tạo buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set headers và gửi file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=template_diem_thi_cuoi_ky.xlsx');
    res.send(buffer);
    
  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({
      success: false,
      message: `Lỗi tải template: ${error.message}`
    });
  }
});

export default router;
