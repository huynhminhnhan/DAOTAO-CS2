/**
 * Test script for submitForReview method
 */

import GradeStateService from '../src/services/GradeStateService.js';
import { Grade, sequelize } from '../src/backend/database/index.js';

async function testSubmitForReview() {
  try {
    console.log('🧪 Testing submitForReview method...\n');
    
    // Find a grade with draft status
    const draftGrade = await Grade.findOne({
      where: {
        gradeStatus: 'draft'
      }
    });
    
    if (!draftGrade) {
      console.log('⚠️  No draft grades found. Creating a test grade...');
      
      // Create a test grade
      const testGrade = await Grade.create({
        studentId: 1,
        subjectId: 1,
        semester: 'HK1',
        academicYear: '2024-25',
        classId: 1,
        txScore: 8.5,
        dkScore: 7.0,
        gradeStatus: 'draft',
        createdBy: 1,
        lastEditedBy: 1
      });
      
      console.log(`✅ Created test grade ID: ${testGrade.id}`);
      
      // Test submitForReview
      console.log('\n📤 Testing submitForReview...');
      const result = await GradeStateService.submitForReview(
        testGrade.id,
        1,
        'Test submission'
      );
      
      console.log('✅ submitForReview succeeded!');
      console.log('📊 Result:', {
        gradeId: result.id,
        gradeStatus: result.gradeStatus,
        txLocked: result.txLocked,
        dkLocked: result.dkLocked,
        submittedForReviewAt: result.submittedForReviewAt,
        version: result.version
      });
      
    } else {
      console.log(`✅ Found draft grade ID: ${draftGrade.id}`);
      console.log('Current status:', draftGrade.gradeStatus);
      
      // Test submitForReview
      console.log('\n📤 Testing submitForReview...');
      const result = await GradeStateService.submitForReview(
        draftGrade.id,
        1,
        'Test submission'
      );
      
      console.log('✅ submitForReview succeeded!');
      console.log('📊 Result:', {
        gradeId: result.id,
        gradeStatus: result.gradeStatus,
        txLocked: result.txLocked,
        dkLocked: result.dkLocked,
        submittedForReviewAt: result.submittedForReviewAt,
        version: result.version
      });
    }
    
    console.log('\n✅ All tests passed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run test
testSubmitForReview();
