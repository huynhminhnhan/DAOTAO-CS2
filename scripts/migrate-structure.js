#!/usr/bin/env node

/**
 * PROJECT STRUCTURE MIGRATION SCRIPT
 * Tái cấu trúc project thành Frontend/Backend riêng biệt
 * 
 * CẢNH BÁO: Script này sẽ di chuyển files. Vui lòng commit code trước khi chạy!
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.cyan}${colors.bright}▶ ${msg}${colors.reset}`),
};

// Migration plan
const MIGRATION_PLAN = {
  frontend: {
    base: 'frontend',
    folders: [
      { from: 'public', to: 'public' },
      { from: 'src/components', to: 'src/components' },
      { from: 'src/config/api.config.js', to: 'src/config/api.config.js' },
      { from: 'src/utils/gradeCalculation.js', to: 'src/utils/gradeCalculation.js' },
      { from: 'src/frontend', to: 'src/bundled' }, // AdminJS bundled code
    ]
  },
  backend: {
    base: 'backend',
    folders: [
      { from: 'src/config', to: 'src/config', exclude: ['api.config.js'] },
      { from: 'src/controllers', to: 'src/controllers' },
      { from: 'src/routes', to: 'src/routes' },
      { from: 'src/services', to: 'src/services' },
      { from: 'src/repositories', to: 'src/repositories' },
      { from: 'src/middleware', to: 'src/middleware' },
      { from: 'src/resources', to: 'src/resources' },
      { from: 'src/backend/database', to: 'src/database' },
      { from: 'src/utils', to: 'src/utils', exclude: ['gradeCalculation.js'] },
      { from: 'config', to: 'config' },
      { from: 'utils', to: 'utils' },
      { from: 'scripts', to: 'scripts', exclude: ['migrate-structure.js'] },
    ],
    files: [
      'app.js',
      '.env',
      '.env.example',
      '.sequelizerc',
    ]
  },
  docs: {
    base: 'docs',
    files: [
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

/**
 * Check if git repository has uncommitted changes
 */
async function checkGitStatus() {
  try {
    const { execSync } = await import('child_process');
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    
    if (status.trim()) {
      log.warning('Git repository có uncommitted changes!');
      log.warning('Danh sách files thay đổi:');
      console.log(status);
      return false;
    }
    
    log.success('Git repository sạch (no uncommitted changes)');
    return true;
  } catch (error) {
    log.warning('Không thể kiểm tra git status (có thể không phải git repo)');
    return true; // Continue anyway if not a git repo
  }
}

/**
 * Create backup of current structure
 */
function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(PROJECT_ROOT, `backup-${timestamp}`);
  
  log.info(`Tạo backup tại: ${backupDir}`);
  
  try {
    // Create backup directory
    fs.mkdirSync(backupDir, { recursive: true });
    
    // Copy important files
    const filesToBackup = [
      'package.json',
      'app.js',
      '.env',
      'src'
    ];
    
    filesToBackup.forEach(file => {
      const source = path.join(PROJECT_ROOT, file);
      const dest = path.join(backupDir, file);
      
      if (fs.existsSync(source)) {
        if (fs.statSync(source).isDirectory()) {
          copyDir(source, dest);
        } else {
          fs.copyFileSync(source, dest);
        }
      }
    });
    
    log.success(`Backup hoàn tất tại: ${backupDir}`);
    return backupDir;
  } catch (error) {
    log.error(`Lỗi khi tạo backup: ${error.message}`);
    throw error;
  }
}

/**
 * Copy directory recursively
 */
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Move directory with exclusions
 */
