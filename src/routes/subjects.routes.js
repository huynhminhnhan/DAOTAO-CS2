/**
 * Subjects Routes - API for managing subjects
 */
import express from 'express';
import { Subject } from '../backend/database/index.js';

const router = express.Router();

// GET /api/subjects - Lấy danh sách tất cả môn học
router.get('/subjects', async (req, res) => {
  try {
    const subjects = await Subject.findAll({
      order: [['subjectCode', 'ASC']]
    });

    res.json({
      success: true,
      subjects: subjects.map(subject => ({
        subjectId: subject.subjectId,
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        credits: subject.credits,
        semester: subject.semester,
        description: subject.description,
        isRequired: subject.isRequired,
        department: subject.department
      })),
      total: subjects.length
    });
  } catch (error) {
    console.error('Error loading subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách môn học',
      error: error.message
    });
  }
});

// GET /api/subjects/:id - Lấy thông tin một môn học
router.get('/subjects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findByPk(id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy môn học'
      });
    }

    res.json({
      success: true,
      subject: {
        subjectId: subject.subjectId,
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        credits: subject.credits,
        semester: subject.semester,
        description: subject.description,
        isRequired: subject.isRequired,
        department: subject.department
      }
    });
  } catch (error) {
    console.error('Error loading subject:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải thông tin môn học',
      error: error.message
    });
  }
});

export default router;