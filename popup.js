// Popup logic
document.addEventListener('DOMContentLoaded', () => {
  // System capability detection
  const systemCapabilities = {
    hasOffscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    isLowEndDevice: detectLowEndDevice(),
    maxMemory: getSystemMemoryEstimate()
  };
  
  // Load preferences from storage with error handling
  const loadPreferences = () => {
    try {
      chrome.storage.sync.get(['imageFormat', 'destination', 'annotate'], (result) => {
        // Apply preferences to UI with error handling
        if (result.imageFormat) {
          document.getElementById('format').value = result.imageFormat;
        }
        if (result.destination) {
          document.getElementById('destination').value = result.destination;
        }
        if (result.annotate !== undefined) {
          document.getElementById('annotate').checked = result.annotate;
        }
      });
    } catch (error) {
      console.error('Error loading preferences:', error);
      // Fallback to defaults
      document.getElementById('format').value = 'png';
      document.getElementById('destination').value = 'file';
      document.getElementById('annotate').checked = false;
    }
  };
  
  // Detect low-end devices for performance optimization
  function detectLowEndDevice() {
    // Check for low-end device indicators
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEnd = isMobile && (navigator.hardwareConcurrency < 4 || navigator.deviceMemory < 2);
    
    // Additional checks for older devices
    const hasSlowCPU = !('requestAnimationFrame' in window);
    const hasLimitedMemory = typeof navigator.deviceMemory === 'undefined' && 
      (typeof navigator.hardwareConcurrency === 'undefined' || navigator.hardwareConcurrency < 2);
    
    return isLowEnd || hasSlowCPU || hasLimitedMemory;
  }
  
  // Estimate system memory for optimization
  function getSystemMemoryEstimate() {
    // Return a reasonable estimate for memory usage
    return typeof navigator.deviceMemory !== 'undefined' ? 
      navigator.deviceMemory * 1024 : 2048; // MB
  }
  
  loadPreferences();
  
  // Set up event handlers with performance optimizations
  const handleCaptureVisible = () => {
    // Show loading indicator
    const visibleBtn = document.getElementById('visible');
    const originalText = visibleBtn.textContent;
    visibleBtn.textContent = 'Capturing...';
    visibleBtn.disabled = true;
    visibleBtn.classList.add('loading');
    
    // Throttle rapid clicks with timeout
    const format = document.getElementById('format').value;
    
    // Add performance monitoring
    const startTime = Date.now();
    
    chrome.runtime.sendMessage({ type: 'capture-visible', format }, (response) => {
      // Restore button state
      visibleBtn.textContent = originalText;
      visibleBtn.disabled = false;
      visibleBtn.classList.remove('loading');
      
      if (response.type === 'full-screenshot') {
        // Handle the screenshot with error handling
        try {
          const duration = Date.now() - startTime;
          console.log('Capture time:', duration, 'ms');
          
          encodeAndDownload(response.dataUrl, response.format);
        } catch (error) {
          console.error('Error encoding/download screenshot:', error);
        }
      } else if (response.type === 'error') {
        console.error('Capture error:', response.message);
      }
    });
  };
  
  const handleCaptureSelection = () => {
    // Show loading indicator
    const selectionBtn = document.getElementById('selection');
    const originalText = selectionBtn.textContent;
    selectionBtn.textContent = 'Selecting...';
    selectionBtn.disabled = true;
    selectionBtn.classList.add('loading');
    
    // Throttle rapid clicks
    const format = document.getElementById('format').value;
    
    // Add performance monitoring
    const startTime = Date.now();
    
    chrome.runtime.sendMessage({ type: 'begin-selection', format }, (response) => {
      // Restore button state
      selectionBtn.textContent = originalText;
      selectionBtn.disabled = false;
      selectionBtn.classList.remove('loading');
      
      if (response && response.type === 'error') {
        console.error('Selection error:', response.message);
      }
    });
  };
  
  // Set up event handlers
  document.getElementById('visible').addEventListener('click', handleCaptureVisible);
  document.getElementById('selection').addEventListener('click', handleCaptureSelection);
  
  // Add performance monitoring capability
  window.addEventListener('beforeunload', () => {
    // Log performance statistics for debugging
    try {
      chrome.runtime.sendMessage({ type: 'performance-stats' }, (response) => {
        if (response && response.type === 'performance-stats-response') {
          console.log('Popup performance stats:', response.stats);
        }
      });
    } catch (e) {
      console.log('Could not send performance stats');
    }
  });
});
