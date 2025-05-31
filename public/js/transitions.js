// Handle page transitions
document.addEventListener('DOMContentLoaded', function() {
  // Add loading class to body when links are clicked
  document.querySelectorAll('a[href^="/"]').forEach(link => {
    link.addEventListener('click', function(e) {
      if (this.getAttribute('href') === '#') return;
      
      e.preventDefault();
      const href = this.getAttribute('href');
      
      document.body.classList.add('loading');
      
      setTimeout(() => {
        window.location.href = href;
      }, 300);
    });
  });
  
  // Remove loading class when page loads
  setTimeout(() => {
    document.body.classList.remove('loading');
  }, 300);
});

// Tab switching functionality
document.addEventListener('DOMContentLoaded', function() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  if (tabButtons.length > 0) {
    tabButtons.forEach(button => {
      button.addEventListener('click', function() {
        const tabId = this.getAttribute('data-tab');
        
        // Update active button
        tabButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        
        // Show corresponding content
        tabContents.forEach(content => {
          content.classList.remove('active');
          if (content.id === `${tabId}-tab`) {
            content.classList.add('active');
          }
        });
      });
    });
  }
});