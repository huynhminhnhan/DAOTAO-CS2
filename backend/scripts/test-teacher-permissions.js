/**
 * Script to test teacher permissions
 * Run: node scripts/test-teacher-permissions.js
 */

import { 
  getTeacherActivePermissions,
  getTeacherManagedClassIds,
  getTeacherManagedSubjectIds,
  getTeacherManagedStudentIds
} from '../src/middleware/teacherPermissions.js';

async function testPermissions() {
  try {
    // Thay đổi userId này thành ID của teacher bạn muốn test
    const teacherUserId = 2; // VD: teacher với userId = 2
    
    console.log('='.repeat(60));
    console.log(`Testing permissions for teacher userId: ${teacherUserId}`);
    console.log('='.repeat(60));
    
    // 1. Lấy tất cả permissions active
    console.log('\n1. Active Permissions:');
    const permissions = await getTeacherActivePermissions(teacherUserId);
    console.log(`Found ${permissions.length} active permissions`);
    permissions.forEach((perm, index) => {
      console.log(`\nPermission #${index + 1}:`);
      console.log(`  - Class: ${perm.classId || '[ALL]'}`);
      console.log(`  - Subject: ${perm.subjectId || '[ALL]'}`);
      console.log(`  - Cohort: ${perm.cohortId || '[ALL]'}`);
      console.log(`  - Semester: ${perm.semesterId}`);
      console.log(`  - Status: ${perm.status}`);
      console.log(`  - Valid: ${perm.validFrom} to ${perm.validTo}`);
    });
    
    // 2. Lấy danh sách Class IDs
    console.log('\n2. Managed Class IDs:');
    const classIds = await getTeacherManagedClassIds(teacherUserId);
    console.log(classIds === 'all' ? '  [ALL CLASSES]' : `  ${JSON.stringify(classIds)}`);
    
    // 3. Lấy danh sách Subject IDs
    console.log('\n3. Managed Subject IDs:');
    const subjectIds = await getTeacherManagedSubjectIds(teacherUserId);
    console.log(subjectIds === 'all' ? '  [ALL SUBJECTS]' : `  ${JSON.stringify(subjectIds)}`);
    
    // 4. Lấy danh sách Student IDs
    console.log('\n4. Managed Student IDs:');
    const studentIds = await getTeacherManagedStudentIds(teacherUserId);
    console.log(studentIds === 'all' ? '  [ALL STUDENTS]' : `  Count: ${studentIds.length}`);
    if (studentIds !== 'all' && studentIds.length > 0) {
      console.log(`  First 10: ${JSON.stringify(studentIds.slice(0, 10))}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Test completed!');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('Error testing permissions:', error);
    process.exit(1);
  }
}

testPermissions();
