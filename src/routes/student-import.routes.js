import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import StudentImportController from '../controllers/StudentImportController.js';

const router = express.Router();

// Cấu hình multer để xử lý upload file
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Chỉ accept file Excel
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ file Excel (.xlsx, .xls)'), false);
    }
  }
});

// API lấy danh sách lớp
router.get('/classes', StudentImportController.getClasses);

// API import sinh viên từ Excel (giữ nguyên upload, chỉ chuyển xử lý import sang controller/service)
router.post('/import-students', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn file Excel' });
    }
    const classId = req.body.classId;
    if (!classId) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn lớp học' });
    }
    // Đọc file Excel
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const students = xlsx.utils.sheet_to_json(worksheet);
    // Gọi service để import
    const results = await StudentImportController.importStudents({ body: { classId, students } }, res);
    // Nếu controller đã trả response thì return luôn
    if (results) return;
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// API tải template Excel
router.get('/download-template', (req, res) => {
  try {
    // Tạo template Excel với dữ liệu mẫu
    const templateData = [
      {
        'Mã sinh viên': 'SV001',
        'Họ và tên': 'Nguyễn Văn A',
        'Email': 'nguyenvana@email.com',
        'Số điện thoại': '0123456789',
        'Địa chỉ': 'Hà Nội',
        'Giới tính': 'Nam',
        'Ngày sinh': '2003-01-15'
      },
      {
        'Mã sinh viên': 'SV002',
        'Họ và tên': 'Trần Thị B',
        'Email': 'tranthib@email.com',
        'Số điện thoại': '0987654321',
        'Địa chỉ': 'Hồ Chí Minh',
        'Giới tính': 'Nữ',
        'Ngày sinh': '2003-05-20'
      }
    ];

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
    
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Danh sách sinh viên');
    
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=template_sinh_vien.xlsx');
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
