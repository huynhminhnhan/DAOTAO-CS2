#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../src/backend/database/index.js';

const checkDatabaseStatus = async () => {
  try {
    console.log('🔍 Checking database status...');
    
    // 1. Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // 2. Check existing tables
    console.log('\n📋 Checking existing tables...');
    const [tables] = await sequelize.query("SHOW TABLES");
    const tableNames = tables.map(t => Object.values(t)[0]);
    
    console.log('📊 Existing tables:');
    tableNames.forEach(name => {
      if (name.toLowerCase().includes('grade')) {
        console.log(`  ✅ ${name}`);
      } else {
        console.log(`  📋 ${name}`);
      }
    });
    
    // 3. Check if GradeRetakes exists
    const hasGradeRetakes = tableNames.includes('GradeRetakes');
    console.log(`\n🎯 GradeRetakes table: ${hasGradeRetakes ? '✅ EXISTS' : '❌ NOT EXISTS'}`);
    
    // 4. Check Grades table structure
    if (tableNames.includes('Grades')) {
      console.log('\n🔍 Checking Grades table structure...');
      const gradesColumns = await sequelize.getQueryInterface().describeTable('Grades');
      
      const retakeColumns = ['attempt_number', 'is_retake', 'retake_type', 'retake_reason'];
      retakeColumns.forEach(col => {
        const exists = gradesColumns[col] ? '✅' : '❌';
        console.log(`  ${exists} ${col}`);
      });
    }
    
    // 5. Check GradeRetakes structure if exists
    if (hasGradeRetakes) {
      console.log('\n🔍 Checking GradeRetakes table structure...');
      const retakeColumns = await sequelize.getQueryInterface().describeTable('GradeRetakes');
      console.log('  📊 Columns:', Object.keys(retakeColumns).length);
      
      // Check indexes
      const [indexes] = await sequelize.query("SHOW INDEXES FROM GradeRetakes");
      console.log(`  🔍 Indexes: ${indexes.length}`);
      indexes.forEach(idx => {
        console.log(`    - ${idx.Key_name} on ${idx.Column_name}`);
      });
    }
    
    console.log('\n🎯 Status Summary:');
    console.log(`  📋 Total tables: ${tableNames.length}`);
    console.log(`  ✅ Grades table: ${tableNames.includes('Grades') ? 'EXISTS' : 'NOT EXISTS'}`);
    console.log(`  ✅ GradeRetakes table: ${hasGradeRetakes ? 'EXISTS' : 'NOT EXISTS'}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
};

checkDatabaseStatus();
