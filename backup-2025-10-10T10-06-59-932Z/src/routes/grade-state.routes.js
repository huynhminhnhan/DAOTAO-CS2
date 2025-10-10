/**
 * Grade State Management Routes
 * API endpoints để quản lý trạng thái nhập điểm
 */

import express from 'express';
import GradeStateService from '../services/GradeStateService.js';

const router = express.Router();

/**
 * POST /admin-api/grade/state/submit
 * Teacher submits grade for review (DRAFT → PENDING_REVIEW)
 */
router.post('/submit', async (req, res) => {
  try {
    const { gradeId, reason } = req.body;
    const userId = req.session?.adminUser?.id;
    const userRole = req.session?.adminUser?.role;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Chưa đăng nhập' 
      });
    }

    if (userRole !== 'teacher') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ giáo viên mới có thể nộp điểm để duyệt' 
      });
    }

    if (!gradeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu gradeId' 
      });
    }

    const result = await GradeStateService.submitForReview(gradeId, userId, reason);

    res.json({
      success: true,
      message: 'Nộp điểm để duyệt thành công',
      data: result
    });

  } catch (error) {
    console.error('Error submitting grade for review:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi nộp điểm để duyệt'
    });
  }
});

/**
 * POST /admin-api/grade/state/approve-tx-dk
 * Admin approves TX/ĐK scores (PENDING_REVIEW → APPROVED_TX_DK)
 */
router.post('/approve-tx-dk', async (req, res) => {
  try {
    const { gradeId, reason } = req.body;
    const userId = req.session?.adminUser?.id;
    const userRole = req.session?.adminUser?.role;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Chưa đăng nhập' 
      });
    }

    if (userRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ admin mới có thể duyệt điểm' 
      });
    }

    if (!gradeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu gradeId' 
      });
    }

    const result = await GradeStateService.approveTxDk(gradeId, userId, reason);

    res.json({
      success: true,
      message: 'Duyệt điểm TX/ĐK thành công',
      data: result
    });

  } catch (error) {
    console.error('Error approving TX/DK scores:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi duyệt điểm TX/ĐK'
    });
  }
});

/**
 * POST /admin-api/grade/state/enter-final
 * Admin enters final score (APPROVED_TX_DK → FINAL_ENTERED)
 */
router.post('/enter-final', async (req, res) => {
  try {
    const { gradeId, finalScore, reason } = req.body;
    const userId = req.session?.adminUser?.id;
    const userRole = req.session?.adminUser?.role;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Chưa đăng nhập' 
      });
    }

    if (userRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ admin mới có thể nhập điểm thi' 
      });
    }

    if (!gradeId || finalScore === undefined || finalScore === null) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu gradeId hoặc finalScore' 
      });
    }

    const result = await GradeStateService.enterFinalScore(gradeId, userId, finalScore, reason);

    res.json({
      success: true,
      message: 'Nhập điểm thi thành công',
      data: result
    });

  } catch (error) {
    console.error('Error entering final score:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi nhập điểm thi'
    });
  }
});

/**
 * POST /admin-api/grade/state/finalize
 * Admin finalizes grade (FINAL_ENTERED → FINALIZED)
 */
router.post('/finalize', async (req, res) => {
  try {
    const { gradeId, reason } = req.body;
    const userId = req.session?.adminUser?.id;
    const userRole = req.session?.adminUser?.role;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Chưa đăng nhập' 
      });
    }

    if (userRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ admin mới có thể hoàn tất điểm' 
      });
    }

    if (!gradeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu gradeId' 
      });
    }

    const result = await GradeStateService.finalize(gradeId, userId, reason);

    res.json({
      success: true,
      message: 'Hoàn tất điểm thành công',
      data: result
    });

  } catch (error) {
    console.error('Error finalizing grade:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi hoàn tất điểm'
    });
  }
});

/**
 * POST /admin-api/grade/state/reject
 * Admin rejects grade back to DRAFT
 */
router.post('/reject', async (req, res) => {
  try {
    const { gradeId, reason } = req.body;
    const userId = req.session?.adminUser?.id;
    const userRole = req.session?.adminUser?.role;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Chưa đăng nhập' 
      });
    }

    if (userRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ admin mới có thể từ chối điểm' 
      });
    }

    if (!gradeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu gradeId' 
      });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng nhập lý do từ chối' 
      });
    }

    const result = await GradeStateService.reject(gradeId, userId, reason);

    res.json({
      success: true,
      message: 'Từ chối điểm thành công',
      data: result
    });

  } catch (error) {
    console.error('Error rejecting grade:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi từ chối điểm'
    });
  }
});

