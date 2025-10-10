import { GradeHistory } from '../database/index.js';

const GradeHistoryResource = {
  resource: GradeHistory,
  options: {
    id: 'GradeHistory',
    parent: {
      name: 'Học Tập',
      icon: 'Book'
    },
    properties: {
      id: { isId: true, label: 'ID' },
      gradeId: { isVisible: { list: true, show: true }, label: 'ID Điểm' },
      studentId: { isVisible: { list: false, show: false }, label: 'Sinh viên (ID)' },
      classId: { isVisible: { list: false, show: false }, label: 'Lớp (ID)' },
      subjectId: { isVisible: { list: false, show: false }, label: 'Môn học (ID)' },
      // Virtual friendly-name properties
      studentName: { isVisible: { list: true, show: true }, label: 'Sinh viên' },
      className: { isVisible: { list: true, show: true }, label: 'Lớp' },
      subjectName: { isVisible: { list: true, show: true }, label: 'Môn học' },
      previousValue: { type: 'mixed', isVisible: { list: false, show: true }, components: { show: 'GradeHistoryDiff' }, label: 'Giá trị trước' },
      newValue: { type: 'mixed', isVisible: { list: false, show: false }, label: 'Giá trị sau' },
      changeType: { isVisible: { list: true, filter: true, show: true }, label: 'Loại thay đổi' },
      changedBy: { isVisible: { list: false, show: false }, label: 'Người thay đổi (ID)' },
      changedByName: { isVisible: { list: true, show: true }, label: 'Người thay đổi' },
      changedByRole: { isVisible: { list: true, show: true }, label: 'Vai trò người thay đổi' },
      reason: { isVisible: { list: false, show: true }, label: 'Lý do' },
      ipAddress: { isVisible: { list: false, show: true }, label: 'Địa chỉ IP' },
      userAgent: { isVisible: { list: false, show: true }, label: 'User-Agent' },
      // transactionId: { isVisible: { list: false, show: true }, label: 'Mã giao dịch' },
      updatedAt: { isVisible: { list: true, filter: true, show: true, edit: true }, label: 'Ngày cập nhật' },
      createdAt: { label: 'Ngày tạo' }
    },
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin',
        after: async (response, request, context) => {
          try {
            const { records } = response;
            const GradeHistoryService = (await import('../services/gradeHistory.service.js')).default;
            await GradeHistoryService.enrichListRecords(records);
          } catch (err) {
            console.warn('Error enriching GradeHistory list records:', err && err.message);
          }
          return response;
        }
      },
      new: { isAccessible: false },
      edit: { isAccessible: false },
      delete: { isAccessible: false },
      show: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin',
        layout: [
          // Row 1: Grade ID and Change Type
          [{ flexDirection: 'row', flex: true }, [
            ['gradeId', { flexGrow: 1, marginRight: 'default' }],
            ['changeType', { flexGrow: 1 }]
          ]],
          // Row 2: Student and Class (show friendly names)
          [{ flexDirection: 'row', flex: true }, [
            ['studentName', { flexGrow: 1, marginRight: 'default' }],
            ['className', { flexGrow: 1 }]
          ]],
          // Row 3: Subject and Người thay đổi (show friendly subject name)
          [{ flexDirection: 'row', flex: true }, [
            ['subjectName', { flexGrow: 1, marginRight: 'default' }],
            ['changedByName', { flexGrow: 1 }]
          ]],
          // Row 4: Vai trò người thay đổi and IP
          [{ flexDirection: 'row', flex: true }, [
            ['changedByRole', { flexGrow: 1, marginRight: 'default' }],
            ['ipAddress', { flexGrow: 1 }]
          ]],
          // Row 5: User-Agent and Transaction ID
          [{ flexDirection: 'row', flex: true }, [
            ['userAgent', { flexGrow: 1, marginRight: 'default' }],
            ['transactionId', { flexGrow: 1 }]
          ]],
          // Row 6: Reason (full width)
          [{ flexDirection: 'row', flex: true }, [
            ['reason', { flexGrow: 1 }]
          ]],
          // Row 7: Diff component (previousValue) full width
          [{ flexDirection: 'row', flex: true }, [
            ['previousValue', { flexGrow: 1 }]
          ]]
        ],
        after: async (response, request, context) => {
          try {
            const { record } = response;
            const GradeHistoryService = (await import('../services/gradeHistory.service.js')).default;
            await GradeHistoryService.enrichShowRecord(record);
          } catch (err) {
            console.warn('Error enriching GradeHistory record for show:', err && err.message);
          }
          return response;
        }
      },

    }
  }
};

export default GradeHistoryResource;
