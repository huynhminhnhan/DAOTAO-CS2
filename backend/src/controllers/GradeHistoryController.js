import { GradeHistory, Grade, Student, User, sequelize } from '../database/index.js';

class GradeHistoryController {
  // GET /api/grade-history
  static async list(req, res, next) {
    try {
      const { page = 1, limit = 20, studentId, classId, subjectId } = req.query;
      const where = {};
      if (studentId) where.studentId = studentId;
      if (classId) where.classId = classId;
      if (subjectId) where.subjectId = subjectId;

      const offset = (page - 1) * limit;
      const { count, rows } = await GradeHistory.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });

      // Resolve changedBy -> changedByName for returned rows
      try {
        const changedByIds = Array.from(new Set(rows.map(r => (r && r.changedBy) || null).filter(Boolean)));
        let userMap = {};
        if (changedByIds.length > 0) {
          const users = await User.findAll({ where: { id: changedByIds } });
          userMap = Object.fromEntries(users.map(u => [u.id, u.fullName || u.username || u.email]));
        }

        const mapped = rows.map(r => {
          const obj = (r && typeof r.toJSON === 'function') ? r.toJSON() : r;
          obj.changedByName = obj.changedBy ? (userMap[obj.changedBy] || String(obj.changedBy)) : null;
          return obj;
        });

        res.json({
          success: true,
          data: mapped,
          pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) }
        });
      } catch (e) {
        // If enrichment fails, fallback to raw rows
        res.json({
          success: true,
          data: rows,
          pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) }
        });
      }
    } catch (err) {
      next(err);
    }
  }

  // GET /api/grade-history/:id
  static async detail(req, res, next) {
    try {
      const { id } = req.params;
      const row = await GradeHistory.findByPk(id);
      if (!row) return res.status(404).json({ success: false, message: 'Không tìm thấy lịch sử' });
      res.json({ success: true, data: row });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/grade-history/:id/revert
  static async revert(req, res, next) {
    try {
      const { id } = req.params;
      const actorId = req.user && req.user.id;

      const row = await GradeHistory.findByPk(id);
      if (!row) return res.status(404).json({ success: false, message: 'Không tìm thấy lịch sử' });

      // Permission: only admin or teacher allowed (controller-level guard)
      if (!['admin', 'teacher'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Không có quyền thực hiện revert' });
      }

      // If gradeId missing, cannot revert
      if (!row.gradeId || !row.previousValue) {
        return res.status(400).json({ success: false, message: 'Không thể revert: thiếu gradeId hoặc previous snapshot' });
      }

  // Perform revert via GradeService (GradeService is CommonJS; import dynamically)
  const GradeServiceModule = await import('../services/GradeService.js');
  const GradeService = GradeServiceModule.default || GradeServiceModule;
  const reverted = await GradeService.revertGradeFromHistory(row, actorId);

      res.json({ success: true, message: 'Revert thành công', data: reverted });
    } catch (err) {
      next(err);
    }
  }
}

export default GradeHistoryController;
