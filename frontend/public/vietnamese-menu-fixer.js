/**
 * Vietnamese Menu Text Fixer for AdminJS
 * Force replaces text content after AdminJS renders
 */

// Mapping of English/broken text to correct Vietnamese
const vietnameseMenuMapping = {
  // Parent menu groups
  'Quan Ly He Thong': 'Quản lý Hệ thống',
  'Quan Ly Sinh Vien': 'Quản lý Sinh viên', 
  'Quan Ly Giao Vien': 'Quản lý Giáo viên',
  'Quan Ly Lop Hoc': 'Quản lý Lớp học',
  'Quan Ly Mon Hoc': 'Quản lý Môn học',
  'Quan Ly Diem So': 'Quản lý Điểm số',
  'Cai Dặt Chung' : 'Cài đặt chung',
  
  // Individual resources
  'Users': 'Người dùng',
  'Students': 'Sinh viên',
  'Teachers': 'Giáo viên', 
  'Classes': 'Lớp học',
  'Subjects': 'Môn học',
  'Classubjects': 'Lịch học',
  'Grades': 'Điểm số',
  
  // Action buttons
  'Create new': 'Tạo mới',
  'Edit': 'Chỉnh sửa',
  'Show': 'Xem chi tiết',
  'Delete': 'Xóa',
  'Save': 'Lưu',
  'Cancel': 'Hủy',
  'Filter': 'Lọc'
};

// Function to fix text content
function fixVietnameseText() {
  // Target all text nodes in the sidebar and main content
  const selectors = [
    // Sidebar navigation
    '[data-testid="sidebar"] a',
    '[data-testid="sidebar"] span',
    '.admin-layout__sidebar a',
    '.admin-layout__sidebar span',
    
    // Navigation items
    '.sidebar-navigation a',
    '.sidebar-navigation span',
    '.navigation-element',
    
    // Breadcrumbs
    '.breadcrumb',
    '.breadcrumb-item',
    
    // Page titles
    'h1', 'h2', 'h3', 'h4',
    
    // Buttons
    'button',
    '.btn',
    
    // General text elements
    '.sidebar a',
    '.sidebar span',
    'nav a',
    'nav span'
  ];

  selectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (element.textContent) {
          let text = element.textContent.trim();
          
          // Check if this text needs to be replaced
          Object.keys(vietnameseMenuMapping).forEach(englishText => {
            if (text === englishText || text.includes(englishText)) {
              const vietnameseText = vietnameseMenuMapping[englishText];
              
              // Replace the text content
              if (element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE) {
                // Pure text node
                element.textContent = text.replace(englishText, vietnameseText);
              } else {
                // Mixed content, be more careful
                element.childNodes.forEach(node => {
                  if (node.nodeType === Node.TEXT_NODE && node.textContent.includes(englishText)) {
                    node.textContent = node.textContent.replace(englishText, vietnameseText);
                  }
                });
              }
              
              console.log(`🇻🇳 Fixed: "${englishText}" → "${vietnameseText}"`);
            }
          });
        }
      });
    } catch (error) {
      console.warn(`Error processing selector ${selector}:`, error);
    }
  });
}

// Function to apply CSS overrides for text-transform
function applyTextTransformOverride() {
  const style = document.createElement('style');
  style.textContent = `
    /* Force override all text-transform in AdminJS */
    .admin-layout__sidebar *,
    .sidebar-navigation *,
    .navigation-element *,
    nav *,
    .breadcrumb *,
    [data-testid="sidebar"] * {
      text-transform: none !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }
    
    /* Specific fixes for Vietnamese characters */
    .sidebar a, .sidebar span,
    nav a, nav span {
      text-transform: none !important;
      text-rendering: optimizeLegibility !important;
      -webkit-font-smoothing: antialiased !important;
    }
  `;
  document.head.appendChild(style);
  console.log('🎨 Applied CSS text-transform override');
}

// Run the fixer function
function initVietnameseFixer() {
  console.log('🚀 Initializing Vietnamese Menu Fixer...');
  
  // Apply CSS overrides first
  applyTextTransformOverride();
  
  // Initial fix
  fixVietnameseText();
  
  // Set up observers for dynamic content
  const observer = new MutationObserver((mutations) => {
    let shouldFix = false;
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        shouldFix = true;
      }
    });
    
    if (shouldFix) {
      setTimeout(fixVietnameseText, 100); // Small delay to ensure content is rendered
    }
  });
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Also fix on route changes (AdminJS is SPA)
  let currentPath = window.location.pathname;
  setInterval(() => {
    if (window.location.pathname !== currentPath) {
      currentPath = window.location.pathname;
      setTimeout(fixVietnameseText, 200);
    }
  }, 500);
  
  console.log('✅ Vietnamese Menu Fixer initialized');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVietnameseFixer);
} else {
  initVietnameseFixer();
}

// Also run when AdminJS finishes loading
window.addEventListener('load', () => {
  setTimeout(initVietnameseFixer, 1000);
});
