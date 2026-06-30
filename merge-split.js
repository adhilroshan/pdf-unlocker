import { formatBytes, downloadBlob } from './shared.js';

// ─── Mode toggle ────────────────────────────────────────
const modeMerge = document.getElementById('modeMerge');
const modeSplit = document.getElementById('modeSplit');
const mergeCard = document.getElementById('mergeCard');
const splitCard = document.getElementById('splitCard');

function syncMode() {
  mergeCard.style.display = modeMerge.checked ? '' : 'none';
  splitCard.style.display = modeSplit.checked ? '' : 'none';
}
modeMerge.addEventListener('change', syncMode);
modeSplit.addEventListener('change', syncMode);

// ════════════════════════════════════════════════════════
// MERGE
// ════════════════════════════════════════════════════════
let mergeFiles = []; // { file, id }
let mergedBytes = null;
let idCounter = 0;

const mergeFileList    = document.getElementById('mergeFileList');
const mergeFileInput   = document.getElementById('mergeFileInput');
const btnMerge         = document.getElementById('btnMerge');
const btnMergeDownload = document.getElementById('btnMergeDownload');
const mergeStatusLoading = document.getElementById('mergeStatusLoading');
const mergeStatusSuccess = document.getElementById('mergeStatusSuccess');
const mergeStatusError   = document.getElementById('mergeStatusError');
const mergeErrorText     = document.getElementById('mergeErrorText');
const mergeProgressWrap  = document.getElementById('mergeProgressWrap');
const mergeProgressBar   = document.getElementById('mergeProgressBar');
const mergeProgressLabel = document.getElementById('mergeProgressLabel');

function showMergeStatus(which) {
  [mergeStatusLoading, mergeStatusSuccess, mergeStatusError].forEach((el) => el.classList.remove('show'));
  if (which) which.classList.add('show');
}

function renderMergeList() {
  mergeFileList.innerHTML = '';
  mergeFiles.forEach((entry, idx) => {
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
    mergeFileList.appendChild(row);
  });
  btnMerge.disabled = mergeFiles.length < 2;
  mergedBytes = null;
  btnMergeDownload.classList.remove('show');
}

mergeFileList.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const idx = mergeFiles.findIndex((f) => f.id === id);
  if (idx === -1) return;

  if (btn.dataset.action === 'remove') {
    mergeFiles.splice(idx, 1);
  } else if (btn.dataset.action === 'up' && idx > 0) {
    [mergeFiles[idx - 1], mergeFiles[idx]] = [mergeFiles[idx], mergeFiles[idx - 1]];
  } else if (btn.dataset.action === 'down' && idx < mergeFiles.length - 1) {
    [mergeFiles[idx + 1], mergeFiles[idx]] = [mergeFiles[idx], mergeFiles[idx + 1]];
  }
  renderMergeList();
});

mergeFileInput.addEventListener('change', (e) => {
  Array.from(e.target.files).forEach((file) => {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      mergeFiles.push({ file, id: idCounter++ });
    }
  });
  mergeFileInput.value = '';
  renderMergeList();
});

btnMerge.addEventListener('click', async () => {
  if (mergeFiles.length < 2) return;

  btnMerge.disabled = true;
  btnMergeDownload.classList.remove('show');
  mergeProgressWrap.classList.add('show');
  showMergeStatus(mergeStatusLoading);

  try {
    const outDoc = await PDFLib.PDFDocument.create();

    for (let i = 0; i < mergeFiles.length; i++) {
      const pct = Math.round(((i) / mergeFiles.length) * 100);
      mergeProgressBar.style.width = pct + '%';
      mergeProgressLabel.textContent = pct + '%';

      const bytes = await mergeFiles[i].file.arrayBuffer();
      const srcDoc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
      const pageIndices = srcDoc.getPageIndices();
      const copiedPages = await outDoc.copyPages(srcDoc, pageIndices);
      copiedPages.forEach((p) => outDoc.addPage(p));
    }

    mergeProgressBar.style.width = '100%';
    mergeProgressLabel.textContent = '100%';

    mergedBytes = await outDoc.save();
    mergeProgressWrap.classList.remove('show');
    showMergeStatus(mergeStatusSuccess);
    btnMergeDownload.classList.add('show');
  } catch (err) {
    console.error(err);
    mergeProgressWrap.classList.remove('show');
    mergeErrorText.textContent = 'Could not merge these PDFs. One of the files may be corrupted or encrypted.';
    showMergeStatus(mergeStatusError);
  }

  btnMerge.disabled = false;
});

