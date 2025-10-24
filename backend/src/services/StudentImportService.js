// StudentImportService.js
import { Student, Class } from '../database/index.js';

const StudentImportService = {
  async getClasses() {
    return await Class.findAll({ order: [['classCode', 'ASC']] });
  },

  // Mapping từ tiếng Việt sang field names trong database
  mapExcelFieldsToDb(excelRow) {
    const fieldMapping = {
      'Mã sinh viên': 'studentCode',
      'Họ và tên': 'fullName',
      'Email': 'email',
      'Số điện thoại': 'phone',
      'Địa chỉ': 'address',
      'Giới tính': 'gender',
      'Ngày sinh': 'dateOfBirth'
    };

    const mappedData = {};
    // helper: normalize gender values coming from Excel (supports Vietnamese/English variants)
    const normalizeGender = (raw) => {
      if (raw === undefined || raw === null) return undefined;
      const s = String(raw).trim().toLowerCase();
      if (!s) return undefined;
      // Vietnamese and English common values
      if (['nam','Nam', 'n', 'male', 'm'].includes(s)) return 'male';
      if (['nữ','Nữ', 'nu', 'female', 'f'].includes(s) || s === 'nữ') return 'female';
      // sometimes Excel may have 'Male'/'Female' with capital letters or localized words
      if (s.startsWith('m') && s.length <= 2) return 'male';
      if (s.startsWith('f') && s.length <= 2) return 'female';
      // fallback: if it's already one of the expected enum values
      if (['male', 'female', 'other'].includes(s)) return s;
      return 'other';
    };

    // helper: normalize date to YYYY-MM-DD if possible
    const normalizeDate = (raw) => {
      if (raw === undefined || raw === null || raw === '') return undefined;
      // If it's already a Date object
      if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
        return raw.toISOString().slice(0, 10);
      }
      // Try parsing as date string
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
      }
      // If looks like DD/MM/YYYY or DD-MM-YYYY, convert
      const m = String(raw).trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (m) {
        const dd = m[1].padStart(2, '0');
        const mm = m[2].padStart(2, '0');
        const yyyy = m[3];
        return `${yyyy}-${mm}-${dd}`;
      }
      return undefined;
    };

    for (const [excelField, dbField] of Object.entries(fieldMapping)) {
      const raw = excelRow[excelField];
      if (raw === undefined || raw === null || raw === '') continue;

      if (dbField === 'gender') {
        const g = normalizeGender(raw);
        if (g !== undefined) mappedData[dbField] = g;
      } else if (dbField === 'dateOfBirth') {
        const d = normalizeDate(raw);
        if (d !== undefined) mappedData[dbField] = d;
      } else {
        mappedData[dbField] = raw;
      }
    }

    return mappedData;
  },

  async importStudents({ classId, students }) {
    // students: array of { "Mã sinh viên", "Họ và tên", ... } from Excel
    if (!classId || !Array.isArray(students)) {
      throw new Error('Thiếu thông tin lớp hoặc danh sách sinh viên');
    }

    // Map Excel fields to database fields
    const mappedStudents = students.map(s => this.mapExcelFieldsToDb(s));

    // Validate required fields
    const results = [];
    for (const s of mappedStudents) {
      try {
        if (!s.studentCode) {
          results.push({ 
            studentCode: s.studentCode || 'N/A',
            fullName: s.fullName || 'N/A',
            error: 'Thiếu mã sinh viên hoặc họ tên' 
          });
          continue;
        }

        const [student, created] = await Student.findOrCreate({
          where: { studentCode: s.studentCode },
          defaults: { ...s, classId, status: 'active' }
        });
        
        results.push({ 
          studentCode: s.studentCode,
          fullName: s.fullName,
          created, // true = tạo mới, false = đã tồn tại
          message: created ? 'Tạo mới thành công' : 'Đã tồn tại, bỏ qua'
        });
      } catch (err) {
        results.push({ 
          studentCode: s.studentCode || 'N/A',
          fullName: s.fullName || 'N/A',
          error: err.message 
        });
      }
    }
    return results;
  }
};

export default StudentImportService;
