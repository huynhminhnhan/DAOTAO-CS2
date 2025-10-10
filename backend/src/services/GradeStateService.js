/**
 * Grade State Management Service
 * Service quản lý trạng thái và workflow của nhập điểm
 */

import { Grade, User, GradeStateTransition, GradeHistory } from '../database/index.js';

class GradeStateService {
  
  // ===== STATE MACHINE CONFIGURATION =====
  
  /**
   * Valid state transitions
   * Mỗi trạng thái chỉ có thể chuyển sang một số trạng thái nhất định
   */
  static TRANSITIONS = {
    'draft': ['pending_review'],
    'pending_review': ['approved_tx_dk', 'draft'], // Admin có thể send back
    'approved_tx_dk': ['final_entered'],
    'final_entered': ['finalized', 'approved_tx_dk'], // Admin có thể sửa final score
    'finalized': ['approved_tx_dk'] // Chỉ Admin có thể unlock
  };
  
  /**
   * Permission matrix - Ai được làm gì ở trạng thái nào
   */
  static PERMISSIONS = {
    'draft': {
      teacher: {
        canEdit: ['txScore', 'dkScore', 'notes'],
        canChangeStatus: true,
        availableTransitions: ['pending_review']
      },
      admin: {
        canEdit: ['txScore', 'dkScore', 'notes'], // Admin có thể edit trong draft
        canChangeStatus: true,
        availableTransitions: ['pending_review']
      }
    },
    'pending_review': {
      teacher: {
        canEdit: [], // Teacher bị lock
        canChangeStatus: false,
        availableTransitions: []
      },
      admin: {
        canEdit: ['txScore', 'dkScore', 'notes'], // Admin có thể review và sửa
        canChangeStatus: true,
        availableTransitions: ['approved_tx_dk', 'draft'] // Approve hoặc send back
      }
    },
    'approved_tx_dk': {
      teacher: {
        canEdit: [], // Locked
        canChangeStatus: false,
        availableTransitions: []
      },
      admin: {
        canEdit: ['finalScore', 'notes'], // Chỉ nhập điểm thi
        canChangeStatus: true,
        availableTransitions: ['final_entered']
      }
    },
    'final_entered': {
      teacher: {
        canEdit: [], // Locked
        canChangeStatus: false,
        availableTransitions: []
      },
      admin: {
        canEdit: ['finalScore', 'notes'], // Có thể sửa final score
        canChangeStatus: true,
        availableTransitions: ['finalized', 'approved_tx_dk'] // Finalize hoặc quay lại
      }
    },
    'finalized': {
      teacher: {
        canEdit: [], // Locked
        canChangeStatus: false,
        availableTransitions: []
      },
      admin: {
        canEdit: [], // Locked (cần unlock trước)
        canChangeStatus: true,
        availableTransitions: ['approved_tx_dk'] // Chỉ unlock về approved
      }
    }
  };
  
  /**
   * Status labels cho UI
   */
  static STATUS_LABELS = {
    'draft': { 
      label: '📝 Nháp', 
      color: '#ffc107',
      description: 'Giáo viên đang nhập điểm TX & ĐK'
    },
    'pending_review': { 
      label: '⏳ Chờ duyệt', 
      color: '#ff9800',
      description: 'Đã submit, chờ Admin review'
    },
    'approved_tx_dk': { 
      label: '✅ Đã duyệt TX & ĐK', 
      color: '#4caf50',
      description: 'TX & ĐK đã được duyệt, chờ thi'
    },
    'final_entered': { 
      label: '🎯 Đã có điểm thi', 
      color: '#2196f3',
      description: 'Đã nhập điểm thi cuối kỳ'
    },
    'finalized': { 
      label: '🔒 Hoàn tất', 
      color: '#9e9e9e',
      description: 'Đã hoàn tất, publish cho sinh viên'
    }
  };
  
  // ===== PERMISSION CHECKS =====
  
  /**
   * Kiểm tra xem user có quyền edit field không
   */
  static canEditField(gradeStatus, userRole, fieldName) {
    const permissions = this.PERMISSIONS[gradeStatus]?.[userRole];
    if (!permissions) return false;
    return permissions.canEdit.includes(fieldName);
  }
  
  /**
   * Kiểm tra xem user có quyền thay đổi trạng thái không
   */
  static canChangeStatus(gradeStatus, userRole) {
    const permissions = this.PERMISSIONS[gradeStatus]?.[userRole];
    return permissions?.canChangeStatus || false;
  }
  
  /**
   * Lấy danh sách transitions khả dụng cho user
   */
  static getAvailableTransitions(gradeStatus, userRole) {
    const permissions = this.PERMISSIONS[gradeStatus]?.[userRole];
    return permissions?.availableTransitions || [];
  }
  
