// ─── shared.js — common logic across all pages ────────────
export function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

export function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}

export function initInstallPrompt() {
  const installBanner = document.getElementById('installBanner');
  const btnInstall = document.getElementById('btnInstall');
  const btnDismiss = document.getElementById('btnDismiss');
  if (!installBanner) return;

  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBanner.classList.add('show');
  });
  btnInstall?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBanner.classList.remove('show');
  });
  btnDismiss?.addEventListener('click', () => installBanner.classList.remove('show'));
  window.addEventListener('appinstalled', () => {
    installBanner.classList.remove('show');
    deferredPrompt = null;
  });
}

export function initOfflineToast() {
  const toast = document.getElementById('offlineToast');
  if (!toast) return;
  window.addEventListener('offline', () => {
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  });
}

export function downloadBlob(bytes, filename, mime = 'application/pdf') {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 1000);
}

export const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
export const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

export async function loadPdfJs() {
  const pdfjsLib = await import(PDFJS_CDN);
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  return pdfjsLib;
}

// True PDF decryption/encryption (preserves text/vectors — no rasterization)
export async function loadPdfDecrypt() {
  const mod = await import('https://cdn.jsdelivr.net/npm/@pdfsmaller/pdf-decrypt@1/+esm');
  return mod.decryptPDF;
}
export async function loadPdfEncrypt() {
  const mod = await import('https://cdn.jsdelivr.net/npm/@pdfsmaller/pdf-encrypt@1/+esm');
  return mod.encryptPDF;
}

// Auto-init common behaviors on every page that imports this
initServiceWorker();
initInstallPrompt();
initOfflineToast();
