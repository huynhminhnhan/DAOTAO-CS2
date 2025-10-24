/**
 * Semester API Routes
 * Routes for managing semesters
 */
import express from 'express';
import Semester from '../database/models/Semester.js';
import Cohort from '../database/models/Cohort.js';
import { requireAdminSession } from '../middleware/session-auth.js';

const router = express.Router();

// Protect all routes
router.use(requireAdminSession);

/**
 * GET /admin-api/semesters/by-cohort/:cohortId
 * Get all semesters for a specific cohort
 */
router.get('/by-cohort/:cohortId', async (req, res) => {
  try {
    const { cohortId } = req.params;

    const semesters = await Semester.findAll({
      where: { cohortId: parseInt(cohortId) },
      include: [{
        model: Cohort,
        as: 'cohort',
        attributes: ['cohortId', 'name']
      }],
      order: [['order', 'ASC']],
      attributes: ['semesterId', 'name', 'academicYear', 'startDate', 'endDate', 'order']
    });

    return res.status(200).json({
      success: true,
      semesters: semesters.map(s => ({
        semesterId: s.semesterId,
        name: s.name,
        academicYear: s.academicYear,
        startDate: s.startDate,
        endDate: s.endDate,
        order: s.order,
        cohort: s.cohort
      }))
    });
  } catch (error) {
    console.error('Error fetching semesters by cohort:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách học kỳ: ' + error.message
    });
  }
});

/**
 * GET /admin-api/semesters
 * Get all semesters
 */
router.get('/', async (req, res) => {
  try {
    const semesters = await Semester.findAll({
      include: [{
        model: Cohort,
        as: 'cohort',
        attributes: ['cohortId', 'name']
      }],
      order: [['cohortId', 'ASC'], ['order', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      semesters
    });
  } catch (error) {
    console.error('Error fetching all semesters:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách học kỳ: ' + error.message
    });
  }
});

export default router;
