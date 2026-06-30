import { formatBytes, downloadBlob, loadPdfJs } from './shared.js';

let selectedFile = null;
let compressedBytes = null;

const dropZone      = document.getElementById('dropZone');
const fileInput     = document.getElementById('fileInput');
const fileInfo      = document.getElementById('fileInfo');
const fileName      = document.getElementById('fileName');
const fileSize      = document.getElementById('fileSize');
const btnClear      = document.getElementById('btnClear');
const qualitySection = document.getElementById('qualitySection');
const qualitySlider = document.getElementById('qualitySlider');
const qualityLabel  = document.getElementById('qualityLabel');
const btnCompress   = document.getElementById('btnCompress');
const btnDownload   = document.getElementById('btnDownload');
const statusLoading = document.getElementById('statusLoading');
const statusSuccess = document.getElementById('statusSuccess');
const statusError   = document.getElementById('statusError');
const successText   = document.getElementById('successText');
const errorText     = document.getElementById('errorText');
const loadingText   = document.getElementById('loadingText');
const progressWrap  = document.getElementById('progressWrap');
const progressBar   = document.getElementById('progressBar');
const progressLabel = document.getElementById('progressLabel');
const mainCard      = document.getElementById('mainCard');

const QUALITY_PRESETS = {
  1: { label: 'Smaller file', jpegQuality: 0.45, scale: 1.3 },
  2: { label: 'Balanced',     jpegQuality: 0.65, scale: 1.6 },
  3: { label: 'Higher quality', jpegQuality: 0.82, scale: 2.0 },
};

qualitySlider.addEventListener('input', () => {
  qualityLabel.textContent = QUALITY_PRESETS[qualitySlider.value].label;
});

function showStatus(which) {
  [statusLoading, statusSuccess, statusError].forEach((el) => el.classList.remove('show'));
  if (which) which.classList.add('show');
}
function setCardState(state) {
  mainCard.classList.remove('processing', 'done', 'failed');
  if (state) mainCard.classList.add(state);
}

function setFile(file) {
  selectedFile = file;
  compressedBytes = null;
  fileName.textContent = file.name;
  fileSize.textContent = formatBytes(file.size);
  fileInfo.classList.add('show');
  dropZone.style.display = 'none';
  qualitySection.style.display = '';
  btnCompress.disabled = false;
  btnDownload.classList.remove('show');
  progressWrap.classList.remove('show');
  showStatus(null);
  setCardState('');
}
function clearFile() {
  selectedFile = null;
  compressedBytes = null;
  fileInput.value = '';
  fileInfo.classList.remove('show');
  dropZone.style.display = '';
  qualitySection.style.display = 'none';
  btnCompress.disabled = true;
  btnDownload.classList.remove('show');
  progressWrap.classList.remove('show');
  showStatus(null);
  setCardState('');
}

fileInput.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) setFile(f); });
btnClear.addEventListener('click', clearFile);
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault(); dropZone.classList.remove('dragover');
  const f = e.dataTransfer.files[0]; if (f) setFile(f);
});

btnCompress.addEventListener('click', async () => {
  if (!selectedFile) return;

  btnCompress.disabled = true;
  btnDownload.classList.remove('show');
  progressWrap.classList.add('show');
  loadingText.textContent = 'Loading PDF…';
  showStatus(statusLoading);
  setCardState('processing');

  try {
    const preset = QUALITY_PRESETS[qualitySlider.value];
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await selectedFile.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const numPages = pdfDoc.numPages;

    const outDoc = await PDFLib.PDFDocument.create();
    const offscreen = document.createElement('canvas');
    const ctx = offscreen.getContext('2d');

    for (let i = 1; i <= numPages; i++) {
      loadingText.textContent = `Compressing page ${i} of ${numPages}…`;
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: preset.scale });

      offscreen.width = viewport.width;
      offscreen.height = viewport.height;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, offscreen.width, offscreen.height);
      await page.render({ canvasContext: ctx, viewport }).promise;

      const jpegDataUrl = offscreen.toDataURL('image/jpeg', preset.jpegQuality);
      const jpegBytes = Uint8Array.from(atob(jpegDataUrl.split(',')[1]), (c) => c.charCodeAt(0));
      const jpegImage = await outDoc.embedJpg(jpegBytes);

      const w = viewport.width / preset.scale;
      const h = viewport.height / preset.scale;
      const outPage = outDoc.addPage([w, h]);
      outPage.drawImage(jpegImage, { x: 0, y: 0, width: w, height: h });

      const pct = Math.round((i / numPages) * 100);
      progressBar.style.width = pct + '%';
      progressLabel.textContent = pct + '%';
    }

    compressedBytes = await outDoc.save();
    progressWrap.classList.remove('show');

    const origSize = selectedFile.size;
    const newSize = compressedBytes.byteLength;
    const savedPct = Math.max(0, Math.round((1 - newSize / origSize) * 100));
    successText.textContent = savedPct > 0
      ? `Compressed — ${formatBytes(newSize)} (saved ${savedPct}%)`
      : `Done — ${formatBytes(newSize)} (already optimized)`;

    showStatus(statusSuccess);
    setCardState('done');
    btnDownload.classList.add('show');

  } catch (err) {
    console.error(err);
    progressWrap.classList.remove('show');
    setCardState('failed');
    errorText.textContent = 'Could not compress this PDF. It may be encrypted or corrupted.';
    showStatus(statusError);
  }

  btnCompress.disabled = false;
});

btnDownload.addEventListener('click', () => {
  if (!compressedBytes) return;
  downloadBlob(compressedBytes, selectedFile.name.replace(/\.pdf$/i, '') + '_compressed.pdf');
});
