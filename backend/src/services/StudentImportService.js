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
    for (const [excelField, dbField] of Object.entries(fieldMapping)) {
      if (excelRow[excelField] !== undefined && excelRow[excelField] !== null && excelRow[excelField] !== '') {
        mappedData[dbField] = excelRow[excelField];
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