function moveFolder(fromPath, toPath, excludeFiles = []) {
  const sourcePath = path.join(PROJECT_ROOT, fromPath);
  const destPath = path.join(PROJECT_ROOT, toPath);
  
  if (!fs.existsSync(sourcePath)) {
    log.warning(`Source không tồn tại: ${fromPath}`);
    return false;
  }
  
  // Create destination directory
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  
  // If source is a file
  if (fs.statSync(sourcePath).isFile()) {
    fs.copyFileSync(sourcePath, destPath);
    log.success(`Moved file: ${fromPath} → ${toPath}`);
    return true;
  }
  
  // If source is a directory
  fs.mkdirSync(destPath, { recursive: true });
  
  const entries = fs.readdirSync(sourcePath, { withFileTypes: true });
  
  for (const entry of entries) {
    if (excludeFiles.includes(entry.name)) {
      log.info(`Skipped (excluded): ${entry.name}`);
      continue;
    }
    
    const srcPath = path.join(sourcePath, entry.name);
    const dstPath = path.join(destPath, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
  
  log.success(`Moved folder: ${fromPath} → ${toPath}`);
  return true;
}

/**
 * Update import paths in files
 */
function updateImportPaths(directory, oldBase, newBase) {
  log.step(`Updating import paths in ${directory}...`);
  
  const files = getAllFiles(directory, ['.js', '.jsx']);
  let updatedCount = 0;
  
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    const originalContent = content;
    
    // Update relative imports
    // Example: '../config/api.config' → '../../backend/src/config/api.config' (if in frontend)
    
    // For now, just log files that might need manual update
    if (content.includes('import') || content.includes('require')) {
      const relativeImports = content.match(/from\s+['"]\.\.?\/.+['"]|require\(['"]\.\.?\/.+['"]\)/g);
      if (relativeImports) {
        log.info(`  File may need import path update: ${path.relative(PROJECT_ROOT, file)}`);
        updatedCount++;
      }
    }
  });
  
  if (updatedCount > 0) {
    log.warning(`${updatedCount} files may need manual import path updates`);
  } else {
    log.success('No import path updates needed');
  }
}

/**
 * Get all files with specific extensions
 */
function getAllFiles(dir, extensions = []) {
  const files = [];
  
  if (!fs.existsSync(dir)) return files;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, extensions));
    } else if (extensions.length === 0 || extensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Create package.json files for frontend and backend
 */
function createPackageJsonFiles() {
  log.step('Creating package.json files...');
  
  // Read original package.json
  const originalPkg = JSON.parse(
    fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf-8')
  );
  
  // Backend package.json
  const backendPkg = {
    ...originalPkg,
    name: `${originalPkg.name}-backend`,
    description: `${originalPkg.description} - Backend`,
    main: 'app.js',
    scripts: {
      start: 'node app.js',
      dev: 'NODE_ENV=development nodemon app.js --watch src --ext js,jsx,json',
      'db:migrate': 'npx sequelize-cli db:migrate',
      'db:seed': 'npx sequelize-cli db:seed:all',
    }
  };
  
  fs.writeFileSync(
    path.join(PROJECT_ROOT, 'backend', 'package.json'),
    JSON.stringify(backendPkg, null, 2)
  );
  
  log.success('Created backend/package.json');
  
  // Frontend package.json (minimal, since AdminJS bundles it)
  const frontendPkg = {
    name: `${originalPkg.name}-frontend`,
    version: originalPkg.version,
    description: `${originalPkg.description} - Frontend`,
    type: 'module',
    dependencies: {
      'react': originalPkg.dependencies.react,
      'react-dom': originalPkg.dependencies['react-dom'],
      'adminjs': originalPkg.dependencies.adminjs,
    }
  };
  
  fs.writeFileSync(
    path.join(PROJECT_ROOT, 'frontend', 'package.json'),
    JSON.stringify(frontendPkg, null, 2)
  );
  
  log.success('Created frontend/package.json');
}

/**
 * Create README files
 */
function createReadmeFiles() {
  log.step('Creating README files...');
  
  // Root README
  const rootReadme = `# Student Management System

Hệ thống quản lý điểm sinh viên với kiến trúc tách biệt Frontend/Backend.

## 📁 Cấu trúc Project

\`\`\`
├── frontend/          # React components & UI
├── backend/           # Express server & API
├── docs/              # Documentation
└── README.md
\`\`\`

## 🚀 Quick Start

### Backend
\`\`\`bash
cd backend
npm install
npm run dev
\`\`\`

### Frontend
AdminJS tự động bundle React components từ \`frontend/src/components/\`

## 📚 Documentation

Xem thêm tài liệu trong folder \`docs/\`
`;
  
  fs.writeFileSync(path.join(PROJECT_ROOT, 'README.md'), rootReadme);
  log.success('Created root README.md');
  
  // Backend README
  const backendReadme = `# Backend - Student Management System

Express.js server với AdminJS v7.

## 🏗️ Structure

\`\`\`
backend/
├── src/
│   ├── config/       # Server configurations
│   ├── controllers/  # Request handlers
│   ├── routes/       # API routes
│   ├── services/     # Business logic
│   ├── repositories/ # Database queries
│   ├── middleware/   # Express middleware
│   ├── resources/    # AdminJS resources
│   ├── database/     # Models, migrations, seeders
│   └── utils/        # Utilities
├── config/           # Database config
├── app.js            # Entry point
└── package.json
\`\`\`

## 🚀 Development

\`\`\`bash
npm run dev
\`\`\`

Server runs on http://localhost:3000
`;
  
  fs.writeFileSync(path.join(PROJECT_ROOT, 'backend', 'README.md'), backendReadme);
  log.success('Created backend/README.md');
  
  // Frontend README
  const frontendReadme = `# Frontend - Student Management System

React components cho AdminJS.

## 📁 Structure

\`\`\`
frontend/
├── src/
│   ├── components/   # React components (.jsx)
│   ├── config/       # API endpoints config
│   └── utils/        # Frontend utilities
├── public/           # Static assets
└── package.json
\`\`\`

## 🔧 Development

Components được AdminJS tự động bundle và serve từ backend.

Không cần build riêng. Mọi thay đổi trong components sẽ tự động được AdminJS detect và rebuild.
`;
  
  fs.writeFileSync(path.join(PROJECT_ROOT, 'frontend', 'README.md'), frontendReadme);
  log.success('Created frontend/README.md');
}

/**
 * Main migration function
 */
async function migrate() {
  console.log(`
${colors.cyan}${colors.bright}
╔═══════════════════════════════════════════════════════════╗
║       PROJECT STRUCTURE MIGRATION SCRIPT                  ║
║       Frontend/Backend Separation                         ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}
`);
  
  try {
    // Step 1: Check git status
    log.step('Step 1: Kiểm tra Git status');
    const isClean = await checkGitStatus();
    
    if (!isClean) {
      log.error('Vui lòng commit hoặc stash changes trước khi chạy migration!');
      log.info('Run: git add . && git commit -m "Before structure migration"');
      process.exit(1);
    }
    
    // Step 2: Create backup
    log.step('Step 2: Tạo backup');
    const backupDir = createBackup();
    
    // Step 3: Create new directories
    log.step('Step 3: Tạo cấu trúc mới');
    fs.mkdirSync(path.join(PROJECT_ROOT, 'frontend', 'src'), { recursive: true });
    fs.mkdirSync(path.join(PROJECT_ROOT, 'backend', 'src'), { recursive: true });
    fs.mkdirSync(path.join(PROJECT_ROOT, 'docs'), { recursive: true });
    log.success('Created new directory structure');
    
    // Step 4: Move Frontend files
    log.step('Step 4: Di chuyển Frontend files');
    MIGRATION_PLAN.frontend.folders.forEach(({ from, to }) => {
      const destPath = path.join(MIGRATION_PLAN.frontend.base, to);
      moveFolder(from, destPath);
    });
    
    // Step 5: Move Backend files
    log.step('Step 5: Di chuyển Backend files');
    MIGRATION_PLAN.backend.folders.forEach(({ from, to, exclude = [] }) => {
      const destPath = path.join(MIGRATION_PLAN.backend.base, to);
      moveFolder(from, destPath, exclude);
    });
    
    MIGRATION_PLAN.backend.files.forEach(file => {
      const destPath = path.join(MIGRATION_PLAN.backend.base, file);
      moveFolder(file, destPath);
    });
    
    // Step 6: Move Documentation files
    log.step('Step 6: Di chuyển Documentation files');
    MIGRATION_PLAN.docs.files.forEach(file => {
      const destPath = path.join(MIGRATION_PLAN.docs.base, file);
      if (fs.existsSync(path.join(PROJECT_ROOT, file))) {
        moveFolder(file, destPath);
      }
    });
    
    // Step 7: Create package.json files
    log.step('Step 7: Tạo package.json files');
    createPackageJsonFiles();
    
    // Step 8: Create README files
    log.step('Step 8: Tạo README files');
    createReadmeFiles();
    
    // Step 9: Check import paths
    log.step('Step 9: Kiểm tra import paths');
    log.warning('⚠️  LƯU Ý: Import paths có thể cần cập nhật thủ công!');
    log.info('Các import từ frontend sang backend hoặc ngược lại cần được kiểm tra.');
    
    // Success summary
    console.log(`
${colors.green}${colors.bright}
╔═══════════════════════════════════════════════════════════╗
║                   ✓ MIGRATION HOÀN TẤT!                   ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}

${colors.cyan}📁 Cấu trúc mới:${colors.reset}
  ├── ${colors.yellow}frontend/${colors.reset}  (React components, public assets)
  ├── ${colors.yellow}backend/${colors.reset}   (Express server, API, database)
  └── ${colors.yellow}docs/${colors.reset}      (Documentation)

${colors.cyan}📦 Backup:${colors.reset} ${backupDir}

${colors.yellow}⚠️  NEXT STEPS:${colors.reset}
1. ${colors.bright}Kiểm tra import paths${colors.reset} trong các files (đặc biệt .jsx)
2. ${colors.bright}Cập nhật app.js${colors.reset} nếu cần (component paths)
3. ${colors.bright}Test ứng dụng${colors.reset}: cd backend && npm install && npm run dev
4. ${colors.bright}Commit changes${colors.reset}: git add . && git commit -m "Restructure: Separate frontend/backend"

${colors.green}✓ Migration script completed successfully!${colors.reset}
`);
    
  } catch (error) {
    log.error(`Migration failed: ${error.message}`);
    console.error(error);
    log.info('Bạn có thể restore từ backup nếu cần.');
    process.exit(1);
  }
}

// Run migration
migrate();
