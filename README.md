# PDF Unlocker PWA

A fully client-side Progressive Web App that removes PDF passwords and permission restrictions — no server, no uploads.

## Features
- Remove open (user) password protection
- Strip owner/permission restrictions (copy, print, edit)
- Works completely offline once installed
- "Add to Home Screen" install prompt on Android Chrome
- Mobile-first dark UI

## Stack
- Vanilla HTML/CSS/JS — zero framework
- [pdf-lib](https://pdf-lib.js.org/) for PDF manipulation (loaded from CDN, cached by SW)
- Service Worker for offline support + caching

## Getting Started

```bash
npm install
npm run dev
# open http://localhost:3000 in Android Chrome
```

## Generate PNG icons (optional, for better maskable icons)

```bash
npm run icons
# produces icons/icon-192.png and icons/icon-512.png
```

The app works without PNG icons — it uses `icon.svg` directly.

## Deploying

Drop the files on any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages).  
Make sure the server serves `manifest.json` with `Content-Type: application/manifest+json`.

## Notes
- AES-256 encrypted PDFs are not supported by pdf-lib (uncommon). Use `qpdf` CLI for those.
- All file processing is local — nothing leaves the browser.
