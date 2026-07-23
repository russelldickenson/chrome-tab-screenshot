(() => {
  if (globalThis.__tabScreenshotSelectorLoaded) return;
  globalThis.__tabScreenshotSelectorLoaded = true;

  let overlay;
  let box;
  let controls;
  let selection = { x: 0, y: 0, width: 0, height: 0 };
  let operation;
  let imageFormat = 'png';
  let imageDestination = 'file';
  let imageAnnotate = false;

  const remove = () => {
    overlay?.remove();
    overlay = box = controls = undefined;
    window.removeEventListener('keydown', onKeydown, true);
  };

  const onKeydown = (event) => {
    if (event.key === 'Escape') remove();
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const dimensions = () => ({ width: window.innerWidth, height: window.innerHeight });

  let render = () => {
    if (!box) return;
    box.style.left = `${selection.x}px`;
    box.style.top = `${selection.y}px`;
    box.style.width = `${selection.width}px`;
    box.style.height = `${selection.height}px`;
    controls.hidden = selection.width < 2 || selection.height < 2;
    if (!controls.hidden) {
      controls.style.left = `${Math.min(selection.x, window.innerWidth - controls.offsetWidth)}px`;
      controls.style.top = `${Math.min(selection.y + selection.height + 8, window.innerHeight - controls.offsetHeight)}px`;
    }
  };

  const point = (event) => ({ x: clamp(event.clientX, 0, window.innerWidth), y: clamp(event.clientY, 0, window.innerHeight) });

  const begin = (event) => {
    if (event.target.closest('.tab-shot-box, .tab-shot-controls')) return;
    const start = point(event);
    operation = { kind: 'draw', start };
    selection = { x: start.x, y: start.y, width: 0, height: 0 };
    render();
    event.preventDefault();
  };

  const resize = (event, handle) => {
    operation = { kind: 'resize', handle, start: point(event), initial: { ...selection } };
    event.preventDefault();
    event.stopPropagation();
  };

  const move = (event) => {
    if (!operation) return;
    const current = point(event);
    if (operation.kind === 'draw') {
      selection = { x: Math.min(operation.start.x, current.x), y: Math.min(operation.start.y, current.y), width: Math.abs(current.x - operation.start.x), height: Math.abs(current.y - operation.start.y) };
    } else {
      const { handle, start, initial } = operation;
      const dx = current.x - start.x;
      const dy = current.y - start.y;
      let { x, y, width, height } = initial;
      if (handle.includes('e')) width = clamp(initial.width + dx, 1, window.innerWidth - x);
      if (handle.includes('s')) height = clamp(initial.height + dy, 1, window.innerHeight - y);
      if (handle.includes('w')) { x = clamp(initial.x + dx, 0, initial.x + initial.width - 1); width = initial.width + initial.x - x; }
      if (handle.includes('n')) { y = clamp(initial.y + dy, 0, initial.y + initial.height - 1); height = initial.height + initial.y - y; }
      selection = { x, y, width, height };
    }
    render();
  };

  const end = () => { operation = undefined; };

  const encodeAndDownload = async ({ dataUrl, crop, format, prefix }) => {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Unable to prepare screenshot image.'));
      image.src = dataUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = crop?.width ?? image.naturalWidth;
    canvas.height = crop?.height ?? image.naturalHeight;
    const sourceX = crop?.x ?? 0;
    const sourceY = crop?.y ?? 0;
    const sourceWidth = crop?.width ?? image.naturalWidth;
    const sourceHeight = crop?.height ?? image.naturalHeight;
    canvas.getContext('2d').drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    const finalDataUrl = canvas.toDataURL(`image/${format}`, format === 'png' ? undefined : 0.92);

    // Check if annotation mode is active
    if (imageAnnotate) {
      remove();
      await chrome.runtime.sendMessage({ type: 'open-annotator', dataUrl: finalDataUrl, format, destination: imageDestination });
      return;
    }
    if (imageDestination === 'clipboard') {
      remove();
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      } catch (err) {
        console.error('Clipboard write failed:', err);
        alert('Clipboard write failed. Try saving as a file instead.');
      }
      return;
    }

    await chrome.runtime.sendMessage({
      type: 'download-image',
      dataUrl: finalDataUrl,
      prefix,
      format,
    });
  };

  const confirm = async () => {
    const scale = window.devicePixelRatio;
    const crop = { x: Math.round(selection.x * scale), y: Math.round(selection.y * scale), width: Math.round(selection.width * scale), height: Math.round(selection.height * scale) };
    remove();
    // Let the browser paint without the UI before captureVisibleTab runs.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await chrome.runtime.sendMessage({ type: 'capture-selection', crop, format: imageFormat });
  };

  const show = (format) => {
    if (overlay) return;
    imageFormat = format === 'jpeg' || format === 'webp' ? format : 'png';
    overlay = document.createElement('div');
    overlay.className = 'tab-shot-overlay';
    overlay.innerHTML = `<div class="tab-shot-hint">Drag to select an area · Esc to cancel</div><div class="tab-shot-box"><i data-handle="n"></i><i data-handle="e"></i><i data-handle="s"></i><i data-handle="w"></i><i data-handle="nw"></i><i data-handle="ne"></i><i data-handle="se"></i><i data-handle="sw"></i></div><div class="tab-shot-controls" hidden><button type="button">Capture selection</button><button type="button" class="cancel">Cancel</button></div>`;
    const style = document.createElement('style');
    style.textContent = `.tab-shot-overlay{position:fixed!important;z-index:2147483647!important;inset:0!important;cursor:crosshair!important;background:rgba(0,0,0,.12)!important;user-select:none!important}.tab-shot-hint{position:fixed;top:16px;left:50%;transform:translateX(-50%);padding:8px 12px;border-radius:7px;background:#111;color:#fff;font:13px system-ui,sans-serif;box-shadow:0 2px 10px #0008}.tab-shot-box{position:fixed;box-sizing:border-box;border:2px dotted #fff;outline:1px solid #111;cursor:move}.tab-shot-box i{position:absolute;width:10px;height:10px;background:#fff;border:1px solid #111}.tab-shot-box i[data-handle=n]{top:-6px;left:calc(50% - 6px);cursor:ns-resize}.tab-shot-box i[data-handle=s]{bottom:-6px;left:calc(50% - 6px);cursor:ns-resize}.tab-shot-box i[data-handle=e]{right:-6px;top:calc(50% - 6px);cursor:ew-resize}.tab-shot-box i[data-handle=w]{left:-6px;top:calc(50% - 6px);cursor:ew-resize}.tab-shot-box i[data-handle=nw]{top:-6px;left:-6px;cursor:nwse-resize}.tab-shot-box i[data-handle=se]{bottom:-6px;right:-6px;cursor:nwse-resize}.tab-shot-box i[data-handle=ne]{top:-6px;right:-6px;cursor:nesw-resize}.tab-shot-box i[data-handle=sw]{bottom:-6px;left:-6px;cursor:nesw-resize}.tab-shot-controls{position:fixed;display:flex;gap:8px;padding:8px;transform:translateY(8px);background:#111;border-radius:7px}.tab-shot-controls button{border:0;border-radius:5px;padding:7px 10px;background:#1769e0;color:#fff;font:600 13px system-ui,sans-serif;cursor:pointer}.tab-shot-controls .cancel{background:#555}`;
    overlay.append(style);
    document.documentElement.append(overlay);
    box = overlay.querySelector('.tab-shot-box');
    controls = overlay.querySelector('.tab-shot-controls');
    overlay.addEventListener('pointerdown', begin);
    overlay.addEventListener('pointermove', move);
    overlay.addEventListener('pointerup', end);
    box.querySelectorAll('[data-handle]').forEach((handle) => handle.addEventListener('pointerdown', (event) => resize(event, handle.dataset.handle)));
    controls.querySelector('button').addEventListener('click', confirm);
    controls.querySelector('.cancel').addEventListener('click', remove);
    window.addEventListener('keydown', onKeydown, true);
  };

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'begin-selection') { show(message.format); imageDestination = message.destination || 'file'; imageAnnotate = message.annotate || false; }
    if (message.type === 'capture-visible') {
      imageDestination = message.destination || 'file';
      imageAnnotate = message.annotate || false;
      chrome.runtime.sendMessage({ type: 'capture-visible', format: message.format });
    }
    if (message.type === 'crop-screenshot') encodeAndDownload({ ...message, prefix: 'tab-selection' });
    if (message.type === 'full-screenshot') encodeAndDownload({ ...message, prefix: 'tab-screenshot' });
  });
})();
