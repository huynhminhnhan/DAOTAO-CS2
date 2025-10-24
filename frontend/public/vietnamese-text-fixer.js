// Vietnamese Text Fixer for AdminJS v7
// This script runs after AdminJS loads and fixes Vietnamese text
(function() {
  'use strict';
  
  const vietnameseTextMap = {
    'quan-ly-he-thong': 'Quản lý Hệ thống',
    'quan-ly-sinh-vien': 'Quản lý Sinh viên',
    'quan-ly-giao-vien': 'Quản lý Giáo viên', 
    'quan-ly-lop-hoc': 'Quản lý Lớp học',
    'quan-ly-mon-hoc': 'Quản lý Môn học',
    'quan-ly-diem-so': 'Quản lý Điểm số',
    'user': 'Người dùng',
    'student': 'Sinh viên',
    'teacher': 'Giáo viên',
    'class': 'Lớp học',
    'subject': 'Môn học',
    'classsubject': 'Lịch học',
    'grade': 'Điểm số'
  };

  function fixVietnameseText() {
    // Fix navigation group names
    const navElements = document.querySelectorAll('[class*="NavigationElement"], .navigation-element, nav a, [role="menuitem"]');
    
    navElements.forEach(element => {
      const text = element.textContent?.trim().toLowerCase();
      if (text) {
        // Remove emoji and get clean text
        const cleanText = text.replace(/[🎓👥👨‍🏫🏫📚📝⚙️]/g, '').trim();
        
        // Check for text transformation issues
        if (cleanText.includes('quan ly') || cleanText.includes('quan_ly')) {
          const key = cleanText.replace(/\s+/g, '-').replace(/_/g, '-');
          if (vietnameseTextMap[key]) {
            element.textContent = vietnameseTextMap[key];
            element.style.textTransform = 'none';
            element.style.fontFamily = "'Segoe UI', 'Arial Unicode MS', Arial, sans-serif";
          }
        }
        
        // Fix specific problematic text patterns
        if (text.includes('quan ly') || text.includes('Quan Ly')) {
          element.textContent = element.textContent
            .replace(/quan ly he thong/gi, 'Quản lý Hệ thống')
            .replace(/quan ly sinh vien/gi, 'Quản lý Sinh viên')
            .replace(/quan ly giao vien/gi, 'Quản lý Giáo viên')
            .replace(/quan ly lop hoc/gi, 'Quản lý Lớp học')
            .replace(/quan ly mon hoc/gi, 'Quản lý Môn học')
            .replace(/quan ly diem so/gi, 'Quản lý Điểm số');
          
          element.style.textTransform = 'none';
          element.style.fontFamily = "'Segoe UI', 'Arial Unicode MS', Arial, sans-serif";
        }
      }
    });
  }

  // Run immediately
  fixVietnameseText();
  
  // Run after DOM changes
  const observer = new MutationObserver(function(mutations) {
    let shouldFix = false;
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        shouldFix = true;
      }
    });
    
    if (shouldFix) {
      setTimeout(fixVietnameseText, 100);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Also run on route changes (AdminJS is SPA)
  window.addEventListener('popstate', function() {
    setTimeout(fixVietnameseText, 200);
  });
  
  // Run periodically as fallback
  setInterval(fixVietnameseText, 2000);
  
})();
