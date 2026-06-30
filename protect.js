import { formatBytes, downloadBlob, loadPdfEncrypt } from './shared.js';

let selectedFile = null;
let protectedBytes = null;

const dropZone      = document.getElementById('dropZone');
const fileInput     = document.getElementById('fileInput');
const fileInfo      = document.getElementById('fileInfo');
const fileName      = document.getElementById('fileName');
const fileSize      = document.getElementById('fileSize');
const btnClear      = document.getElementById('btnClear');
const pwInput       = document.getElementById('pwInput');
const pwConfirm     = document.getElementById('pwConfirm');
const togglePw      = document.getElementById('togglePw');
const btnProtect    = document.getElementById('btnProtect');
const btnDownload   = document.getElementById('btnDownload');
const statusLoading = document.getElementById('statusLoading');
const statusSuccess = document.getElementById('statusSuccess');
const statusError   = document.getElementById('statusError');
const errorText     = document.getElementById('errorText');
const mainCard      = document.getElementById('mainCard');

function showStatus(which) {
  [statusLoading, statusSuccess, statusError].forEach((el) => el.classList.remove('show'));
  if (which) which.classList.add('show');
}

function setCardState(state) {
  mainCard.classList.remove('processing', 'done', 'failed');
  if (state === 'processing') mainCard.classList.add('processing');
  if (state === 'done') mainCard.classList.add('done');
  if (state === 'failed') mainCard.classList.add('failed');
}

function checkReady() {
  const hasFile = !!selectedFile;
  const hasPw = pwInput.value.length > 0 && pwInput.value === pwConfirm.value;
  btnProtect.disabled = !(hasFile && hasPw);
}

function setFile(file) {
  selectedFile = file;
  protectedBytes = null;
  fileName.textContent = file.name;
  fileSize.textContent = formatBytes(file.size);
  fileInfo.classList.add('show');
  dropZone.style.display = 'none';
  btnDownload.classList.remove('show');
  showStatus(null);
  setCardState('');
  checkReady();
}

function clearFile() {
  selectedFile = null;
  protectedBytes = null;
  fileInput.value = '';
  fileInfo.classList.remove('show');
  dropZone.style.display = '';
  btnDownload.classList.remove('show');
  showStatus(null);
  setCardState('');
  checkReady();
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
pwInput.addEventListener('input', () => { checkReady(); pwInput.classList.remove('error-border'); pwConfirm.classList.remove('error-border'); });
pwConfirm.addEventListener('input', () => { checkReady(); pwConfirm.classList.remove('error-border'); });

btnProtect.addEventListener('click', async () => {
  if (!selectedFile) return;

  if (pwInput.value !== pwConfirm.value) {
    pwConfirm.classList.add('error-border');
    errorText.textContent = 'Passwords do not match.';
    showStatus(statusError);
    setCardState('failed');
    return;
  }

  btnProtect.disabled = true;
  btnDownload.classList.remove('show');
  showStatus(statusLoading);
  setCardState('processing');

  try {
    const encryptPDF = await loadPdfEncrypt();
    const arrayBuffer = await selectedFile.arrayBuffer();
    protectedBytes = await encryptPDF(new Uint8Array(arrayBuffer), pwInput.value);

    showStatus(statusSuccess);
    setCardState('done');
    btnDownload.classList.add('show');
  } catch (err) {
    console.error(err);
    setCardState('failed');
    errorText.textContent = 'Could not protect this PDF. The file may be corrupted or already encrypted.';
    showStatus(statusError);
  }

  btnProtect.disabled = false;
  checkReady();
});

btnDownload.addEventListener('click', () => {
  if (!protectedBytes) return;
  downloadBlob(protectedBytes, selectedFile.name.replace(/\.pdf$/i, '') + '_protected.pdf');
});
