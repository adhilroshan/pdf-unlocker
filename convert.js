import { formatBytes, downloadBlob, loadPdfJs } from './shared.js';

// ─── Mode toggle ────────────────────────────────────────
const modeToImg = document.getElementById('modeToImg');
const modeToPdf = document.getElementById('modeToPdf');
const toImgCard = document.getElementById('toImgCard');
const toPdfCard = document.getElementById('toPdfCard');
function syncMode() {
  toImgCard.style.display = modeToImg.checked ? '' : 'none';
  toPdfCard.style.display = modeToPdf.checked ? '' : 'none';
}
modeToImg.addEventListener('change', syncMode);
modeToPdf.addEventListener('change', syncMode);

// ════════════════════════════════════════════════════════
// PDF → IMAGES
// ════════════════════════════════════════════════════════
let toImgFile = null;
let imgResults = []; // { name, blob }

const toImgDropZone   = document.getElementById('toImgDropZone');
const toImgFileInput  = document.getElementById('toImgFileInput');
const toImgFileInfo   = document.getElementById('toImgFileInfo');
const toImgFileName   = document.getElementById('toImgFileName');
const toImgFileSize   = document.getElementById('toImgFileSize');
const toImgBtnClear   = document.getElementById('toImgBtnClear');
const toImgOptionsSection = document.getElementById('toImgOptionsSection');
const fmtPng = document.getElementById('fmtPng');
const fmtJpg = document.getElementById('fmtJpg');
const btnToImg = document.getElementById('btnToImg');
const toImgStatusLoading = document.getElementById('toImgStatusLoading');
const toImgStatusError   = document.getElementById('toImgStatusError');
const toImgErrorText     = document.getElementById('toImgErrorText');
const toImgProgressWrap  = document.getElementById('toImgProgressWrap');
const toImgProgressBar   = document.getElementById('toImgProgressBar');
const toImgProgressLabel = document.getElementById('toImgProgressLabel');
const toImgLoadingText   = document.getElementById('toImgLoadingText');
const toImgResultsSection = document.getElementById('toImgResultsSection');
const toImgResultList    = document.getElementById('toImgResultList');
const btnToImgDownloadAll = document.getElementById('btnToImgDownloadAll');

function showToImgStatus(which) {
  [toImgStatusLoading, toImgStatusError].forEach((el) => el.classList.remove('show'));
  if (which) which.classList.add('show');
}

function setToImgFile(file) {
  toImgFile = file;
  toImgFileName.textContent = file.name;
  toImgFileSize.textContent = formatBytes(file.size);
  toImgFileInfo.classList.add('show');
  toImgDropZone.style.display = 'none';
  toImgOptionsSection.style.display = '';
  btnToImg.disabled = false;
  toImgResultsSection.style.display = 'none';
  toImgResultList.innerHTML = '';
  btnToImgDownloadAll.style.display = 'none';
  showToImgStatus(null);
}
function clearToImgFile() {
  toImgFile = null;
  toImgFileInput.value = '';
  toImgFileInfo.classList.remove('show');
  toImgDropZone.style.display = '';
  toImgOptionsSection.style.display = 'none';
  btnToImg.disabled = true;
  toImgResultsSection.style.display = 'none';
  toImgResultList.innerHTML = '';
  btnToImgDownloadAll.style.display = 'none';
  showToImgStatus(null);
}

toImgFileInput.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) setToImgFile(f); });
toImgBtnClear.addEventListener('click', clearToImgFile);
toImgDropZone.addEventListener('dragover', (e) => { e.preventDefault(); toImgDropZone.classList.add('dragover'); });
toImgDropZone.addEventListener('dragleave', () => toImgDropZone.classList.remove('dragover'));
toImgDropZone.addEventListener('drop', (e) => {
  e.preventDefault(); toImgDropZone.classList.remove('dragover');
  const f = e.dataTransfer.files[0]; if (f) setToImgFile(f);
});

