import express from 'express';
import GradeHistoryController from '../controllers/GradeHistoryController.js';

const router = express.Router();

// List history
router.get('/api/grade-history', GradeHistoryController.list);

// Detail
router.get('/api/grade-history/:id', GradeHistoryController.detail);

// Revert
router.post('/api/grade-history/:id/revert', GradeHistoryController.revert);

export default router;
