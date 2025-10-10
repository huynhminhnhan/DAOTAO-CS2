#!/usr/bin/env node

/**
 * DRY RUN - KIỂM TRA MIGRATION KHÔNG THỰC SỰ DI CHUYỂN FILES
 * Chạy script này để xem migration sẽ làm gì trước khi thực sự chạy
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`
${colors.cyan}${colors.bright}
╔═══════════════════════════════════════════════════════════╗
║              DRY RUN - MIGRATION PREVIEW                  ║
║         (Không thực sự di chuyển files)                   ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}
`);

// Migration plan
const MIGRATION_PLAN = {
  frontend: {
    base: 'frontend',
    items: [
      'public/',
      'src/components/',
      'src/config/api.config.js',
      'src/utils/gradeCalculation.js',
      'src/frontend/ → src/bundled/',
    ]
  },
  backend: {
    base: 'backend',
    items: [
      'src/config/ (except api.config.js)',
      'src/controllers/',
      'src/routes/',
      'src/services/',
      'src/repositories/',
      'src/middleware/',
      'src/resources/',
      'src/backend/database/ → src/database/',
      'src/utils/ (except gradeCalculation.js)',
      'config/',
      'utils/',
      'scripts/ (except migrate-structure.js)',
      'app.js',
      '.env',
      '.env.example',
      '.sequelizerc',
    ]
  },
  docs: {
    base: 'docs',
    items: [
      'ARCHITECTURE.md',
      'BULK-ENROLLMENT-FIX.md',
      'DATABASE-SCHEMA.md',
      'DYNAMIC-GRADE-TABLE.md',
      'ENROLLMENT-DISPLAY-FIX.md',
      'RETAKE-SYSTEM.md',
      'TEACHER-PERMISSION-IMPLEMENTATION.md',
      'ROUTES-REFACTORING-FINAL.md',
    ]
  }
};

function checkExists(itemPath) {
  const fullPath = path.join(PROJECT_ROOT, itemPath);
  return fs.existsSync(fullPath);
}

function getFileCount(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  if (fs.statSync(dirPath).isFile()) return 1;
  
  let count = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      count += getFileCount(fullPath);
    } else {
      count++;
    }
  }
  
  return count;
}

// Check git status
console.log(`${colors.cyan}1. GIT STATUS:${colors.reset}`);
try {
  const { execSync } = require('child_process');
  const status = execSync('git status --porcelain', { encoding: 'utf-8' });
  
  if (status.trim()) {
    console.log(`${colors.red}   ⚠️  Repository có uncommitted changes!${colors.reset}`);
    console.log(`${colors.yellow}   Bạn PHẢI commit trước khi chạy migration thực sự.${colors.reset}\n`);
    console.log(status);
  } else {
    console.log(`${colors.green}   ✓ Git working tree clean${colors.reset}\n`);
  }
} catch (error) {
  console.log(`${colors.yellow}   ⚠️  Không phải git repository${colors.reset}\n`);
}

// Preview Frontend migration
console.log(`${colors.cyan}2. FRONTEND (→ ${MIGRATION_PLAN.frontend.base}/)${colors.reset}`);
MIGRATION_PLAN.frontend.items.forEach(item => {
  const sourcePath = item.replace(/ →.*$/, '').trim();
  const exists = checkExists(sourcePath);
  const icon = exists ? colors.green + '✓' : colors.red + '✗';
  const status = exists ? `${colors.green}EXISTS${colors.reset}` : `${colors.yellow}NOT FOUND${colors.reset}`;
  
  if (exists && sourcePath.endsWith('/')) {
    const count = getFileCount(path.join(PROJECT_ROOT, sourcePath));
    console.log(`   ${icon}${colors.reset} ${item} [${status}] (${count} files)`);
  } else {
    console.log(`   ${icon}${colors.reset} ${item} [${status}]`);
  }
});

// Preview Backend migration
console.log(`\n${colors.cyan}3. BACKEND (→ ${MIGRATION_PLAN.backend.base}/)${colors.reset}`);
MIGRATION_PLAN.backend.items.forEach(item => {
  const sourcePath = item.replace(/ →.*$/, '').replace(/ \(.*\)$/, '').trim();
  const exists = checkExists(sourcePath);
  const icon = exists ? colors.green + '✓' : colors.red + '✗';
  const status = exists ? `${colors.green}EXISTS${colors.reset}` : `${colors.yellow}NOT FOUND${colors.reset}`;
  
  if (exists && sourcePath.endsWith('/')) {
    const count = getFileCount(path.join(PROJECT_ROOT, sourcePath));
    console.log(`   ${icon}${colors.reset} ${item} [${status}] (${count} files)`);
  } else {
    console.log(`   ${icon}${colors.reset} ${item} [${status}]`);
  }
});

// Preview Docs migration
console.log(`\n${colors.cyan}4. DOCUMENTATION (→ ${MIGRATION_PLAN.docs.base}/)${colors.reset}`);
MIGRATION_PLAN.docs.items.forEach(item => {
  const exists = checkExists(item);
  const icon = exists ? colors.green + '✓' : colors.red + '✗';
  const status = exists ? `${colors.green}EXISTS${colors.reset}` : `${colors.yellow}NOT FOUND${colors.reset}`;
  console.log(`   ${icon}${colors.reset} ${item} [${status}]`);
});

// Summary
console.log(`\n${colors.cyan}${colors.bright}5. SUMMARY:${colors.reset}`);

const totalFrontendFiles = MIGRATION_PLAN.frontend.items
  .map(item => item.replace(/ →.*$/, '').trim())
  .filter(item => checkExists(item))
  .reduce((sum, item) => sum + getFileCount(path.join(PROJECT_ROOT, item)), 0);

const totalBackendFiles = MIGRATION_PLAN.backend.items
  .map(item => item.replace(/ →.*$/, '').replace(/ \(.*\)$/, '').trim())
  .filter(item => checkExists(item))
  .reduce((sum, item) => sum + getFileCount(path.join(PROJECT_ROOT, item)), 0);

const totalDocsFiles = MIGRATION_PLAN.docs.items
  .filter(item => checkExists(item))
  .length;

console.log(`   ${colors.yellow}Frontend:${colors.reset} ~${totalFrontendFiles} files will be moved`);
console.log(`   ${colors.yellow}Backend:${colors.reset} ~${totalBackendFiles} files will be moved`);
console.log(`   ${colors.yellow}Docs:${colors.reset} ${totalDocsFiles} files will be moved`);
console.log(`   ${colors.bright}Total:${colors.reset} ~${totalFrontendFiles + totalBackendFiles + totalDocsFiles} files`);

// Warnings
console.log(`\n${colors.yellow}${colors.bright}⚠️  IMPORTANT NOTES:${colors.reset}`);
console.log(`   1. Script sẽ tạo BACKUP tự động trước khi di chuyển`);
console.log(`   2. Import paths có thể cần cập nhật thủ công sau khi migration`);
console.log(`   3. PHẢI commit code trước khi chạy migration thực sự`);
console.log(`   4. Test ứng dụng sau migration để đảm bảo mọi thứ hoạt động`);

// Next steps
console.log(`\n${colors.green}${colors.bright}✓ DRY RUN COMPLETED${colors.reset}`);
console.log(`\n${colors.cyan}NEXT STEPS:${colors.reset}`);
console.log(`   1. Review migration plan phía trên`);
console.log(`   2. Commit code: ${colors.yellow}git add . && git commit -m "Before migration"${colors.reset}`);
console.log(`   3. Chạy migration: ${colors.yellow}node scripts/migrate-structure.js${colors.reset}`);
console.log(`\n`);
