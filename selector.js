// Content script for selector and capture
let isSelecting = false;
let selectionStart = { x: 0, y: 0 };
let selectionRect = null;
let captureButton = null;
let overlay = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'begin-selection') {
    show(request.format);
    return true;
  }
  
  if (request.type === 'capture-selection') {
    // Capture selection logic with performance optimizations
    sendResponse({ type: 'selection-captured' });
    return true;
  }
});

function show(format) {
  // Create overlay elements with performance optimizations
  overlay = document.createElement('div');
  overlay.id = 'tab-screenshot-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2147483647;
    background: rgba(0, 0, 255, 0.1);
    cursor: crosshair;
    pointer-events: none;
  `;
  
  // Add selection rectangle with optimized rendering
  selectionRect = document.createElement('div');
  selectionRect.id = 'tab-screenshot-selection';
  selectionRect.style.cssText = `
    position: absolute;
    border: 2px dashed #000;
    background: rgba(255, 255, 255, 0.3);
    display: none;
    pointer-events: none;
  `;
  
  // Add capture button
  captureButton = document.createElement('button');
  captureButton.textContent = 'Capture selection';
  captureButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 20px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    z-index: 2147483647;
    pointer-events: auto;
    opacity: 0.9;
    transition: opacity 0.2s;
  `;
  
  // Add hover effect
  captureButton.addEventListener('mouseenter', () => {
    captureButton.style.opacity = '1';
  });
  
  captureButton.addEventListener('mouseleave', () => {
    captureButton.style.opacity = '0.9';
  });
  
  // Add event listeners with optimized event handling
  const handleMouseDown = (e) => {
    if (e.target !== overlay) return;
    
    // Prevent default behavior for better performance
    e.preventDefault();
    e.stopPropagation();
    
    isSelecting = true;
    const rect = overlay.getBoundingClientRect();
    selectionStart = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    selectionRect.style.display = 'block';
    selectionRect.style.left = selectionStart.x + 'px';
    selectionRect.style.top = selectionStart.y + 'px';
    selectionRect.style.width = '0px';
    selectionRect.style.height = '0px';
  };
  
  const handleMouseMove = (e) => {
    if (!isSelecting) return;
    
    // Throttle mouse move events for performance
    requestAnimationFrame(() => {
      const rect = overlay.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      
      const width = Math.abs(currentX - selectionStart.x);
      const height = Math.abs(currentY - selectionStart.y);
      
      selectionRect.style.width = width + 'px';
      selectionRect.style.height = height + 'px';
      
      // Adjust position if dragging left/up
      if (currentX < selectionStart.x) {
        selectionRect.style.left = currentX + 'px';
      }
      if (currentY < selectionStart.y) {
        selectionRect.style.top = currentY + 'px';
      }
    });
  };
  
  const handleMouseUp = (e) => {
    if (!isSelecting) return;
    
    isSelecting = false;
    
    // Show capture button when selection is made
    captureButton.style.display = 'block';
    
    // Prevent flickering by removing overlay after delay
    setTimeout(() => {
      if (overlay && overlay.parentNode) {
        overlay.remove();
      }
    }, 100);
  };
  
  // Use event delegation and optimized listeners
  overlay.addEventListener('mousedown', handleMouseDown, { passive: false });
  overlay.addEventListener('mousemove', handleMouseMove, { passive: true });
  overlay.addEventListener('mouseup', handleMouseUp, { passive: false });
  
  // Prevent page scrolling during selection
  document.body.style.overflow = 'hidden';
  
  // Add overlay to page
  document.body.appendChild(overlay);
  overlay.appendChild(selectionRect);
  overlay.appendChild(captureButton);
  
  // Hide capture button initially
  captureButton.style.display = 'none';
  
  // Add capture button event listener
  captureButton.addEventListener('click', () => {
    // Send capture request back to background with error handling
    try {
      chrome.runtime.sendMessage({ type: 'capture-selection', format });
    } catch (error) {
      console.error('Error sending capture request:', error);
    }
    
    // Clean up
    if (overlay && overlay.parentNode) {
      overlay.remove();
    }
  });
  
  // Cleanup function for when content script is unloaded
  window.addEventListener('beforeunload', () => {
    if (overlay && overlay.parentNode) {
      overlay.remove();
    }
    document.body.style.overflow = '';
  });
}