btnMergeDownload.addEventListener('click', () => {
  if (!mergedBytes) return;
  downloadBlob(mergedBytes, 'merged.pdf');
});

// ════════════════════════════════════════════════════════
// SPLIT
// ════════════════════════════════════════════════════════
let splitFile = null;
let splitResults = []; // { name, bytes }

const splitDropZone   = document.getElementById('splitDropZone');
const splitFileInput  = document.getElementById('splitFileInput');
const splitFileInfo   = document.getElementById('splitFileInfo');
const splitFileName   = document.getElementById('splitFileName');
const splitFileSize   = document.getElementById('splitFileSize');
const splitBtnClear   = document.getElementById('splitBtnClear');
const splitOptionsSection = document.getElementById('splitOptionsSection');
const splitAll        = document.getElementById('splitAll');
const splitRange      = document.getElementById('splitRange');
const rangeInputWrap  = document.getElementById('rangeInputWrap');
const rangeInput      = document.getElementById('rangeInput');
const btnSplit         = document.getElementById('btnSplit');
const splitStatusLoading = document.getElementById('splitStatusLoading');
const splitStatusError   = document.getElementById('splitStatusError');
const splitErrorText     = document.getElementById('splitErrorText');
const splitProgressWrap  = document.getElementById('splitProgressWrap');
const splitProgressBar   = document.getElementById('splitProgressBar');
const splitProgressLabel = document.getElementById('splitProgressLabel');
const splitResultsSection = document.getElementById('splitResultsSection');
const splitResultList    = document.getElementById('splitResultList');
const btnDownloadAll     = document.getElementById('btnDownloadAll');

function showSplitStatus(which) {
  [splitStatusLoading, splitStatusError].forEach((el) => el.classList.remove('show'));
  if (which) which.classList.add('show');
}

function setSplitFile(file) {
  splitFile = file;
  splitFileName.textContent = file.name;
  splitFileSize.textContent = formatBytes(file.size);
  splitFileInfo.classList.add('show');
  splitDropZone.style.display = 'none';
  splitOptionsSection.style.display = '';
  btnSplit.disabled = false;
  splitResultsSection.style.display = 'none';
  splitResultList.innerHTML = '';
  btnDownloadAll.style.display = 'none';
  showSplitStatus(null);
}

function clearSplitFile() {
  splitFile = null;
  splitFileInput.value = '';
  splitFileInfo.classList.remove('show');
  splitDropZone.style.display = '';
  splitOptionsSection.style.display = 'none';
  btnSplit.disabled = true;
  splitResultsSection.style.display = 'none';
  splitResultList.innerHTML = '';
  btnDownloadAll.style.display = 'none';
  showSplitStatus(null);
}

splitFileInput.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) setSplitFile(f); });
splitBtnClear.addEventListener('click', clearSplitFile);
splitDropZone.addEventListener('dragover', (e) => { e.preventDefault(); splitDropZone.classList.add('dragover'); });
splitDropZone.addEventListener('dragleave', () => splitDropZone.classList.remove('dragover'));
splitDropZone.addEventListener('drop', (e) => {
  e.preventDefault(); splitDropZone.classList.remove('dragover');
  const f = e.dataTransfer.files[0]; if (f) setSplitFile(f);
});
splitAll.addEventListener('change', () => { rangeInputWrap.style.display = splitAll.checked ? 'none' : ''; });
splitRange.addEventListener('change', () => { rangeInputWrap.style.display = splitRange.checked ? '' : 'none'; });

