/**
 * generate-icons.js
 * Run once with: node generate-icons.js  (or bun run icons)
 * No extra dependencies — uses canvas via @napi-rs/canvas which ships with native binaries
 * Install: bun add -d @napi-rs/canvas
 */
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const r = size * 0.208; // corner radius ~40/192

  // Background rounded rect
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#1E2A4A');
  bg.addColorStop(1, '#2A1E4A');
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, r);
  ctx.fillStyle = bg;
  ctx.fill();

  // Accent gradient helper
  function accentGrad(x0, y0, x1, y1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#4F8EF7');
    g.addColorStop(1, '#A78BFA');
    return g;
  }

  const s = size / 192; // scale factor

  // Lock body
  ctx.beginPath();
  ctx.roundRect(56 * s, 100 * s, 80 * s, 58 * s, 10 * s);
  ctx.fillStyle = accentGrad(56 * s, 0, 136 * s, 0);
  ctx.fill();

  // Shackle (open — offset right side up)
  ctx.beginPath();
  ctx.moveTo(72 * s, 100 * s);
  ctx.lineTo(72 * s, 76 * s);
  ctx.quadraticCurveTo(72 * s, 52 * s, 96 * s, 52 * s);
  ctx.quadraticCurveTo(118 * s, 52 * s, 118 * s, 70 * s);
  ctx.strokeStyle = accentGrad(72 * s, 0, 118 * s, 0);
  ctx.lineWidth = 12 * s;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Keyhole circle
  ctx.beginPath();
  ctx.arc(96 * s, 124 * s, 10 * s, 0, Math.PI * 2);
  ctx.fillStyle = '#0D0F14';
  ctx.fill();

  // Keyhole slot
  ctx.beginPath();
  ctx.roundRect(92 * s, 124 * s, 8 * s, 14 * s, 3 * s);
  ctx.fillStyle = '#0D0F14';
  ctx.fill();

  return canvas.toBuffer('image/png');
}

async function generate() {
  fs.writeFileSync(path.join(dir, 'icon-192.png'), drawIcon(192));
  console.log('✅ icons/icon-192.png');
  fs.writeFileSync(path.join(dir, 'icon-512.png'), drawIcon(512));
  console.log('✅ icons/icon-512.png');
  console.log('Done!');
}

generate().catch(console.error);
