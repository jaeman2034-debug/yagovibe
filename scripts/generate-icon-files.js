#!/usr/bin/env node

/**
 * 🎨 YAGO VIBE PWA 아이콘 파일 생성 스크립트
 * 
 * 기존 SVG를 기반으로 필요한 PNG 아이콘 파일을 생성합니다.
 * 
 * 실행: node scripts/generate-icon-files.js
 * 
 * 주의: 이 스크립트는 임시 아이콘을 생성합니다.
 * 나중에 실제 디자인된 아이콘으로 교체하세요.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// ============================================================
// 1️⃣ icons 폴더 생성
// ============================================================

const iconsDir = join(rootDir, 'public', 'icons');
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
  console.log('✅ public/icons 폴더 생성 완료');
} else {
  console.log('ℹ️  public/icons 폴더 이미 존재');
}

// ============================================================
// 2️⃣ 기존 SVG 파일 확인
// ============================================================

const svg512Path = join(rootDir, 'public', 'pwa-512x512.svg');
const svg192Path = join(rootDir, 'public', 'pwa-192x192.svg');

let svg512Content = null;
let svg192Content = null;

if (existsSync(svg512Path)) {
  svg512Content = readFileSync(svg512Path, 'utf-8');
  console.log('✅ 기존 SVG 파일 발견: pwa-512x512.svg');
} else {
  console.log('⚠️  pwa-512x512.svg 파일 없음 - 기본 SVG 생성');
}

if (existsSync(svg192Path)) {
  svg192Content = readFileSync(svg192Path, 'utf-8');
  console.log('✅ 기존 SVG 파일 발견: pwa-192x192.svg');
}

// ============================================================
// 3️⃣ 기본 SVG 생성 (기존 파일이 없을 경우)
// ============================================================

function createDefaultSVG(size) {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0f172a" rx="${size * 0.1}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.25}" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" font-weight="bold">YAGO</text>
  <text x="50%" y="60%" font-family="Arial, sans-serif" font-size="${size * 0.1}" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" opacity="0.8">VIBE</text>
</svg>`;
}

if (!svg512Content) {
  svg512Content = createDefaultSVG(512);
}

if (!svg192Content) {
  svg192Content = svg512Content; // 512를 192로 사용 (나중에 리사이즈)
}

// ============================================================
// 4️⃣ SVG를 Data URL로 변환 (임시 해결책)
// ============================================================

// SVG를 base64로 인코딩하여 HTML 파일로 저장 (브라우저에서 PNG로 변환 가능)
function createIconHTML(svgContent, filename, size) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${filename} - ${size}x${size}</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
      font-family: Arial, sans-serif;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 { color: #333; }
    .preview {
      margin: 20px 0;
      text-align: center;
    }
    canvas {
      border: 1px solid #ddd;
      border-radius: 8px;
    }
    .download-btn {
      display: inline-block;
      margin-top: 20px;
      padding: 12px 24px;
      background: #0f172a;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
    }
    .download-btn:hover {
      background: #1e293b;
    }
    .instructions {
      margin-top: 20px;
      padding: 15px;
      background: #f0f9ff;
      border-left: 4px solid #0f172a;
      border-radius: 4px;
    }
    .instructions ol {
      margin: 10px 0;
      padding-left: 20px;
    }
    .instructions li {
      margin: 8px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${filename} 생성기</h1>
    <p>크기: ${size}x${size}px</p>
    
    <div class="preview">
      <canvas id="canvas" width="${size}" height="${size}"></canvas>
    </div>
    
    <div style="text-align: center;">
      <a href="#" class="download-btn" id="downloadBtn">PNG 다운로드</a>
    </div>
    
    <div class="instructions">
      <h3>📋 사용 방법:</h3>
      <ol>
        <li>위의 "PNG 다운로드" 버튼을 클릭하세요</li>
        <li>다운로드된 PNG 파일을 <code>public/icons/${filename}</code>에 저장하세요</li>
        <li>파일 이름이 정확히 <code>${filename}</code>인지 확인하세요</li>
      </ol>
    </div>
  </div>

  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
      ctx.drawImage(img, 0, 0, ${size}, ${size});
      
      // 다운로드 버튼 이벤트
      document.getElementById('downloadBtn').addEventListener('click', function(e) {
        e.preventDefault();
        canvas.toBlob(function(blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = '${filename}';
          a.click();
          URL.revokeObjectURL(url);
        }, 'image/png');
      });
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(\`${svgContent.replace(/`/g, '\\`')}\`)));
  </script>
</body>
</html>`;
}

// ============================================================
// 5️⃣ HTML 파일 생성 (브라우저에서 PNG 변환용)
// ============================================================

const iconFiles = [
  { name: 'icon-192.png', size: 192, svg: svg192Content || svg512Content },
  { name: 'icon-512.png', size: 512, svg: svg512Content },
  { name: 'icon-maskable-512.png', size: 512, svg: svg512Content },
  { name: 'apple-touch-180.png', size: 180, svg: svg192Content || svg512Content },
];

console.log('\n📦 아이콘 생성 HTML 파일 생성 중...\n');

iconFiles.forEach(({ name, size, svg }) => {
  const htmlPath = join(rootDir, 'public', 'icons', `${name.replace('.png', '')}.html`);
  const htmlContent = createIconHTML(svg, name, size);
  writeFileSync(htmlPath, htmlContent, 'utf-8');
  console.log(`  ✅ ${name.replace('.png', '')}.html 생성 완료`);
});

// ============================================================
// 6️⃣ README 생성
// ============================================================

const readmeContent = `# 📱 YAGO VIBE 아이콘 생성 가이드

## 🎯 필요한 파일

다음 4개 PNG 파일이 필요합니다:

- \`icon-192.png\` (192x192px)
- \`icon-512.png\` (512x512px)
- \`icon-maskable-512.png\` (512x512px, 안전 여백 포함)
- \`apple-touch-180.png\` (180x180px)

## 🚀 생성 방법

### 방법 1: HTML 파일 사용 (권장)

1. \`public/icons/\` 폴더에서 각 HTML 파일을 브라우저로 열기:
   - \`icon-192.html\`
   - \`icon-512.html\`
   - \`icon-maskable-512.html\`
   - \`apple-touch-180.html\`

2. 각 페이지에서 "PNG 다운로드" 버튼 클릭

3. 다운로드된 파일을 \`public/icons/\`에 저장 (파일 이름 그대로)

### 방법 2: 온라인 변환 도구

1. \`public/pwa-512x512.svg\` 파일 업로드
2. https://cloudconvert.com/svg-to-png 사용
3. 원하는 크기로 변환 후 다운로드

### 방법 3: 디자인 툴 사용

1. Figma / Sketch / Adobe XD에서 512x512px 캔버스 생성
2. YAGO VIBE 로고 배치
3. 각 크기로 내보내기

## ✅ 완료 확인

\`npm run check:deploy\` 실행하여 아이콘 파일 확인

## ⚠️ 중요

- 파일 이름은 정확히 일치해야 합니다 (대소문자 포함)
- \`icon-maskable-512.png\`는 안전 여백(20%)이 필요합니다
`;

const readmePath = join(rootDir, 'public', 'icons', 'README.md');
writeFileSync(readmePath, readmeContent, 'utf-8');

console.log('\n✅ 모든 아이콘 생성 HTML 파일 생성 완료!\n');
console.log('📋 다음 단계:');
console.log('   1. public/icons/ 폴더에서 HTML 파일들을 브라우저로 열기');
console.log('   2. 각 페이지에서 "PNG 다운로드" 버튼 클릭');
console.log('   3. 다운로드된 PNG 파일을 public/icons/에 저장');
console.log('   4. npm run check:deploy 실행하여 확인\n');