function parseRanges(str, maxPage) {
  const pages = new Set();
  str.split(',').forEach((part) => {
    part = part.trim();
    if (!part) return;
    if (part.includes('-')) {
      const [a, b] = part.split('-').map((n) => parseInt(n.trim(), 10));
      if (!isNaN(a) && !isNaN(b)) {
        for (let p = Math.min(a, b); p <= Math.max(a, b); p++) {
          if (p >= 1 && p <= maxPage) pages.add(p);
        }
      }
    } else {
      const n = parseInt(part, 10);
      if (!isNaN(n) && n >= 1 && n <= maxPage) pages.add(n);
    }
  });
  return Array.from(pages).sort((a, b) => a - b);
}

btnSplit.addEventListener('click', async () => {
  if (!splitFile) return;

  btnSplit.disabled = true;
  splitResultsSection.style.display = 'none';
  splitResultList.innerHTML = '';
  btnDownloadAll.style.display = 'none';
  splitProgressWrap.classList.add('show');
  showSplitStatus(splitStatusLoading);

  try {
    const bytes = await splitFile.arrayBuffer();
    const srcDoc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();
    const baseName = splitFile.name.replace(/\.pdf$/i, '');

    let pageNumbers;
    if (splitAll.checked) {
      pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      pageNumbers = parseRanges(rangeInput.value, totalPages);
      if (pageNumbers.length === 0) {
        throw new Error('No valid page numbers found in range.');
      }
    }

    splitResults = [];
    for (let i = 0; i < pageNumbers.length; i++) {
      const pageNum = pageNumbers[i];
      const pct = Math.round((i / pageNumbers.length) * 100);
      splitProgressBar.style.width = pct + '%';
      splitProgressLabel.textContent = pct + '%';

      const outDoc = await PDFLib.PDFDocument.create();
      const [copiedPage] = await outDoc.copyPages(srcDoc, [pageNum - 1]);
      outDoc.addPage(copiedPage);
      const outBytes = await outDoc.save();
      splitResults.push({ name: `${baseName}_page${pageNum}.pdf`, bytes: outBytes });
    }

    splitProgressBar.style.width = '100%';
    splitProgressLabel.textContent = '100%';
    splitProgressWrap.classList.remove('show');
    showSplitStatus(null);

    splitResultList.innerHTML = '';
    splitResults.forEach((r, idx) => {
      const row = document.createElement('div');
      row.className = 'result-row';
      row.innerHTML = `<span class="fname">${r.name}</span><button class="dl-btn" data-idx="${idx}">↓ Save</button>`;
      splitResultList.appendChild(row);
    });
    splitResultsSection.style.display = '';
    btnDownloadAll.style.display = splitResults.length > 1 ? '' : 'none';

  } catch (err) {
    console.error(err);
    splitProgressWrap.classList.remove('show');
    splitErrorText.textContent = err.message?.includes('range')
      ? err.message
      : 'Could not split this PDF. The file may be corrupted or encrypted.';
    showSplitStatus(splitStatusError);
  }

  btnSplit.disabled = false;
});

splitResultList.addEventListener('click', (e) => {
  const btn = e.target.closest('.dl-btn');
  if (!btn) return;
  const r = splitResults[Number(btn.dataset.idx)];
  if (r) downloadBlob(r.bytes, r.name);
});

btnDownloadAll.addEventListener('click', async () => {
  if (!splitResults.length) return;
  const zip = new JSZip();
  splitResults.forEach((r) => zip.file(r.name, r.bytes));
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (splitFile.name.replace(/\.pdf$/i, '') || 'split') + '_pages.zip';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 1000);
});
