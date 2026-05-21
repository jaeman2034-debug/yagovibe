#!/usr/bin/env node

/**
 * 🚀 YAGO VIBE 배포 전 최종 체크리스트 자동 검증
 * 
 * 실행: node scripts/pre-deploy-checklist.js
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const checks = {
  mobile: [],
  pwa: [],
  routing: [],
  server: [],
  performance: [],
  manual: []
};

const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  manual: []
};

// ============================================================
// 1️⃣ 모바일 UI 점검
// ============================================================

function checkMobileUI() {
  console.log('\n📱 1️⃣ 모바일 UI 점검\n');
  
  // mobile.css 존재 확인
  const mobileCssPath = join(rootDir, 'src', 'styles', 'mobile.css');
  if (existsSync(mobileCssPath)) {
    const content = readFileSync(mobileCssPath, 'utf-8');
    
    const checks = [
      { name: 'Safe-area 적용됨 (노치 대응)', pattern: /env\(safe-area-inset/ },
      { name: '버튼 터치 영역 44px 이상', pattern: /min-height:\s*44px/ },
      { name: '입력창 확대 방지 (iOS)', pattern: /font-size:\s*16px/ },
      { name: '모바일 스크롤 최적화', pattern: /-webkit-overflow-scrolling/ },
    ];
    
    checks.forEach(check => {
      if (check.pattern.test(content)) {
        console.log(`  ✅ ${check.name}`);
        results.passed++;
      } else {
        console.log(`  ⚠️  ${check.name} - 확인 필요`);
        results.warnings++;
      }
    });
  } else {
    console.log('  ❌ mobile.css 파일 없음');
    results.failed++;
  }
  
  // index.html viewport 확인
  const indexHtmlPath = join(rootDir, 'index.html');
  if (existsSync(indexHtmlPath)) {
    const content = readFileSync(indexHtmlPath, 'utf-8');
    if (content.includes('viewport-fit=cover')) {
      console.log('  ✅ iPhone notch 대응 (viewport-fit=cover)');
      results.passed++;
    } else {
      console.log('  ⚠️  viewport-fit=cover 없음');
      results.warnings++;
    }
  }
}

// ============================================================
// 2️⃣ PWA 점검
// ============================================================

function checkPWA() {
  console.log('\n📱 2️⃣ PWA 점검\n');
  
  // manifest.json 확인
  const manifestPath = join(rootDir, 'public', 'manifest.json');
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      
      const checks = [
        { name: 'manifest.json 정상 로드됨', value: manifest.name },
        { name: 'short_name 설정됨', value: manifest.short_name },
        { name: 'display: standalone', value: manifest.display === 'standalone' },
        { name: 'theme_color 설정됨', value: manifest.theme_color },
        { name: 'icons 배열 존재', value: Array.isArray(manifest.icons) && manifest.icons.length > 0 },
      ];
      
      checks.forEach(check => {
        if (check.value) {
          console.log(`  ✅ ${check.name}`);
          results.passed++;
        } else {
          console.log(`  ❌ ${check.name}`);
          results.failed++;
        }
      });
      
      // 아이콘 파일 확인 (없어도 경고로 처리 - 배포는 가능)
      if (manifest.icons && manifest.icons.length > 0) {
        let missingIcons = [];
        manifest.icons.forEach(icon => {
          const iconPath = join(rootDir, 'public', icon.src.replace(/^\//, ''));
          if (existsSync(iconPath)) {
            console.log(`  ✅ 아이콘 파일 존재: ${icon.src}`);
            results.passed++;
          } else {
            missingIcons.push(icon.src);
            console.log(`  ⚠️  아이콘 파일 없음: ${icon.src} (경고 - 배포는 가능하지만 PWA 설치 배너가 제대로 표시되지 않을 수 있음)`);
            results.warnings++;
          }
        });
        
        if (missingIcons.length > 0) {
          console.log(`\n  💡 아이콘 생성 가이드:`);
          console.log(`     - public/icons/ 폴더 생성 필요`);
          console.log(`     - 192x192, 512x512 PNG 파일 준비`);
          console.log(`     - 또는 기존 SVG를 PNG로 변환`);
          console.log(`     - 참고: scripts/create-pwa-icons.js (있는 경우)`);
        }
      }
    } catch (err) {
      console.log(`  ❌ manifest.json 파싱 실패: ${err.message}`);
      results.failed++;
    }
  } else {
    console.log('  ❌ manifest.json 파일 없음');
    results.failed++;
  }
  
  // index.html PWA 메타 태그 확인
  const indexHtmlPath = join(rootDir, 'index.html');
  if (existsSync(indexHtmlPath)) {
    const content = readFileSync(indexHtmlPath, 'utf-8');
    const pwaChecks = [
      { name: 'manifest 링크', pattern: /<link\s+rel=["']manifest["']/ },
      { name: 'apple-touch-icon', pattern: /<link\s+rel=["']apple-touch-icon["']/ },
      { name: 'apple-mobile-web-app-capable', pattern: /apple-mobile-web-app-capable/ },
      { name: 'theme-color 메타', pattern: /<meta\s+name=["']theme-color["']/ },
    ];
    
    pwaChecks.forEach(check => {
      if (check.pattern.test(content)) {
        console.log(`  ✅ ${check.name}`);
        results.passed++;
      } else {
        console.log(`  ⚠️  ${check.name} - 확인 필요`);
        results.warnings++;
      }
    });
  }
  
  // 스플래시 화면 확인
  const indexHtmlPath2 = join(rootDir, 'index.html');
  if (existsSync(indexHtmlPath2)) {
    const content = readFileSync(indexHtmlPath2, 'utf-8');
    if (content.includes('app-splash')) {
      console.log('  ✅ 스플래시 화면 DOM 존재');
      results.passed++;
    } else {
      console.log('  ⚠️  스플래시 화면 DOM 없음');
      results.warnings++;
    }
  }
  
  const mobileCssPath = join(rootDir, 'src', 'styles', 'mobile.css');
  if (existsSync(mobileCssPath)) {
    const content = readFileSync(mobileCssPath, 'utf-8');
    if (content.includes('#app-splash')) {
      console.log('  ✅ 스플래시 화면 CSS 존재');
      results.passed++;
    } else {
      console.log('  ⚠️  스플래시 화면 CSS 없음');
      results.warnings++;
    }
  }
}

// ============================================================
// 3️⃣ 라우팅 점검
// ============================================================

function checkRouting() {
  console.log('\n🛣️  3️⃣ 라우팅 점검\n');
  
  // App.tsx 라우팅 확인
  const appTsxPath = join(rootDir, 'src', 'App.tsx');
  if (existsSync(appTsxPath)) {
    const content = readFileSync(appTsxPath, 'utf-8');
    
    const routingChecks = [
      { name: 'ActivityRouter 존재', pattern: /ActivityRouter/ },
      { name: 'MarketDetailRouter 존재', pattern: /MarketDetailRouter/ },
      { name: 'ChatPage 라우트', pattern: /\/chat\/:chatRoomId/ },
      { name: 'Trade 도메인 라우트', pattern: /\/trade/ },
    ];
    
    routingChecks.forEach(check => {
      if (check.pattern.test(content)) {
        console.log(`  ✅ ${check.name}`);
        results.passed++;
      } else {
        console.log(`  ⚠️  ${check.name} - 확인 필요`);
        results.warnings++;
      }
    });
  }
  
  // 수동 확인 항목
  console.log('  📋 수동 확인 필요:');
  console.log('    - 회원모집 → RecruitDetail 이동');
  console.log('    - 상품 → ProductDetail 이동');
  console.log('    - 채팅하기 → 채팅방 생성');
  console.log('    - 하단 네비 active 상태');
  results.manual.push('라우팅 수동 테스트');
}

// ============================================================
// 4️⃣ 서버 & 데이터 점검
// ============================================================

function checkServer() {
  console.log('\n🔒 4️⃣ 서버 & 데이터 점검\n');
  
  // firestore.rules 확인
  const rulesPath = join(rootDir, 'firestore.rules');
  if (existsSync(rulesPath)) {
    const content = readFileSync(rulesPath, 'utf-8');
    if (content.length > 50) {
      console.log('  ✅ firestore.rules 파일 존재');
      results.passed++;
    } else {
      console.log('  ⚠️  firestore.rules 파일이 비어있거나 너무 짧음');
      results.warnings++;
    }
  } else {
    console.log('  ❌ firestore.rules 파일 없음');
    results.failed++;
  }
  
  // storage.rules 확인
  const storageRulesPath = join(rootDir, 'storage.rules');
  if (existsSync(storageRulesPath)) {
    console.log('  ✅ storage.rules 파일 존재');
    results.passed++;
  } else {
    console.log('  ⚠️  storage.rules 파일 없음');
    results.warnings++;
  }
  
  // 수동 확인 항목
  console.log('  📋 수동 확인 필요:');
  console.log('    - 비로그인 접근 차단');
  console.log('    - 사용자별 데이터 분리');
  console.log('    - 채팅 읽음 처리');
  console.log('    - 중복 채팅방 생성 방지');
  results.manual.push('서버 규칙 수동 테스트');
}

// ============================================================
// 5️⃣ 성능 점검
// ============================================================

function checkPerformance() {
  console.log('\n⚡ 5️⃣ 성능 점검\n');
  
  // dist 폴더 확인 (빌드 여부)
  const distPath = join(rootDir, 'dist');
  if (existsSync(distPath)) {
    console.log('  ✅ dist 폴더 존재 (빌드 완료)');
    results.passed++;
    
    // index.html 확인
    const distIndexPath = join(distPath, 'index.html');
    if (existsSync(distIndexPath)) {
      const content = readFileSync(distIndexPath, 'utf-8');
      if (content.includes('root')) {
        console.log('  ✅ dist/index.html 정상');
        results.passed++;
      }
    }
  } else {
    console.log('  ⚠️  dist 폴더 없음 (빌드 필요: npm run build)');
    results.warnings++;
  }
  
  // 수동 확인 항목
  console.log('  📋 수동 확인 필요:');
  console.log('    - 첫 로딩 3초 이하');
  console.log('    - 이미지 lazy load');
  console.log('    - 콘솔 에러 없음');
  results.manual.push('성능 수동 테스트');
}

// ============================================================
// 6️⃣ 실제 사용자 테스트
// ============================================================

function checkManualTests() {
  console.log('\n👥 6️⃣ 실제 사용자 테스트\n');
  console.log('  📋 반드시 수동 테스트 필요:');
  console.log('    1. 친구 폰 2개로 로그인');
  console.log('    2. 모집글 작성');
  console.log('    3. 참여 신청');
  console.log('    4. 채팅 열기');
  console.log('    5. 알림 확인');
  results.manual.push('실제 사용자 테스트');
}

// ============================================================
// 메인 실행
// ============================================================

function main() {
  console.log('🚀 YAGO VIBE 배포 전 최종 체크리스트\n');
  console.log('=' .repeat(50));
  
  checkMobileUI();
  checkPWA();
  checkRouting();
  checkServer();
  checkPerformance();
  checkManualTests();
  
  // 결과 요약
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 검증 결과 요약\n');
  console.log(`  ✅ 통과: ${results.passed}개`);
  console.log(`  ❌ 실패: ${results.failed}개`);
  console.log(`  ⚠️  경고: ${results.warnings}개`);
  console.log(`  📋 수동 확인: ${results.manual.length}개 항목\n`);
  
  if (results.failed > 0) {
    console.log('❌ 배포 전 필수 항목 실패가 있습니다. 수정 후 다시 실행하세요.\n');
    process.exit(1);
  } else if (results.warnings > 0) {
    console.log('⚠️  경고 항목이 있습니다. 확인 후 배포하세요.\n');
    process.exit(0);
  } else {
    console.log('✅ 모든 자동 검증 통과! 수동 테스트 완료 후 배포하세요.\n');
    process.exit(0);
  }
}

main();