  /**
   * Validate transition có hợp lệ không
   */
  static isValidTransition(fromStatus, toStatus) {
    return this.TRANSITIONS[fromStatus]?.includes(toStatus) || false;
  }
  
  // ===== STATE TRANSITION =====
  
  /**
   * Teacher submits grade for review (DRAFT → PENDING_REVIEW)
   * @param {number} gradeId - ID của grade cần nộp
   * @param {number} userId - ID của giáo viên
   * @param {string} reason - Lý do nộp điểm (optional)
   * @returns {Promise<object>} Grade object sau khi update
   */
  static async submitForReview(gradeId, userId, reason = null) {
    try {
      const grade = await Grade.findByPk(gradeId);
      if (!grade) {
        throw new Error(`Grade ${gradeId} không tồn tại`);
      }
      
      const currentStatus = (grade.gradeStatus || 'draft').toLowerCase();
      
      // Chỉ cho phép submit từ DRAFT
      if (currentStatus !== 'draft') {
        throw new Error(
          `Chỉ có thể nộp điểm từ trạng thái DRAFT. ` +
          `Trạng thái hiện tại: ${this.STATUS_LABELS[currentStatus]?.label || grade.gradeStatus}`
        );
      }
      
      // Validate ít nhất phải có TX hoặc ĐK
      if (!grade.txScore && !grade.dkScore) {
        throw new Error('Phải nhập ít nhất điểm TX hoặc ĐK trước khi nộp');
      }
      
      // Save to history before transition
      await this.saveToHistory(grade, userId, 'Nộp điểm để duyệt');
      
      // Update grade
      const oldVersion = grade.version || 1;
      grade.gradeStatus = 'pending_review';
      grade.version = oldVersion + 1;
      grade.lastEditedBy = userId;
      grade.lastEditedAt = new Date();
      grade.submittedForReviewAt = new Date();
      grade.submittedBy = userId;
      
      // Lock TX và ĐK fields
      grade.txLocked = true;
      grade.dkLocked = true;
      
      await grade.save();
      
      // Log transition
      await GradeStateTransition.create({
        gradeId: grade.id,
        fromState: 'draft',
        toState: 'pending_review',
        triggeredBy: userId,
        reason: reason || 'Giáo viên nộp điểm để duyệt'
      });
      
      console.log(`✅ Grade ${gradeId} submitted for review by user ${userId}`);
      
      return grade;
    } catch (error) {
      console.error(`❌ Error submitting grade ${gradeId} for review:`, error);
      throw error;
    }
  }
  
  /**
   * Chuyển trạng thái của một grade
   */
  static async transitionState(gradeId, toStatus, userId, reason = null) {
    try {
      const grade = await Grade.findByPk(gradeId);
      if (!grade) {
        throw new Error(`Grade ${gradeId} not found`);
      }
      
      const fromStatus = grade.gradeStatus || 'draft';
      
      // Validate transition
      if (!this.isValidTransition(fromStatus, toStatus)) {
        throw new Error(
          `Invalid transition: ${fromStatus} → ${toStatus}. ` +
          `Valid transitions from ${fromStatus}: ${this.TRANSITIONS[fromStatus]?.join(', ') || 'none'}`
        );
      }
      
      // Save current state to history BEFORE updating
      await this.saveToHistory(grade, userId, `Transition: ${fromStatus} → ${toStatus}`);
      
      // Update grade
      const oldVersion = grade.version || 1;
      grade.gradeStatus = toStatus;
      grade.version = oldVersion + 1;
      grade.lastEditedBy = userId;
      grade.lastEditedAt = new Date();
      await grade.save();
      
      // Log transition
      await GradeStateTransition.create({
        gradeId: grade.id,
        fromState: fromStatus,
        toState: toStatus,
        triggeredBy: userId,
        reason
      });
      
      console.log(`✅ Grade ${gradeId}: ${fromStatus} → ${toStatus} by user ${userId}`);
      
      return grade;
    } catch (error) {
      console.error(`❌ Error transitioning grade ${gradeId}:`, error);
      throw error;
    }
  }
  
