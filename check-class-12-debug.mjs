import { TeacherPermission, User, Student, Class } from './src/backend/database/index.js';

async function checkClass12Permissions() {
  try {
    console.log('=== KIỂM TRA LỚP 12 VÀ TEACHER PERMISSIONS ===\n');
    
    // 1. Kiểm tra sinh viên trong lớp 12
    const students = await Student.findAll({
      where: { classId: 12 },
      attributes: ['id', 'studentCode', 'fullName', 'classId'],
      order: [['id', 'ASC']],
      raw: true
    });
    
    console.log('1. SINH VIÊN trong lớp 12:');
    console.log('   Tổng số:', students.length);
    students.forEach((s, i) => {
      console.log(`   ${i+1}. ID: ${s.id}, Mã: ${s.studentCode}, Tên: ${s.fullName}`);
    });
    
    // 2. Kiểm tra thông tin lớp
    const classInfo = await Class.findByPk(12, { raw: true });
    console.log('\n2. THÔNG TIN LỚP 12:');
    console.log('   ID:', classInfo.id);
    console.log('   Code:', classInfo.classCode);
    console.log('   Name:', classInfo.className);
    console.log('   Current Students:', classInfo.currentStudents);
    
    // 3. Kiểm tra teacher permissions có classId = 12
    console.log('\n3. TEACHER PERMISSIONS cho lớp 12:');
    const perms12 = await TeacherPermission.findAll({
      where: { classId: 12 },
      raw: true
    });
    
    if (perms12.length === 0) {
      console.log('   ❌ KHÔNG CÓ permissions nào cho lớp 12!');
    } else {
      console.log(`   ✅ Có ${perms12.length} permission(s):`);
      perms12.forEach((p, i) => {
        console.log(`\n   ${i+1}. Permission ID: ${p.id}`);
        console.log(`      User ID: ${p.userId}`);
        console.log(`      Class ID: ${p.classId}`);
        console.log(`      Subject ID: ${p.subjectId}`);
        console.log(`      Status: ${p.status}`);
        console.log(`      Valid: ${p.validFrom} -> ${p.validTo}`);
      });
    }
    
    // 4. Kiểm tra teacher permissions có classId = null (all classes)
    console.log('\n4. TEACHER PERMISSIONS với classId = NULL (all classes):');
    const permsAll = await TeacherPermission.findAll({
      where: { classId: null },
      raw: true
    });
    
    if (permsAll.length > 0) {
      console.log(`   ✅ Có ${permsAll.length} permission(s) cho TẤT CẢ lớp:`);
      permsAll.forEach((p, i) => {
        console.log(`   ${i+1}. User ID: ${p.userId}, Status: ${p.status}`);
      });
    } else {
      console.log('   Không có permissions cho tất cả lớp');
    }
    
    // 5. Tất cả teacher permissions
    console.log('\n5. TẤT CẢ TEACHER PERMISSIONS:');
    const allPerms = await TeacherPermission.findAll({
      order: [['userId', 'ASC'], ['classId', 'ASC']],
      raw: true
    });
    
    if (allPerms.length === 0) {
      console.log('   ❌ KHÔNG CÓ permissions nào trong hệ thống!');
    } else {
      console.log(`   Tổng số: ${allPerms.length} permissions`);
      
      const grouped = {};
      allPerms.forEach((p) => {
        if (!grouped[p.userId]) grouped[p.userId] = [];
        grouped[p.userId].push(p);
      });
      
      for (const [userId, perms] of Object.entries(grouped)) {
        console.log(`\n   User ID ${userId}: ${perms.length} permissions`);
        perms.slice(0, 3).forEach(p => {
          console.log(`     - Class: ${p.classId}, Subject: ${p.subjectId}, Status: ${p.status}`);
        });
        if (perms.length > 3) {
          console.log(`     ... và ${perms.length - 3} permissions khác`);
        }
      }
    }
    
    // 6. Teacher accounts
    console.log('\n6. TEACHER ACCOUNTS:');
    const teachers = await User.findAll({
      where: { role: 'teacher' },
      attributes: ['id', 'username', 'email', 'role'],
      order: [['id', 'ASC']],
      raw: true
    });
    
    if (teachers.length > 0) {
      console.log(`   Tổng số: ${teachers.length} teachers`);
      teachers.forEach(u => {
        console.log(`   - User ID ${u.id}: ${u.username} (${u.email})`);
      });
    } else {
      console.log('   ❌ Không có teacher accounts!');
    }
    
    console.log('\n===============================================');
    console.log('KẾT LUẬN:');
    console.log(`- Lớp 12 có ${students.length} sinh viên`);
    console.log(`- Có ${perms12.length} permissions cho lớp 12`);
    console.log(`- Có ${permsAll.length} permissions cho TẤT CẢ lớp`);
    console.log(`- Tổng số permissions: ${allPerms.length}`);
    console.log(`- Tổng số teachers: ${teachers.length}`);
    console.log('===============================================');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ LỖI:', error);
    process.exit(1);
  }
}

checkClass12Permissions();