btnToImg.addEventListener('click', async () => {
  if (!toImgFile) return;

  btnToImg.disabled = true;
  toImgResultsSection.style.display = 'none';
  toImgResultList.innerHTML = '';
  btnToImgDownloadAll.style.display = 'none';
  toImgProgressWrap.classList.add('show');
  showToImgStatus(toImgStatusLoading);

  try {
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await toImgFile.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const numPages = pdfDoc.numPages;
    const baseName = toImgFile.name.replace(/\.pdf$/i, '');
    const isJpg = fmtJpg.checked;
    const mime = isJpg ? 'image/jpeg' : 'image/png';
    const ext = isJpg ? 'jpg' : 'png';

    const offscreen = document.createElement('canvas');
    const ctx = offscreen.getContext('2d');
    imgResults = [];

    for (let i = 1; i <= numPages; i++) {
      toImgLoadingText.textContent = `Rendering page ${i} of ${numPages}…`;
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      offscreen.width = viewport.width;
      offscreen.height = viewport.height;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, offscreen.width, offscreen.height);
      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise((resolve) => offscreen.toBlob(resolve, mime, 0.92));
      imgResults.push({ name: `${baseName}_page${i}.${ext}`, blob });

      const pct = Math.round((i / numPages) * 100);
      toImgProgressBar.style.width = pct + '%';
      toImgProgressLabel.textContent = pct + '%';
    }

    toImgProgressWrap.classList.remove('show');
    showToImgStatus(null);

    toImgResultList.innerHTML = '';
    imgResults.forEach((r, idx) => {
      const row = document.createElement('div');
      row.className = 'result-row';
      row.innerHTML = `<span class="fname">${r.name}</span><button class="dl-btn" data-idx="${idx}">↓ Save</button>`;
      toImgResultList.appendChild(row);
    });
    toImgResultsSection.style.display = '';
    btnToImgDownloadAll.style.display = imgResults.length > 1 ? '' : 'none';

  } catch (err) {
    console.error(err);
    toImgProgressWrap.classList.remove('show');
    toImgErrorText.textContent = 'Could not convert this PDF. It may be encrypted or corrupted.';
    showToImgStatus(toImgStatusError);
  }

  btnToImg.disabled = false;
});

toImgResultList.addEventListener('click', (e) => {
  const btn = e.target.closest('.dl-btn');
  if (!btn) return;
  const r = imgResults[Number(btn.dataset.idx)];
  if (r) {
    const url = URL.createObjectURL(r.blob);
    const a = document.createElement('a');
    a.href = url; a.download = r.name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 1000);
  }
});

btnToImgDownloadAll.addEventListener('click', async () => {
  if (!imgResults.length) return;
  const zip = new JSZip();
  imgResults.forEach((r) => zip.file(r.name, r.blob));
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (toImgFile.name.replace(/\.pdf$/i, '') || 'pages') + '_images.zip';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 1000);
});

// ════════════════════════════════════════════════════════
// IMAGES → PDF
// ════════════════════════════════════════════════════════
let imgFiles = []; // { file, id }
let toPdfBytes = null;
let imgIdCounter = 0;

const imgFileList   = document.getElementById('imgFileList');
const imgFileInput  = document.getElementById('imgFileInput');
const btnToPdf      = document.getElementById('btnToPdf');
const btnToPdfDownload = document.getElementById('btnToPdfDownload');
const toPdfStatusLoading = document.getElementById('toPdfStatusLoading');
const toPdfStatusSuccess = document.getElementById('toPdfStatusSuccess');
const toPdfStatusError   = document.getElementById('toPdfStatusError');
const toPdfErrorText     = document.getElementById('toPdfErrorText');
const toPdfProgressWrap  = document.getElementById('toPdfProgressWrap');
const toPdfProgressBar   = document.getElementById('toPdfProgressBar');
const toPdfProgressLabel = document.getElementById('toPdfProgressLabel');
const toPdfLoadingText   = document.getElementById('toPdfLoadingText');

