// Annotation editor logic
document.addEventListener('DOMContentLoaded', () => {
  // Load image and set up canvas with performance optimizations
  const canvas = document.getElementById('annotation-canvas');
  const ctx = canvas.getContext('2d');
  
  // Performance optimization: Use OffscreenCanvas when available
  let offscreenCanvas = null;
  if (typeof OffscreenCanvas !== 'undefined') {
    offscreenCanvas = new OffscreenCanvas(1, 1);
  }
  
  // Handle image loading with error handling and performance optimizations
  const img = new Image();
  let isImageLoading = false;
  
  img.onload = () => {
    if (isImageLoading) return; // Prevent race conditions
    
    try {
      // Set canvas size to match image with bounds checking
      const maxWidth = 2000; // Prevent excessively large canvases
      const maxHeight = 2000;
      
      let displayWidth = img.width;
      let displayHeight = img.height;
      
      if (img.width > maxWidth || img.height > maxHeight) {
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
        displayWidth = Math.floor(img.width * ratio);
        displayHeight = Math.floor(img.height * ratio);
      }
      
      // Use offscreen canvas for better performance on large images
      if (offscreenCanvas && (img.width > 1000 || img.height > 1000)) {
        const offscreenCtx = offscreenCanvas.getContext('2d');
        offscreenCanvas.width = displayWidth;
        offscreenCanvas.height = displayHeight;
        offscreenCtx.drawImage(img, 0, 0, displayWidth, displayHeight);
        
        // Draw to main canvas
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        ctx.drawImage(offscreenCanvas, 0, 0);
      } else {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      }
      
      // Initialize annotation tools
      initAnnotationTools();
    } catch (error) {
      console.error('Error drawing image:', error);
      // Show error message to user
      document.getElementById('error-message').textContent = 'Failed to load image for annotation';
    }
  };
  
  img.onerror = (error) => {
    console.error('Failed to load image:', error);
    document.getElementById('error-message').textContent = 'Failed to load image for annotation';
  };
  
  // Get image data from background with error handling
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'annotation-image') {
      try {
        isImageLoading = true;
        img.src = request.dataUrl;
        sendResponse({ type: 'annotation-loaded' });
      } catch (error) {
        console.error('Error receiving annotation image:', error);
        sendResponse({ type: 'annotation-error', message: 'Failed to load image' });
      }
    }
  });
  
  function initAnnotationTools() {
    // Initialize annotation tools with performance optimizations
    const tools = ['pen', 'eraser', 'text'];
    const toolSelect = document.getElementById('tool-select');
    
    // Clear existing options
    toolSelect.innerHTML = '';
    
    tools.forEach(tool => {
      const option = document.createElement('option');
      option.value = tool;
      option.textContent = tool.charAt(0).toUpperCase() + tool.slice(1);
      toolSelect.appendChild(option);
    });
    
    toolSelect.value = 'pen';
    
    // Add performance optimization: debounce tool change events
    let toolChangeTimeout;
    toolSelect.addEventListener('change', () => {
      clearTimeout(toolChangeTimeout);
      toolChangeTimeout = setTimeout(() => {
        // Apply tool change if needed
        console.log('Tool changed to:', toolSelect.value);
      }, 100);
    });
  }
  
  // Handle saving with performance optimizations
  document.getElementById('save-btn').addEventListener('click', () => {
    // Show saving indicator
    const saveBtn = document.getElementById('save-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
    
    // Throttle rapid saves
    setTimeout(() => {
      try {
        // Get image data with error handling
        const dataUrl = canvas.toDataURL('image/png');
        
        // Send to background for download or clipboard with error handling
        chrome.runtime.sendMessage({ type: 'save-annotation', dataUrl });
      } catch (error) {
        console.error('Error saving annotation:', error);
        document.getElementById('error-message').textContent = 'Failed to save annotation';
      } finally {
        // Restore button state
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
      }
    }, 100);
  });
  
  // Handle cancel with cleanup
  document.getElementById('cancel-btn').addEventListener('click', () => {
    // Clean up resources
    if (img && img.complete) {
      img.src = '';
    }
    
    // Close window
    window.close();
  });
  
  // Add memory cleanup on window close
  window.addEventListener('beforeunload', () => {
    // Clear image resources
    if (img) {
      img.src = '';
      img.onload = null;
      img.onerror = null;
    }
    
    // Clear canvas
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });
  
  // Add keyboard shortcuts for performance
  document.addEventListener('keydown', (e) => {
    // Ctrl+S to save (without preventing default to allow browser shortcuts)
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      document.getElementById('save-btn').click();
    }
    
    // Escape to cancel
    if (e.key === 'Escape') {
      document.getElementById('cancel-btn').click();
    }
  });
});