/**
 * POST /admin-api/grade/state/unlock
 * Admin emergency unlock field
 */
router.post('/unlock', async (req, res) => {
  try {
    const { gradeId, fieldName, reason } = req.body;
    const userId = req.session?.adminUser?.id;
    const userRole = req.session?.adminUser?.role;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Chưa đăng nhập' 
      });
    }

    if (userRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ admin mới có thể mở khóa điểm' 
      });
    }

    if (!gradeId || !fieldName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu gradeId hoặc fieldName' 
      });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng nhập lý do mở khóa' 
      });
    }

    const result = await GradeStateService.unlockField(gradeId, fieldName, userId, reason);

    res.json({
      success: true,
      message: `Mở khóa ${fieldName} thành công`,
      data: result
    });

  } catch (error) {
    console.error('Error unlocking field:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi mở khóa điểm'
    });
  }
});

/**
 * GET /admin-api/grade/state/history/:gradeId
 * Get state transition history for a grade
 */
router.get('/history/:gradeId', async (req, res) => {
  try {
    const { gradeId } = req.params;
    const userId = req.session?.adminUser?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Chưa đăng nhập' 
      });
    }

    if (!gradeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu gradeId' 
      });
    }

    const history = await GradeStateService.getStateHistory(gradeId);

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Error getting state history:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy lịch sử trạng thái'
    });
  }
});

/**
 * GET /admin-api/grade/state/version-history/:gradeId
 * Get version history for a grade (from GradeHistory table)
 */
router.get('/version-history/:gradeId', async (req, res) => {
  try {
    const { gradeId } = req.params;
    const { limit, offset } = req.query;
    const userId = req.session?.adminUser?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Chưa đăng nhập' 
      });
    }

    if (!gradeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu gradeId' 
      });
    }

    const options = {
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    };

    const history = await GradeStateService.getVersionHistory(gradeId, options);

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Error getting version history:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy lịch sử phiên bản'
    });
  }
});

/**
 * GET /admin-api/grade/state/check/:gradeId
 * Check if user can edit specific field
 */
router.get('/check/:gradeId', async (req, res) => {
  try {
    const { gradeId } = req.params;
    const { fieldName } = req.query;
    const userId = req.session?.adminUser?.id;
    const userRole = req.session?.adminUser?.role;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Chưa đăng nhập' 
      });
    }

    if (!gradeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu gradeId' 
      });
    }

    const canEdit = await GradeStateService.canEdit(gradeId, userId, fieldName);

    res.json({
      success: true,
      data: {
        canEdit,
        userId,
        userRole,
        fieldName
      }
    });

  } catch (error) {
    console.error('Error checking edit permission:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi kiểm tra quyền chỉnh sửa'
    });
  }
});

/**
 * POST /admin-api/grade/state/bulk-submit
 * Teacher submits multiple grades for review at once
 */
router.post('/bulk-submit', async (req, res) => {
  try {
    const { gradeIds, reason } = req.body;
    const userId = req.session?.adminUser?.id;
    const userRole = req.session?.adminUser?.role;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Chưa đăng nhập' 
      });
    }

    if (userRole !== 'teacher') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ giáo viên mới có thể nộp điểm để duyệt' 
      });
    }

    if (!gradeIds || !Array.isArray(gradeIds) || gradeIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu gradeIds hoặc danh sách rỗng' 
      });
    }

    const results = [];
    const errors = [];

    for (const gradeId of gradeIds) {
      try {
        const result = await GradeStateService.submitForReview(gradeId, userId, reason);
        results.push({ gradeId, success: true, data: result });
      } catch (error) {
        errors.push({ gradeId, success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Nộp ${results.length}/${gradeIds.length} điểm thành công`,
      data: {
        successful: results,
        failed: errors,
        total: gradeIds.length,
        successCount: results.length,
        failCount: errors.length
      }
    });

  } catch (error) {
    console.error('Error bulk submitting grades:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi nộp nhiều điểm'
    });
  }
});

export default router;
