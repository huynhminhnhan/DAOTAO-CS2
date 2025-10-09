/**
 * Debug script - Kiểm tra vị trí của students ID 10, 31, 52 trong danh sách
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sequelize from './src/backend/database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function checkStudentPositions() {
  try {
    console.log('📊 Checking student positions in database...\n');

    // Load tất cả students, sorted như AdminJS
    const { Student } = await import('./src/backend/database/index.js');
    
    const allStudents = await Student.findAll({
      order: [['id', 'ASC']], // Default order của AdminJS
      attributes: ['id', 'studentCode', 'fullName', 'classId']
    });

    console.log(`Total students: ${allStudents.length}\n`);

    // Tìm vị trí của 3 students
    const targetIds = [10, 31, 52];
    
    allStudents.forEach((student, index) => {
      if (targetIds.includes(student.id)) {
        console.log(`✅ Student ID ${student.id} (${student.studentCode} - ${student.fullName})`);
        console.log(`   Position: ${index + 1} (Page ${Math.ceil((index + 1) / 10)})`);
        console.log(`   Class ID: ${student.classId}\n`);
      }
    });

    // Kiểm tra first 10 records
    console.log('📋 First 10 records (Page 1):');
    const first10 = allStudents.slice(0, 10);
    first10.forEach((s, i) => {
      const marker = targetIds.includes(s.id) ? '✅' : '  ';
      console.log(`${marker} ${i + 1}. ID ${s.id} - ${s.studentCode} (Class ${s.classId})`);
    });

    console.log('\n❌ Kết luận:');
    console.log('AdminJS chỉ load 10 records đầu tiên (Page 1)');
    console.log('after hook chỉ lọc được trong 10 records đó');
    console.log('Nếu student ID 31 và 52 ở page 2 trở đi => KHÔNG THỂ hiển thị được\n');

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStudentPositions();
