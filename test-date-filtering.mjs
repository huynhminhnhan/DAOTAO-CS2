import { TeacherPermission } from './src/backend/database/index.js';
import { Op } from 'sequelize';

async function testDateFiltering() {
  try {
    const now = new Date();
    console.log('=== TEST DATE FILTERING ===\n');
    console.log('Current Date/Time:', now.toISOString());
    console.log('Current Date Only:', now.toISOString().split('T')[0]);
    
    // Test 1: Tất cả permissions
    console.log('\n1. TẤT CẢ PERMISSIONS (không filter):');
    const allPerms = await TeacherPermission.findAll({
      attributes: ['id', 'userId', 'classId', 'subjectId', 'status', 'validFrom', 'validTo'],
      raw: true
    });
    
    allPerms.forEach(p => {
      console.log(`   ID ${p.id}: User ${p.userId}, Class ${p.classId}`);
      console.log(`      Status: ${p.status}`);
      console.log(`      Valid: ${p.validFrom} -> ${p.validTo}`);
      console.log(`      ValidTo >= now? ${new Date(p.validTo) >= now}`);
      console.log(`      ValidFrom <= now? ${new Date(p.validFrom) <= now}`);
    });
    
    // Test 2: Permissions với date filtering
    console.log('\n2. PERMISSIONS với DATE FILTERING (như code hiện tại):');
    const filteredPerms = await TeacherPermission.findAll({
      where: {
        status: 'active',
        validFrom: { [Op.lte]: now },
        validTo: { [Op.gte]: now }
      },
      attributes: ['id', 'userId', 'classId', 'subjectId', 'status', 'validFrom', 'validTo'],
      raw: true
    });
    
    console.log(`   Kết quả: ${filteredPerms.length} permissions`);
    filteredPerms.forEach(p => {
      console.log(`   ID ${p.id}: User ${p.userId}, Class ${p.classId}`);
    });
    
    // Test 3: Permissions cho User ID 2
    console.log('\n3. PERMISSIONS cho User ID 2 (sv001):');
    const user2Perms = await TeacherPermission.findAll({
      where: {
        userId: 2,
        status: 'active',
        validFrom: { [Op.lte]: now },
        validTo: { [Op.gte]: now }
      },
      attributes: ['id', 'userId', 'classId', 'subjectId', 'status', 'validFrom', 'validTo'],
      raw: true
    });
    
    console.log(`   Kết quả: ${user2Perms.length} permissions`);
    user2Perms.forEach(p => {
      console.log(`   ID ${p.id}: Class ${p.classId}, Subject ${p.subjectId}`);
    });
    
    // Test 4: Permissions cho User ID 10
    console.log('\n4. PERMISSIONS cho User ID 10 (nhanhuynh):');
    const user10Perms = await TeacherPermission.findAll({
      where: {
        userId: 10,
        status: 'active',
        validFrom: { [Op.lte]: now },
        validTo: { [Op.gte]: now }
      },
      attributes: ['id', 'userId', 'classId', 'subjectId', 'status', 'validFrom', 'validTo'],
      raw: true
    });
    
    console.log(`   Kết quả: ${user10Perms.length} permissions`);
    user10Perms.forEach(p => {
      console.log(`   ID ${p.id}: Class ${p.classId}, Subject ${p.subjectId}`);
    });
    
    console.log('\n===============================================');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ LỖI:', error);
    process.exit(1);
  }
}

testDateFiltering();
