import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

const svgPath = path.resolve('public/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

const targets = [
  { name: 'icon-192.png', width: 192, height: 192 },
  { name: 'icon-512.png', width: 512, height: 512 },
  { name: 'apple-touch-icon.png', width: 180, height: 180 },
  { name: 'icon.png', width: 512, height: 512 },
];

console.log('Generating PWA PNG icons from SVG...');

for (const target of targets) {
  const resvg = new Resvg(svgBuffer, {
    fitTo: {
      mode: 'width',
      value: target.width,
    },
  });
  const image = resvg.render();
  const pngBuffer = image.asPng();
  
  const targetPath = path.resolve(`public/${target.name}`);
  fs.writeFileSync(targetPath, pngBuffer);
  console.log(`Generated ${target.name} (${target.width}x${target.height}) - ${pngBuffer.length} bytes`);
}

console.log('PNG Icon generation complete!');