  /**
   * Bulk transition - Chuyển nhiều grades cùng lúc
   */
  static async bulkTransitionState(gradeIds, toStatus, userId, reason = null) {
    const results = {
      success: [],
      failed: []
    };
    
    for (const gradeId of gradeIds) {
      try {
        await this.transitionState(gradeId, toStatus, userId, reason);
        results.success.push(gradeId);
      } catch (error) {
        results.failed.push({
          gradeId,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  // ===== VERSION CONTROL =====
  
  /**
   * Save current state to history
   */
  static async saveToHistory(grade, userId, changeDescription = null) {
    try {
      await GradeHistory.create({
        gradeId: grade.gradeId,
        version: grade.version || 1,
        txScore: grade.txScore,
        dkScore: grade.dkScore,
        finalScore: grade.finalScore,
        tbktScore: grade.tbktScore,
        tbmhScore: grade.tbmhScore,
        letterGrade: grade.letterGrade,
        isPassed: grade.isPassed,
        notes: grade.notes,
        gradeStatus: grade.gradeStatus,
        editedBy: userId,
        changeDescription: changeDescription || `Version ${grade.version} backup`
      });
      
      console.log(`✅ Saved grade ${grade.gradeId} to history (version ${grade.version})`);
    } catch (error) {
      console.error(`❌ Error saving grade ${grade.gradeId} to history:`, error);
      throw error;
    }
  }
  
  /**
   * Get history of a grade
   */
  static async getHistory(gradeId) {
    return await GradeHistory.findAll({
      where: { gradeId },
      order: [['version', 'DESC']],
      include: [{
        model: User,
        as: 'editor',
        attributes: ['id', 'username', 'fullName', 'email']
      }]
    });
  }
  
  /**
   * Rollback to specific version
   */
  static async rollback(gradeId, toVersion, userId, reason = null) {
    try {
      const historyRecord = await GradeHistory.findOne({
        where: { gradeId, version: toVersion }
      });
      
      if (!historyRecord) {
        throw new Error(`Version ${toVersion} not found for grade ${gradeId}`);
      }
      
      const grade = await Grade.findByPk(gradeId);
      if (!grade) {
        throw new Error(`Grade ${gradeId} not found`);
      }
      
      // Save current state before rollback
      await this.saveToHistory(grade, userId, `Before rollback to version ${toVersion}`);
      
      // Restore from history
      grade.txScore = historyRecord.txScore;
      grade.dkScore = historyRecord.dkScore;
      grade.finalScore = historyRecord.finalScore;
      grade.tbktScore = historyRecord.tbktScore;
      grade.tbmhScore = historyRecord.tbmhScore;
      grade.letterGrade = historyRecord.letterGrade;
      grade.isPassed = historyRecord.isPassed;
      grade.notes = historyRecord.notes;
      grade.gradeStatus = historyRecord.gradeStatus;
      grade.version = (grade.version || 1) + 1;
      grade.lastEditedBy = userId;
      grade.lastEditedAt = new Date();
      await grade.save();
      
      // Log rollback as transition
      await GradeStateTransition.create({
        gradeId: grade.id,
        fromState: grade.gradeStatus,
        toState: historyRecord.gradeStatus,
        triggeredBy: userId,
        reason: reason || `Rolled back to version ${toVersion}`
      });
      
      console.log(`✅ Rolled back grade ${gradeId} to version ${toVersion}`);
      
      return grade;
    } catch (error) {
      console.error(`❌ Error rolling back grade ${gradeId}:`, error);
      throw error;
    }
  }
  
  // ===== LOCKING =====
  
  /**
   * Lock grade for editing
   */
  static async lockGrade(gradeId, userId) {
    const grade = await Grade.findByPk(gradeId);
    if (!grade) {
      throw new Error(`Grade ${gradeId} not found`);
    }
    
    // Check if already locked by someone else
    if (grade.lockedBy && grade.lockedBy !== userId) {
      const locker = await User.findByPk(grade.lockedBy);
      throw new Error(
        `Grade is locked by ${locker?.fullName || 'another user'} at ${grade.lockedAt}`
      );
    }
    
    grade.lockedBy = userId;
    grade.lockedAt = new Date();
    await grade.save();
    
    return grade;
  }
  
  /**
   * Unlock grade
   */
  static async unlockGrade(gradeId, userId, isAdmin = false) {
    const grade = await Grade.findByPk(gradeId);
    if (!grade) {
      throw new Error(`Grade ${gradeId} not found`);
    }
    
    // Only lock owner or admin can unlock
    if (grade.lockedBy !== userId && !isAdmin) {
      throw new Error('You do not have permission to unlock this grade');
    }
    
    grade.lockedBy = null;
    grade.lockedAt = null;
    await grade.save();
    
    return grade;
  }
  
  // ===== STATISTICS =====
  
  /**
   * Get grade statistics by status
   */
  static async getStatisticsByStatus(filters = {}) {
    const { cohortId, classId, subjectId, semester, academicYear } = filters;
    
    const whereClause = {};
    if (cohortId) whereClause.cohortId = cohortId;
    if (classId) whereClause.classId = classId;
    if (subjectId) whereClause.subjectId = subjectId;
    if (semester) whereClause.semester = semester;
    if (academicYear) whereClause.academicYear = academicYear;
    
    const grades = await Grade.findAll({ where: whereClause });
    
    const stats = {
      draft: 0,
      pending_review: 0,
      approved_tx_dk: 0,
      final_entered: 0,
      finalized: 0,
      total: grades.length
    };
    
    grades.forEach(grade => {
      const status = grade.gradeStatus || 'draft';
      stats[status] = (stats[status] || 0) + 1;
    });
    
    return stats;
  }
}

export default GradeStateService;
