(() => {
  'use strict';

  /* ── State ── */
  let canvas, ctx;
  let screenshotImage = null;
  let annotations = [];         // { type, color, x1, y1, x2, y2 } for arrows
                                // { type, color, x, y, width, height } for boxes
  let currentTool = 'arrow';    // 'arrow' | 'box'
  let currentColor = '#FF0000';
  let currentLineWidth = 4;
  let isDrawing = false;
  let startX = 0, startY = 0;
  let previewShape = null;      // shape being drawn (not yet committed)
  let format = 'png';

  /* ── 16 basic colours ── */
  const COLORS = [
    '#FF0000','#FF6600','#FFCC00','#00CC44',
    '#00CCCC','#0066FF','#6600FF','#CC0066',
    '#000000','#444444','#888888','#BBBBBB',
    '#FFFFFF','#8B4513','#800000','#000080',
  ];

  /* ── Canvas helpers ── */
  function resizeCanvas() {
    if (!screenshotImage) return;
    const wrap = document.getElementById('canvas-wrap');
    const pad = 40;
    const availW = wrap.clientWidth - pad;
    const availH = wrap.clientHeight - pad;
    const scale = Math.min(availW / screenshotImage.naturalWidth, availH / screenshotImage.naturalHeight, 1);
    canvas.width = screenshotImage.naturalWidth;
    canvas.height = screenshotImage.naturalHeight;
    canvas.style.width  = `${Math.round(screenshotImage.naturalWidth  * scale)}px`;
    canvas.style.height = `${Math.round(screenshotImage.naturalHeight * scale)}px`;
  }

  function canvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  }

  /* ── Drawing primitives ── */
  function drawArrow(ctx, x1, y1, x2, y2, color, lineWidth) {
    const headLen = Math.max(lineWidth * 3, 14);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Shaft stops at the base of the arrowhead so the round cap doesn't poke out
    const sx = x2 - headLen * Math.cos(angle) * 0.55;
    const sy = y2 - headLen * Math.sin(angle) * 0.55;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(sx, sy);
    ctx.stroke();

    // Filled arrowhead
    const spread = Math.PI / 7;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headLen * Math.cos(angle - spread),
      y2 - headLen * Math.sin(angle - spread)
    );
    ctx.lineTo(
      x2 - headLen * Math.cos(angle + spread),
      y2 - headLen * Math.sin(angle + spread)
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawBox(ctx, x, y, w, h, color, lineWidth) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  /* ── Render ── */
  function render() {
    if (!screenshotImage) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(screenshotImage, 0, 0);

    for (const a of annotations) {
      if (a.type === 'arrow') {
        drawArrow(ctx, a.x1, a.y1, a.x2, a.y2, a.color, a.lineWidth || 3);
      } else if (a.type === 'box') {
        drawBox(ctx, a.x, a.y, a.width, a.height, a.color, a.lineWidth || 3);
      }
    }

    if (previewShape) {
      ctx.save();
      ctx.globalAlpha = 0.8;
      if (previewShape.type === 'arrow') {
        drawArrow(ctx, previewShape.x1, previewShape.y1, previewShape.x2, previewShape.y2, currentColor, currentLineWidth);
      } else if (previewShape.type === 'box') {
        drawBox(ctx, previewShape.x, previewShape.y, previewShape.width, previewShape.height, currentColor, currentLineWidth);
      }
      ctx.restore();
    }
  }


  /* ── Pointer events ── */
  function onPointerDown(e) {
    if (e.button !== 0) return;
    const pt = canvasCoords(e);
    isDrawing = true;
    startX = pt.x;
    startY = pt.y;

    if (currentTool === 'arrow') {
      previewShape = { type: 'arrow', x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y };
    } else {
      previewShape = { type: 'box', x: pt.x, y: pt.y, width: 0, height: 0 };
    }

    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!isDrawing || !previewShape) return;
    const pt = canvasCoords(e);

    if (previewShape.type === 'arrow') {
      previewShape.x2 = pt.x;
      previewShape.y2 = pt.y;
    } else {
      const x = Math.min(startX, pt.x);
      const y = Math.min(startY, pt.y);
      previewShape.x = x;
      previewShape.y = y;
      previewShape.width  = Math.abs(pt.x - startX);
      previewShape.height = Math.abs(pt.y - startY);
    }
    render();
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (!isDrawing || !previewShape) return;
    isDrawing = false;

    const pt = canvasCoords(e);
    const dist = Math.hypot(pt.x - startX, pt.y - startY);

    if (dist > 4) {
      if (previewShape.type === 'arrow') {
        annotations.push({
          type: 'arrow',
          color: currentColor,
          lineWidth: currentLineWidth,
          x1: previewShape.x1, y1: previewShape.y1,
          x2: previewShape.x2, y2: previewShape.y2,
        });
      } else {
        annotations.push({
          type: 'box',
          color: currentColor,
          lineWidth: currentLineWidth,
          x: previewShape.x, y: previewShape.y,
          width: previewShape.width, height: previewShape.height,
        });
      }
      document.getElementById('undo-btn').disabled = false;
    }

    previewShape = null;
    render();
    e.preventDefault();
  }

  /* ── Toolbar interactions ── */
  function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
  }

  function setColor(color) {
    currentColor = color;
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.toggle('active', s.dataset.color === color));
  }

  function setLineWidth(width) {
    currentLineWidth = width;
    document.querySelectorAll('.lw-btn').forEach(b => b.classList.toggle('active', Number(b.dataset.width) === width));
  }

  function undo() {
    if (annotations.length === 0) return;
    annotations.pop();
    document.getElementById('undo-btn').disabled = annotations.length === 0;
    render();
  }

  function cancel() {
    if (confirm('Discard this screenshot?')) {
      window.close();
    }
  }

  /* ── Shared: render annotated image to an offscreen canvas ── */
  async function renderAnnotatedCanvas() {
    if (!screenshotImage) return null;
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    const finalCtx = finalCanvas.getContext('2d');

    finalCtx.drawImage(screenshotImage, 0, 0);
    for (const a of annotations) {
      if (a.type === 'arrow') {
        drawArrow(finalCtx, a.x1, a.y1, a.x2, a.y2, a.color, a.lineWidth || 3);
      } else {
        drawBox(finalCtx, a.x, a.y, a.width, a.height, a.color, a.lineWidth || 3);
      }
    }
    return finalCanvas;
  }

  /* ── Save to clipboard (closes editor on success) ── */
  async function saveToClipboard() {
    if (!screenshotImage) return;
    const btn = document.getElementById('save-clipboard-btn');
    const originalHTML = btn ? btn.innerHTML : '<span>Copy to clipboard</span>';

    try {
      window.focus();
      const finalCanvas = await renderAnnotatedCanvas();
      const blob = await new Promise(resolve => finalCanvas.toBlob(resolve, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);

      if (btn) {
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Copied!</span>`;
        btn.style.background = '#2e7d32';
        btn.style.color = '#fff';
      }

      await new Promise(resolve => setTimeout(resolve, 450));
      window.close();
    } catch (err) {
      console.error('Clipboard write failed:', err);
      if (btn) btn.innerHTML = originalHTML;
      const msg = document.createElement('div');
      msg.textContent = 'Clipboard write failed. Try saving as a file instead.';
      msg.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:8px;background:#b42318;color:#fff;font:600 14px system-ui,sans-serif;z-index:9999;';
      document.body.append(msg);
      setTimeout(() => msg.remove(), 4000);
    }
  }

  /* ── Save to file (editor stays open so user can annotate further) ── */
  async function saveToFile() {
    if (!screenshotImage) return;
    const finalCanvas = await renderAnnotatedCanvas();
    let dataUrl;
    if (format === 'jpeg') {
      dataUrl = finalCanvas.toDataURL('image/jpeg', 0.92);
    } else if (format === 'webp') {
      dataUrl = finalCanvas.toDataURL('image/webp', 0.92);
    } else {
      dataUrl = finalCanvas.toDataURL('image/png');
    }
    try {
      const response = await chrome.runtime.sendMessage({ type: 'download-image', dataUrl, format });
      if (!response.ok) {
        console.warn('File save was cancelled or failed:', response.error);
      }
    } catch (err) {
      console.warn('File save communication error:', err);
    }
    // Editor stays open — user can annotate more or save again
  }

  /* ── Keyboard shortcuts ── */
  function onKeyDown(e) {
    if (e.key === 'Escape') {
      if (isDrawing) {
        isDrawing = false;
        previewShape = null;
        render();
      } else if (annotations.length === 0 || confirm('Discard all annotations?')) {
        window.close();
      }
    }
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      undo();
    }
    if (e.key === 'Enter') {
      saveToFile();
    }
  }

  /* ── Build colour palette DOM ── */
  function buildPalette() {
    const container = document.getElementById('color-palette');
    container.innerHTML = '';
    for (const c of COLORS) {
      const swatch = document.createElement('span');
      swatch.className = 'color-swatch' + (c === currentColor ? ' active' : '');
      swatch.dataset.color = c;
      swatch.style.backgroundColor = c;
      if (c === '#FFFFFF') swatch.style.borderColor = '#888';
      swatch.setAttribute('role', 'button');
      swatch.setAttribute('tabindex', '0');
      swatch.setAttribute('aria-label', `Colour ${c}`);
      swatch.addEventListener('click', () => setColor(c));
      swatch.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setColor(c);
        }
      });
      container.appendChild(swatch);
    }
  }

  /* ── Init ── */
  async function init() {
    canvas = document.getElementById('editor-canvas');
    ctx = canvas.getContext('2d');

    const { pendingScreenshot } = await chrome.storage.local.get('pendingScreenshot');
    if (!pendingScreenshot) {
      document.body.innerHTML = '<p style="padding:40px;text-align:center;color:#999;">No screenshot to annotate.</p>';
      return;
    }

    await chrome.storage.local.remove('pendingScreenshot');
    format = pendingScreenshot.format || 'png';

    screenshotImage = new Image();
    await new Promise((resolve, reject) => {
      screenshotImage.onload = resolve;
      screenshotImage.onerror = () => reject(new Error('Failed to load screenshot.'));
      screenshotImage.src = pendingScreenshot.dataUrl;
    });

    resizeCanvas();
    buildPalette();
    setTool('arrow');
    setLineWidth(currentLineWidth);

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);

    document.querySelectorAll('.tool-btn').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
    document.querySelectorAll('.lw-btn').forEach(b => b.addEventListener('click', () => setLineWidth(Number(b.dataset.width))));
    document.getElementById('undo-btn').addEventListener('click', undo);
    document.getElementById('save-clipboard-btn').addEventListener('click', saveToClipboard);
    document.getElementById('cancel-btn').addEventListener('click', cancel);

    /* ── Split Button & Dropdown handlers ── */
    const splitGroup = document.getElementById('save-format-dropdown');
    const saveFileBtn = document.getElementById('save-file-btn');
    const toggleBtn = document.getElementById('save-format-toggle');
    const dropdownItems = document.querySelectorAll('#save-format-menu .dropdown-item');

    function updateFormatUI(newFormat) {
      format = newFormat;
      saveFileBtn.textContent = `Save as ${format.toUpperCase()}`;
      dropdownItems.forEach(item => {
        const isActive = item.dataset.value === format;
        item.classList.toggle('active', isActive);
        item.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    }

    function toggleDropdown(show) {
      const isCurrentlyOpen = splitGroup.classList.contains('open');
      const open = show !== undefined ? show : !isCurrentlyOpen;
      splitGroup.classList.toggle('open', open);
      toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    updateFormatUI(format);

    saveFileBtn.addEventListener('click', () => {
      toggleDropdown(false);
      saveToFile();
    });

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown();
    });

    dropdownItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        updateFormatUI(item.dataset.value);
        toggleDropdown(false);
        saveToFile();
      });
    });

    document.addEventListener('click', (e) => {
      if (!splitGroup.contains(e.target)) {
        toggleDropdown(false);
      }
    });

    document.addEventListener('keydown', onKeyDown);

    document.getElementById('undo-btn').disabled = true;
    window.addEventListener('resize', () => { resizeCanvas(); render(); });

    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
