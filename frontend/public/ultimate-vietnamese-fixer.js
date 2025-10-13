/**
 * Ultimate Vietnamese Text Fixer for AdminJS
 * Uses aggressive DOM manipulation to fix Vietnamese text display
 */

(function() {
  'use strict';
  
  
  // Comprehensive text mappings
  const textMappings = {
    // Parent groups (broken Vietnamese)
    'Người Dung': 'Người dùng',
    'Quan Ly He Thong': 'Quản lý Hệ thống',
    'Quản Ly Sinh Vien': 'Quản lý Sinh viên',
    'Quản Ly Giao Vien': 'Quản lý Giáo viên', 
    'Quản Ly Lớp Học': 'Quản lý Lớp học',
    'Quản Ly Mon Học': 'Quản lý Môn học',
    'Quan Ly Diem So': 'Quản lý Điểm số',
    'Cai Dặt Chung' : 'Cài đặt chung',
    'View Transcript': 'Xem bảng điểm',
    'Grade History': 'Lịch sử điểm số',
    '✅ Dang Học' : '✅ Đang học',
    'Teacher Permissions': 'Quản lý quyền người dùng',
    'Teacher Grade Entry': 'Nhập điểm TX & ĐK',
    'Nhập Diểm TX DK': 'Quản lý điểm TX & ĐK',
    'Grade Entry' : 'Nhập điểm',

     
    // Resource names (English) 
    'Users': 'Người dùng',
    'Students': 'Sinh viên',
    'Teachers': 'Giáo viên',
    'Classes': 'Lớp học', 
    'Subjects': 'Môn học',
    'Classubjects': 'Lịch học',
    'Grades': 'Điểm số',
    'Cohorts': 'Khóa',
    'Enrollments': 'Đăng ký môn học',
    'Semesters': 'Học kỳ',
    'Bulk Enroll': 'Đăng ký theo lớp',
    'Manage Teacher Permissions': 'Gán quyền giảng viên',


    // Common UI elements
    'Dashboard': 'Trang chủ',
    'Create new': 'Tạo mới',
    'Edit': 'Chỉnh sửa',
    'Show': 'Xem chi tiết',
    'Delete': 'Xóa',
    'Save': 'Lưu',
    'Cancel': 'Hủy',
    'Filter': 'Lọc',
    'Search': 'Tìm kiếm'
  };
  
  // Aggressive text replacement function
  function forceReplaceText() {
    // Get all text nodes in the document
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    const textNodes = [];
    let node;
    
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    // Replace text in all text nodes
    textNodes.forEach(textNode => {
      let text = textNode.textContent.trim();
      let hasChanged = false;
      
      Object.keys(textMappings).forEach(englishText => {
        if (text === englishText) {
          textNode.textContent = textMappings[englishText];
          hasChanged = true;
        }
      });
      
      if (!hasChanged && text.length > 0) {
        // Check for partial matches and replace
        Object.keys(textMappings).forEach(englishText => {
          if (text.includes(englishText)) {
            textNode.textContent = text.replace(englishText, textMappings[englishText]);
          }
        });
      }
    });
    
    // Also replace innerHTML for elements that might have formatted text
    const importantSelectors = [
      '.sidebar a',
      '.sidebar span', 
      'nav a',
      'nav span',
      '.breadcrumb',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'button',
      '.btn'
    ];
    
    importantSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          let text = element.textContent.trim();
          Object.keys(textMappings).forEach(englishText => {
            if (text === englishText || text.includes(englishText)) {
              element.textContent = text.replace(englishText, textMappings[englishText]);
            }
          });
        });
      } catch (e) {
        console.warn('Error with selector:', selector, e);
      }
    });
  }
  
  // Force CSS override
  function applyCSSOverride() {
    const styleId = 'ultimate-vietnamese-fix';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Ultimate Vietnamese Fix - Override everything */
      * {
        text-transform: none !important;
      }
      
      .sidebar *, nav *, [data-testid="sidebar"] *,
      .admin-layout__sidebar *, .rs-nav *, .rs-sidenav *,
      [class*="styled"] *, [class*="Navigation"] *,
      [class*="Sidebar"] *, [class*="Menu"] * {
        text-transform: none !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        text-rendering: optimizeLegibility !important;
        -webkit-font-smoothing: antialiased !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Main initialization function
  function initUltimateVietnamenseFixer() {
    console.log('🚀 Initializing Ultimate Vietnamese Fixer...');
    
    applyCSSOverride();
    forceReplaceText();
    
    // Set up aggressive monitoring
    const observer = new MutationObserver((mutations) => {
      let shouldFix = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          shouldFix = true;
        }
      });
      
      if (shouldFix) {
        setTimeout(forceReplaceText, 50);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    // Route change detection for SPA
    let currentUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        setTimeout(forceReplaceText, 200);
      }
    }, 100);
    
    // Periodic aggressive fix
    setInterval(forceReplaceText, 2000);
    
    console.log('✅ Ultimate Vietnamese Fixer is active');
  }
  
  // Wait for page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUltimateVietnamenseFixer);
  } else {
    initUltimateVietnamenseFixer();
  }
  
  // Also hook into window load
  window.addEventListener('load', () => {
    setTimeout(initUltimateVietnamenseFixer, 500);
  });
  
})();
