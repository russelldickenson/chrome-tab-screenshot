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

  // Lightweight in-page toast — used for errors that surface after the
  // popup has already closed (e.g. a selection capture, or a clipboard
  // write failure), when there is no popup left to report to.
  let toastTimer;
  const showToast = (message) => {
    let toast = document.querySelector('.tab-shot-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'tab-shot-toast';
      Object.assign(toast.style, {
        position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
        padding: '10px 16px', borderRadius: '8px', background: '#b42318', color: '#fff',
        font: '600 13px system-ui, sans-serif', zIndex: '2147483647', boxShadow: '0 2px 10px rgba(0,0,0,.4)',
      });
      document.documentElement.append(toast);
    }
    toast.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.remove(), 4000);
  };

  const point = (event) => ({ x: clamp(event.clientX, 0, window.innerWidth), y: clamp(event.clientY, 0, window.innerHeight) });

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

  // Asks the background service worker to capture the visible tab, then
  // (if needed) crops/re-encodes it here and routes it to its destination.
  const captureAndProcess = async ({ format, crop }) => {
    const response = await chrome.runtime.sendMessage({ type: 'request-capture' });
    if (!response?.ok) throw new Error(response?.error || 'Unable to capture this tab.');
    await encodeAndDownload({
      dataUrl: response.dataUrl,
      crop,
      format,
      prefix: crop ? 'tab-selection' : 'tab-screenshot',
    });
  };

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

    if (imageAnnotate) {
      remove();
      const response = await chrome.runtime.sendMessage({ type: 'open-annotator', dataUrl: finalDataUrl, format, destination: imageDestination });
      if (!response?.ok) throw new Error(response?.error || 'Unable to open the annotator.');
      return;
    }
    if (imageDestination === 'clipboard') {
      remove();
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      } catch (err) {
        throw new Error('Clipboard write failed. Try saving as a file instead.');
      }
      return;
    }

    const response = await chrome.runtime.sendMessage({
      type: 'download-image',
      dataUrl: finalDataUrl,
      prefix,
      format,
    });
    if (!response?.ok) throw new Error(response?.error || 'Download failed.');
  };

  const confirmSelection = async () => {
    const scale = window.devicePixelRatio;
    const crop = { x: Math.round(selection.x * scale), y: Math.round(selection.y * scale), width: Math.round(selection.width * scale), height: Math.round(selection.height * scale) };
    remove();
    // Let the browser paint without the UI before captureVisibleTab runs.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
      await captureAndProcess({ format: imageFormat, crop });
    } catch (error) {
      showToast(error.message);
    }
  };

  const overlayStyles = {
    overlay: { position: 'fixed', zIndex: '2147483647', inset: '0', cursor: 'crosshair', background: 'rgba(0,0,0,.12)', userSelect: 'none' },
    hint: { position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', padding: '8px 12px', borderRadius: '7px', background: '#111', color: '#fff', font: '13px system-ui, sans-serif', boxShadow: '0 2px 10px rgba(0,0,0,.53)' },
    box: { position: 'fixed', boxSizing: 'border-box', border: '2px dotted #fff', outline: '1px solid #111', cursor: 'move' },
    handle: { position: 'absolute', width: '10px', height: '10px', background: '#fff', border: '1px solid #111' },
    controls: { position: 'fixed', display: 'flex', gap: '8px', padding: '8px', transform: 'translateY(8px)', background: '#111', borderRadius: '7px' },
    button: { border: '0', borderRadius: '5px', padding: '7px 10px', background: '#1769e0', color: '#fff', font: '600 13px system-ui, sans-serif', cursor: 'pointer' },
    cancelButton: { background: '#555' },
  };

  const handlePositions = {
    n: { top: '-6px', left: 'calc(50% - 6px)', cursor: 'ns-resize' },
    s: { bottom: '-6px', left: 'calc(50% - 6px)', cursor: 'ns-resize' },
    e: { right: '-6px', top: 'calc(50% - 6px)', cursor: 'ew-resize' },
    w: { left: '-6px', top: 'calc(50% - 6px)', cursor: 'ew-resize' },
    nw: { top: '-6px', left: '-6px', cursor: 'nwse-resize' },
    se: { bottom: '-6px', right: '-6px', cursor: 'nwse-resize' },
    ne: { top: '-6px', right: '-6px', cursor: 'nesw-resize' },
    sw: { bottom: '-6px', left: '-6px', cursor: 'nesw-resize' },
  };

  // Elements are styled via element.style rather than an injected <style>
  // tag so the overlay still renders on pages with a strict style-src CSP.
  const show = (format) => {
    if (overlay) return;
    imageFormat = format === 'jpeg' || format === 'webp' ? format : 'png';

    overlay = document.createElement('div');
    overlay.className = 'tab-shot-overlay';
    Object.assign(overlay.style, overlayStyles.overlay);

    const hint = document.createElement('div');
    hint.textContent = 'Drag to select an area · Esc to cancel';
    Object.assign(hint.style, overlayStyles.hint);

    box = document.createElement('div');
    box.className = 'tab-shot-box';
    Object.assign(box.style, overlayStyles.box);
    for (const handleName of Object.keys(handlePositions)) {
      const handle = document.createElement('i');
      handle.dataset.handle = handleName;
      Object.assign(handle.style, overlayStyles.handle, handlePositions[handleName]);
      handle.addEventListener('pointerdown', (event) => resize(event, handleName));
      box.append(handle);
    }

    controls = document.createElement('div');
    controls.className = 'tab-shot-controls';
    controls.hidden = true;
    Object.assign(controls.style, overlayStyles.controls);
    const captureBtn = document.createElement('button');
    captureBtn.type = 'button';
    captureBtn.textContent = 'Capture selection';
    Object.assign(captureBtn.style, overlayStyles.button);
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    Object.assign(cancelBtn.style, overlayStyles.button, overlayStyles.cancelButton);
    controls.append(captureBtn, cancelBtn);

    overlay.append(hint, box, controls);
    document.documentElement.append(overlay);

    overlay.addEventListener('pointerdown', begin);
    overlay.addEventListener('pointermove', move);
    overlay.addEventListener('pointerup', end);
    captureBtn.addEventListener('click', confirmSelection);
    cancelBtn.addEventListener('click', remove);
    window.addEventListener('keydown', onKeydown, true);
  };

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'begin-selection') {
      imageDestination = message.destination || 'file';
      imageAnnotate = message.annotate || false;
      show(message.format);
      sendResponse({ ok: true });
      return;
    }
    if (message.type === 'capture-visible') {
      imageDestination = message.destination || 'file';
      imageAnnotate = message.annotate || false;
      (async () => {
        try {
          await captureAndProcess({ format: message.format });
          sendResponse({ ok: true });
        } catch (error) {
          sendResponse({ ok: false, error: error.message });
        }
      })();
      return true;
    }
  });
})();
