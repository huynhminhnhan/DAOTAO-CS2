#!/usr/bin/env node

/**
 * Script tự động sửa tất cả import paths sau khi migration
 * Thay đổi: ../backend/database → ../database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

let totalFixed = 0;

function fixImportsInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Tìm và thay thế các pattern
    const patterns = [
      { from: /from ['"]\.\.\/backend\/database/g, to: "from '../database" },
      { from: /from ['"]\.\.\/\.\.\/backend\/database/g, to: "from '../../database" },
      { from: /from ['"]\.\.\/backend\/middleware/g, to: "from '../middleware" },
      { from: /from ['"]\.\.\/\.\.\/backend\/middleware/g, to: "from '../../middleware" },
      { from: /from ['"]\.\.\/backend\/utils/g, to: "from '../utils" },
    ];
    
    let newContent = content;
    let hasChanges = false;
    
    patterns.forEach(({ from, to }) => {
      if (from.test(newContent)) {
        newContent = newContent.replace(from, to);
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`${colors.green}✓${colors.reset} Fixed: ${path.relative(BACKEND_ROOT, filePath)}`);
      totalFixed++;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`${colors.yellow}⚠${colors.reset} Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function walkDirectory(dir, callback) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      if (file.name !== 'node_modules' && file.name !== '.git') {
        walkDirectory(fullPath, callback);
      }
    } else if (file.name.endsWith('.js')) {
      callback(fullPath);
    }
  }
}

console.log(`${colors.cyan}${colors.bright}🔧 Fixing import paths in backend...${colors.reset}\n`);

// Sửa trong src/
const srcDir = path.join(BACKEND_ROOT, 'src');
if (fs.existsSync(srcDir)) {
  walkDirectory(srcDir, fixImportsInFile);
}

console.log(`\n${colors.green}${colors.bright}✓ Fixed ${totalFixed} files${colors.reset}\n`);
