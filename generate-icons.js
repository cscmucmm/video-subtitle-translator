const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // 背景：渐变圆形
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#4CAF50');
  gradient.addColorStop(1, '#2196F3');
  
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // 字幕图标：两条横线
  ctx.fillStyle = '#FFFFFF';
  const lineHeight = Math.max(2, size / 8);
  const lineY1 = size * 0.35;
  const lineY2 = size * 0.55;
  const lineX1 = size * 0.2;
  const lineX2 = size * 0.8;
  
  // 第一条线
  ctx.fillRect(lineX1, lineY1, lineX2 - lineX1, lineHeight);
  
  // 第二条线（稍短）
  ctx.fillRect(lineX1, lineY2, (lineX2 - lineX1) * 0.7, lineHeight);
  
  // 保存
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buffer);
  console.log(`Created icon${size}.png`);
});

console.log('All icons created!');
