// ─── State ────────────────────────────────────────────────
let selectedFile = null;
let unlockedBytes = null;
let deferredInstallPrompt = null;

// ─── DOM refs ─────────────────────────────────────────────
const dropZone       = document.getElementById('dropZone');
const fileInput      = document.getElementById('fileInput');
const fileInfo       = document.getElementById('fileInfo');
const fileName       = document.getElementById('fileName');
const fileSize       = document.getElementById('fileSize');
const btnClear       = document.getElementById('btnClear');
const pwInput        = document.getElementById('pwInput');
const togglePw       = document.getElementById('togglePw');
const btnUnlock      = document.getElementById('btnUnlock');
const btnDownload    = document.getElementById('btnDownload');
const statusLoading  = document.getElementById('statusLoading');
const statusSuccess  = document.getElementById('statusSuccess');
const statusError    = document.getElementById('statusError');
const errorText      = document.getElementById('errorText');
const installBanner  = document.getElementById('installBanner');
const btnInstall     = document.getElementById('btnInstall');
const btnDismiss     = document.getElementById('btnDismiss');
const offlineToast   = document.getElementById('offlineToast');

// ─── Service Worker registration ──────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}

// ─── PWA Install prompt ───────────────────────────────────
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  installBanner.classList.add('show');
});

btnInstall.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installBanner.classList.remove('show');
});

btnDismiss.addEventListener('click', () => installBanner.classList.remove('show'));

window.addEventListener('appinstalled', () => {
  installBanner.classList.remove('show');
  deferredInstallPrompt = null;
});

// ─── Offline toast ────────────────────────────────────────
function showOfflineToast() {
  offlineToast.classList.add('show');
  setTimeout(() => offlineToast.classList.remove('show'), 3000);
}
window.addEventListener('offline', showOfflineToast);

// ─── Helpers ──────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function showStatus(which) {
  [statusLoading, statusSuccess, statusError].forEach((el) => el.classList.remove('show'));
  if (which) which.classList.add('show');
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
  showStatus(null);
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
  showStatus(null);
  pwInput.value = '';
  pwInput.classList.remove('error-border');
}

// ─── File selection ───────────────────────────────────────
fileInput.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (f && f.type === 'application/pdf') setFile(f);
});

btnClear.addEventListener('click', clearFile);

// ─── Drag & drop ──────────────────────────────────────────
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const f = e.dataTransfer.files[0];
  if (f && f.type === 'application/pdf') setFile(f);
});

// ─── Password toggle ──────────────────────────────────────
togglePw.addEventListener('click', () => {
  const isText = pwInput.type === 'text';
  pwInput.type = isText ? 'password' : 'text';
  togglePw.textContent = isText ? '👁' : '🙈';
});

// ─── Unlock logic ─────────────────────────────────────────
btnUnlock.addEventListener('click', async () => {
  if (!selectedFile) return;

  btnUnlock.disabled = true;
  btnDownload.classList.remove('show');
  showStatus(statusLoading);
  pwInput.classList.remove('error-border');

  try {
    const arrayBuffer = await selectedFile.arrayBuffer();
    const password = pwInput.value || undefined;

    let pdfDoc;
    try {
      pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, {
        password,
        ignoreEncryption: false,
      });
    } catch (loadErr) {
      const msg = (loadErr.message || '').toLowerCase();
      if (msg.includes('password') || msg.includes('encrypt') || msg.includes('decrypt')) {
        pwInput.classList.add('error-border');
        errorText.textContent = password
          ? 'Wrong password. Please try again.'
          : 'This PDF is password-protected. Enter the password above.';
        showStatus(statusError);
        btnUnlock.disabled = false;
        return;
      }
      throw loadErr;
    }

    // Save fresh — pdf-lib drops all encryption and permission restrictions
    unlockedBytes = await pdfDoc.save();
    showStatus(statusSuccess);
    btnDownload.classList.add('show');

  } catch (err) {
    console.error(err);
    errorText.textContent = 'Could not unlock this PDF. It may use unsupported AES-256 encryption.';
    showStatus(statusError);
  }

  btnUnlock.disabled = false;
});

// ─── Download ─────────────────────────────────────────────
btnDownload.addEventListener('click', () => {
  if (!unlockedBytes) return;
  const blob = new Blob([unlockedBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const original = selectedFile.name.replace(/\.pdf$/i, '');
  a.href = url;
  a.download = `${original}_unlocked.pdf`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 1000);
});
