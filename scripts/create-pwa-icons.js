/**
 * PWA 아이콘 생성 스크립트
 * 
 * 임시 아이콘 파일을 생성합니다.
 * 나중에 실제 YAGO VIBE 로고로 교체하세요.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 간단한 SVG 아이콘 생성 (임시)
const createIconSVG = (size) => {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#6366f1"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.3}" fill="white" text-anchor="middle" dominant-baseline="middle" font-weight="bold">YAGO</text>
</svg>`;
};

const publicDir = path.join(__dirname, '..', 'public');

// SVG 파일 생성 (임시)
const svg192 = createIconSVG(192);
const svg512 = createIconSVG(512);

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.svg'), svg192);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.svg'), svg512);

console.log('✅ 임시 PWA 아이콘 SVG 파일 생성 완료!');
console.log('📝 나중에 실제 PNG 아이콘으로 교체하세요:');
console.log('   - public/pwa-192x192.png (192x192px)');
console.log('   - public/pwa-512x512.png (512x512px)');