function showToPdfStatus(which) {
  [toPdfStatusLoading, toPdfStatusSuccess, toPdfStatusError].forEach((el) => el.classList.remove('show'));
  if (which) which.classList.add('show');
}

function renderImgList() {
  imgFileList.innerHTML = '';
  imgFiles.forEach((entry, idx) => {
    const row = document.createElement('div');
    row.className = 'file-row';
    row.innerHTML = `
      <span class="drag-handle">⋮⋮</span>
      <span class="file-num">${idx + 1}</span>
      <span class="fname">${entry.file.name}</span>
      <div class="frow-actions">
        <button class="move-btn" data-action="up" data-id="${entry.id}" title="Move up">↑</button>
        <button class="move-btn" data-action="down" data-id="${entry.id}" title="Move down">↓</button>
        <button data-action="remove" data-id="${entry.id}" title="Remove">✕</button>
      </div>`;
    imgFileList.appendChild(row);
  });
  btnToPdf.disabled = imgFiles.length === 0;
  toPdfBytes = null;
  btnToPdfDownload.classList.remove('show');
}

imgFileList.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const idx = imgFiles.findIndex((f) => f.id === id);
  if (idx === -1) return;
  if (btn.dataset.action === 'remove') {
    imgFiles.splice(idx, 1);
  } else if (btn.dataset.action === 'up' && idx > 0) {
    [imgFiles[idx - 1], imgFiles[idx]] = [imgFiles[idx], imgFiles[idx - 1]];
  } else if (btn.dataset.action === 'down' && idx < imgFiles.length - 1) {
    [imgFiles[idx + 1], imgFiles[idx]] = [imgFiles[idx], imgFiles[idx + 1]];
  }
  renderImgList();
});

imgFileInput.addEventListener('change', (e) => {
  Array.from(e.target.files).forEach((file) => {
    if (file.type.startsWith('image/')) imgFiles.push({ file, id: imgIdCounter++ });
  });
  imgFileInput.value = '';
  renderImgList();
});

btnToPdf.addEventListener('click', async () => {
  if (!imgFiles.length) return;

  btnToPdf.disabled = true;
  btnToPdfDownload.classList.remove('show');
  toPdfProgressWrap.classList.add('show');
  showToPdfStatus(toPdfStatusLoading);

  try {
    const outDoc = await PDFLib.PDFDocument.create();

    for (let i = 0; i < imgFiles.length; i++) {
      toPdfLoadingText.textContent = `Adding image ${i + 1} of ${imgFiles.length}…`;
      const file = imgFiles[i].file;
      const bytes = await file.arrayBuffer();

      let image;
      const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
      try {
        image = isPng ? await outDoc.embedPng(bytes) : await outDoc.embedJpg(bytes);
      } catch {
        // Fallback: convert via canvas if format isn't directly embeddable (e.g. webp)
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width; canvas.height = bitmap.height;
        canvas.getContext('2d').drawImage(bitmap, 0, 0);
        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const jpegBytes = Uint8Array.from(atob(jpegDataUrl.split(',')[1]), (c) => c.charCodeAt(0));
        image = await outDoc.embedJpg(jpegBytes);
      }

      const page = outDoc.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });

      const pct = Math.round(((i + 1) / imgFiles.length) * 100);
      toPdfProgressBar.style.width = pct + '%';
      toPdfProgressLabel.textContent = pct + '%';
    }

    toPdfBytes = await outDoc.save();
    toPdfProgressWrap.classList.remove('show');
    showToPdfStatus(toPdfStatusSuccess);
    btnToPdfDownload.classList.add('show');

  } catch (err) {
    console.error(err);
    toPdfProgressWrap.classList.remove('show');
    toPdfErrorText.textContent = 'Could not create a PDF from these images.';
    showToPdfStatus(toPdfStatusError);
  }

  btnToPdf.disabled = false;
});

btnToPdfDownload.addEventListener('click', () => {
  if (!toPdfBytes) return;
  downloadBlob(toPdfBytes, 'images.pdf');
});
