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
  const r = size * 0.208;

  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#0E1118');
  bg.addColorStop(1, '#080A0F');
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, r);
  ctx.fillStyle = bg;
  ctx.fill();

  function accentGrad(x0, y0, x1, y1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#00E5C8');
    g.addColorStop(1, '#7C6AF7');
    return g;
  }

  const s = size / 192;

  ctx.beginPath();
  ctx.moveTo(64 * s, 100 * s);
  ctx.lineTo(64 * s, 76 * s);
  ctx.quadraticCurveTo(64 * s, 52 * s, 96 * s, 52 * s);
  ctx.quadraticCurveTo(128 * s, 52 * s, 128 * s, 72 * s);
  ctx.strokeStyle = accentGrad(64 * s, 0, 128 * s, 0);
  ctx.lineWidth = 12 * s;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.roundRect(50 * s, 96 * s, 92 * s, 62 * s, 14 * s);
  ctx.fillStyle = accentGrad(50 * s, 0, 142 * s, 0);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.roundRect(50 * s, 96 * s, 92 * s, 62 * s, 14 * s);
  ctx.strokeStyle = accentGrad(50 * s, 0, 142 * s, 0);
  ctx.lineWidth = 3 * s;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(96 * s, 120 * s, 11 * s, 0, Math.PI * 2);
  ctx.fillStyle = accentGrad(85 * s, 0, 107 * s, 0);
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(91 * s, 120 * s, 10 * s, 16 * s, 3 * s);
  ctx.fillStyle = accentGrad(85 * s, 0, 107 * s, 0);
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
