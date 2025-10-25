import express from 'express';
import GradeHistoryController from '../controllers/GradeHistoryController.js';
import { requireAdminSession, requireAdminOrTeacher, requireAdmin } from '../middleware/session-auth.js';

const router = express.Router();


// ✅ SECURITY FIX: List and detail - teacher can view
router.get('/api/grade-history', 
  requireAdminSession, 
  requireAdminOrTeacher, 
  GradeHistoryController.list
);

// Detail
router.get('/api/grade-history/:id', 
  requireAdminSession, 
  requireAdminOrTeacher, 
  GradeHistoryController.detail
);

// ✅ CRITICAL: Revert - admin only (very sensitive!)
router.post('/api/grade-history/:id/revert', 
  requireAdminSession, 
  requireAdmin,  // ⚠️ Admin only!
  GradeHistoryController.revert
);

export default router;
