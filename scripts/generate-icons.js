import sharp from 'sharp';
import { readFileSync } from 'fs';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const svgBuffer = readFileSync(`${__dirname}/../public/icon.svg`);

// Create icons directory if it doesn't exist
try {
  mkdirSync(`${__dirname}/../public/icons`, { recursive: true });
} catch (e) {
  // Directory already exists
}

// Generate 192x192 icon
await sharp(svgBuffer)
  .resize(192, 192)
  .png()
  .toFile(`${__dirname}/../public/icons/icon-192.png`);

console.log('Generated icon-192.png');

// Generate 512x512 icon
await sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile(`${__dirname}/../public/icons/icon-512.png`);

console.log('Generated icon-512.png');

console.log('All icons generated successfully!');
