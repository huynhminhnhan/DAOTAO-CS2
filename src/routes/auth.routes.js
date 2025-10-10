/**
 * Authentication Routes
 * Handles user authentication and session management
 */

import express from 'express';

const router = express.Router();

/**
 * GET /admin-api/auth/current-user
 * Get current logged-in user info
 */
router.get('/current-user', (req, res) => {
  try {
    if (!req.session || !req.session.adminUser) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: req.session.adminUser.id,
        email: req.session.adminUser.email,
        username: req.session.adminUser.username,
        fullName: req.session.adminUser.fullName,
        role: req.session.adminUser.role
      }
    });
  } catch (error) {
    console.error('❌ Error getting current user:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting current user',
      error: error.message
    });
  }
});

export default router;
