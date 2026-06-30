import { formatBytes, downloadBlob, loadPdfDecrypt } from './shared.js';

let selectedFile = null;
let unlockedBytes = null;

const dropZone      = document.getElementById('dropZone');
const fileInput     = document.getElementById('fileInput');
const fileInfo      = document.getElementById('fileInfo');
const fileName      = document.getElementById('fileName');
const fileSize      = document.getElementById('fileSize');
const btnClear      = document.getElementById('btnClear');
const pwInput       = document.getElementById('pwInput');
const togglePw      = document.getElementById('togglePw');
const btnUnlock     = document.getElementById('btnUnlock');
const btnDownload   = document.getElementById('btnDownload');
const statusLoading = document.getElementById('statusLoading');
const statusSuccess = document.getElementById('statusSuccess');
const statusError   = document.getElementById('statusError');
const errorText     = document.getElementById('errorText');
const loadingText   = document.getElementById('loadingText');
const progressWrap  = document.getElementById('progressWrap');
const progressBar   = document.getElementById('progressBar');
const progressLabel = document.getElementById('progressLabel');
const lockWrap      = document.getElementById('lockWrap');
const mainCard      = document.getElementById('mainCard');

function setLockState(state) {
  lockWrap.classList.remove('loading', 'unlocked', 'error');
  mainCard.classList.remove('processing', 'done', 'failed');
  if (state === 'loading')  { lockWrap.classList.add('loading');  mainCard.classList.add('processing'); }
  if (state === 'unlocked') { lockWrap.classList.add('unlocked'); mainCard.classList.add('done'); }
  if (state === 'error')    { lockWrap.classList.add('error');    mainCard.classList.add('failed'); }
}

function showStatus(which) {
  [statusLoading, statusSuccess, statusError].forEach((el) => el.classList.remove('show'));
  if (which) which.classList.add('show');
}

function setProgress(current, total) {
  const pct = Math.round((current / total) * 100);
  progressBar.style.width = pct + '%';
  progressLabel.textContent = pct + '%';
}

function setFile(file) {
  selectedFile = file;
  unlockedBytes = null;
  fileName.textContent = file.name;
  fileSize.textContent = formatBytes(file.size);
  fileInfo.classList.add('show');
  dropZone.style.display = 'none';
  btnUnlock.disabled = false;
  btnDownload.classList.remove('show');
  progressWrap.classList.remove('show');
  showStatus(null);
  setLockState('');
  pwInput.classList.remove('error-border');
}

function clearFile() {
  selectedFile = null;
  unlockedBytes = null;
  fileInput.value = '';
  fileInfo.classList.remove('show');
  dropZone.style.display = '';
  btnUnlock.disabled = true;
  btnDownload.classList.remove('show');
  progressWrap.classList.remove('show');
  showStatus(null);
  setLockState('');
  pwInput.value = '';
  pwInput.classList.remove('error-border');
}

fileInput.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) setFile(f); });
btnClear.addEventListener('click', clearFile);
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault(); dropZone.classList.remove('dragover');
  const f = e.dataTransfer.files[0]; if (f) setFile(f);
});
togglePw.addEventListener('click', () => {
  const isText = pwInput.type === 'text';
  pwInput.type = isText ? 'password' : 'text';
  togglePw.textContent = isText ? '👁' : '🙈';
});

async function unlockPdf(arrayBuffer, password) {
  const decryptPDF = await loadPdfDecrypt();

  loadingText.textContent = 'Decrypting…';

  try {
    const decrypted = await decryptPDF(new Uint8Array(arrayBuffer), password || '');
    return decrypted;
  } catch (err) {
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('password') || msg.includes('incorrect') || msg.includes('decrypt')) {
      const e = new Error('wrong_password');
      e.needsPassword = !password;
      throw e;
    }
    // If it's not actually encrypted, just hand the original bytes back
    if (msg.includes('not encrypted') || msg.includes('no encryption')) {
      return new Uint8Array(arrayBuffer);
    }
    throw err;
  }
}

btnUnlock.addEventListener('click', async () => {
  if (!selectedFile) return;

  btnUnlock.disabled = true;
  btnDownload.classList.remove('show');
  progressWrap.classList.remove('show');
  loadingText.textContent = 'Decrypting…';
  showStatus(statusLoading);
  setLockState('loading');
  pwInput.classList.remove('error-border');

  try {
    const arrayBuffer = await selectedFile.arrayBuffer();
    const password = pwInput.value || '';
    unlockedBytes = await unlockPdf(arrayBuffer, password);
    showStatus(statusSuccess);
    setLockState('unlocked');
    btnDownload.classList.add('show');
  } catch (err) {
    console.error(err);
    progressWrap.classList.remove('show');
    setLockState('error');
    if (err.message === 'wrong_password') {
      pwInput.classList.add('error-border');
      errorText.textContent = err.needsPassword
        ? 'This PDF is password-protected. Enter the password above.'
        : 'Wrong password. Please try again.';
    } else {
      errorText.textContent = 'Could not unlock this PDF. The file may be corrupted.';
    }
    showStatus(statusError);
  }

  btnUnlock.disabled = false;
});

btnDownload.addEventListener('click', () => {
  if (!unlockedBytes) return;
  downloadBlob(unlockedBytes, selectedFile.name.replace(/\.pdf$/i, '') + '_unlocked.pdf');
});
