import { TeacherPermission, User, Student } from './src/backend/database/index.js';

async function checkPermissions() {
  try {
    console.log('=== KIỂM TRA LỚP 12 VÀ TEACHER PERMISSIONS ===\n');
    
    // 1. Kiểm tra sinh viên trong lớp 12
    const students = await Student.findAll({
      where: { classId: 12 },
      attributes: ['id', 'studentCode', 'fullName', 'classId'],
      raw: true
    });
    
    console.log('1. Sinh viên trong lớp 12:');
    console.log('   Tổng số:', students.length);
    students.forEach((s, i) => {
      console.log(`   ${i+1}. ID: ${s.id}, Mã: ${s.studentCode}, Tên: ${s.fullName}`);
    });
    
    // 2. Kiểm tra teacher permissions cho lớp 12
    console.log('\n2. Teacher Permissions cho lớp 12:');
    const permissions = await TeacherPermission.findAll({
      where: { classId: 12 },
      raw: true
    });
    
    console.log('   Số lượng permissions:', permissions.length);
    if (permissions.length > 0) {
      permissions.forEach((p, i) => {
        console.log(`\n   ${i+1}. Permission ID: ${p.id}`);
        console.log(`      User ID: ${p.userId}`);
        console.log(`      ClassId: ${p.classId}, SubjectId: ${p.subjectId}`);
        console.log(`      Status: ${p.status}`);
        console.log(`      Valid: ${p.validFrom} -> ${p.validTo}`);
      });
    } else {
      console.log('   Không có permissions nào cho lớp 12!');
    }
    
    // 3. Kiểm tra tất cả permissions trong hệ thống
    console.log('\n3. Tất cả Teacher Permissions:');
    const allPerms = await TeacherPermission.findAll({
      order: [['userId', 'ASC'], ['classId', 'ASC']],
      raw: true
    });
    
    console.log('   Tổng số permissions:', allPerms.length);
    
    if (allPerms.length > 0) {
      const grouped = {};
      allPerms.forEach((p) => {
        if (!grouped[p.userId]) grouped[p.userId] = [];
        grouped[p.userId].push(p);
      });
      
      for (const [userId, perms] of Object.entries(grouped)) {
        console.log(`\n   User ID ${userId}: ${perms.length} permissions`);
        perms.slice(0, 5).forEach(p => {
          console.log(`     - Class: ${p.classId}, Subject: ${p.subjectId}, Status: ${p.status}`);
        });
        if (perms.length > 5) {
          console.log(`     ... và ${perms.length - 5} permissions khác`);
        }
      }
    }
    
    // 4. Kiểm tra teacher accounts
    console.log('\n4. Teacher Accounts:');
    const teachers = await User.findAll({
      where: { role: 'teacher' },
      attributes: ['id', 'username', 'email', 'role'],
      raw: true
    });
    
    console.log('   Số lượng teachers:', teachers.length);
    teachers.forEach(u => {
      console.log(`   - User ID ${u.id}: ${u.username} (${u.email})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Lỗi:', error);
    process.exit(1);
  }
}

checkPermissions();
