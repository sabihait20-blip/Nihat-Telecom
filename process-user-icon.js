import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function processIcon() {
  console.log('Processing user provided app icon...');
  const inputPath = 'public/icon.png';
  const iconBuffer = fs.readFileSync(inputPath);

  // Generate PNG sizes
  await sharp(iconBuffer).resize(512, 512).png({ quality: 100, compressionLevel: 6 }).toFile('public/icon-512.png');
  await sharp(iconBuffer).resize(192, 192).png({ quality: 100, compressionLevel: 6 }).toFile('public/icon-192.png');
  await sharp(iconBuffer).resize(96, 96).png({ quality: 100, compressionLevel: 6 }).toFile('public/icon-96.png');
  await sharp(iconBuffer).resize(180, 180).png({ quality: 100, compressionLevel: 6 }).toFile('public/apple-touch-icon.png');
  await sharp(iconBuffer).resize(192, 192).png({ quality: 100, compressionLevel: 6 }).toFile('public/shortcut-recharge.png');
  await sharp(iconBuffer).resize(192, 192).png({ quality: 100, compressionLevel: 6 }).toFile('public/shortcut-addfund.png');

  // Also create base64 embedded SVG for public/icon.svg
  const base64Png = iconBuffer.toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" width="100%" height="100%">
  <rect width="512" height="512" fill="#020617"/>
  <image href="data:image/png;base64,${base64Png}" x="0" y="0" width="512" height="512"/>
</svg>`;

  fs.writeFileSync('public/icon.svg', svgContent, 'utf-8');
  console.log('All icons generated successfully from user image!');
}

processIcon().catch(err => {
  console.error('Error processing icons:', err);
  process.exit(1);
});
