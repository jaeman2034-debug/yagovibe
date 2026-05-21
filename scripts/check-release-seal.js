// scripts/check-release-seal.js
// 🔥 Phase 5: 출시 전 봉인 체크리스트 자동 점검

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT_DIR = process.cwd();
const SRC_DIR = join(ROOT_DIR, "src");

// 체크리스트 결과
const checks = {
  desktopGuards: { passed: 0, total: 0, details: [] },
  authRouting: { passed: 0, total: 0, details: [] },
  devProdSeparation: { passed: 0, total: 0, details: [] },
  security: { passed: 0, total: 0, details: [] },
  performance: { passed: 0, total: 0, details: [] },
};

// 5-1: Desktop 가드 확인
function checkDesktopGuards() {
  console.log("\n🔒 5-1: Desktop 가드 확인");
  
  const files = [
    "src/speech/SpeechManager.ts",
    "src/components/VoiceMicButton.tsx",
    "src/voice/speechEngine.ts",
  ];

  files.forEach((file) => {
    const path = join(ROOT_DIR, file);
    if (!existsSync(path)) {
      checks.desktopGuards.details.push(`❌ ${file} 없음`);
      checks.desktopGuards.total++;
      return;
    }

    const content = readFileSync(path, "utf-8");
    const hasGuard = /isMobileDevice\(\)/.test(content) || /!isMobileDevice\(\)/.test(content);
    
    checks.desktopGuards.total++;
    if (hasGuard) {
      checks.desktopGuards.passed++;
      checks.desktopGuards.details.push(`✅ ${file}: Desktop 가드 존재`);
    } else {
      checks.desktopGuards.details.push(`❌ ${file}: Desktop 가드 없음`);
    }
  });
}

// 5-2: Auth/Routing 금지 패턴 확인
function checkAuthRouting() {
  console.log("\n🔒 5-2: Auth/Routing 봉인 확인");
  
  const files = [
    "src/App.tsx",
    "src/components/ProtectedRoute.tsx",
    "src/components/PublicRoute.tsx",
  ];

  files.forEach((file) => {
    const path = join(ROOT_DIR, file);
    if (!existsSync(path)) {
      checks.authRouting.details.push(`❌ ${file} 없음`);
      checks.authRouting.total++;
      return;
    }

    const content = readFileSync(path, "utf-8");
    
    // ❌ 금지 패턴: if (loading) return <Loading /> (주석 제외)
    // ✅ 허용 패턴: if (loading) return null;
    const lines = content.split("\n");
    let hasForbiddenPattern = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      // 주석 제외
      if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
        continue;
      }
      // 금지 패턴: if (loading) return <Loading /> 또는 <LoadingSpinner />
      if (/if\s*\([^)]*loading[^)]*\)\s*return\s*<[^>]*(Loading|LoadingSpinner)/i.test(trimmed)) {
        hasForbiddenPattern = true;
        break;
      }
    }
    
    checks.authRouting.total++;
    if (!hasForbiddenPattern) {
      checks.authRouting.passed++;
      checks.authRouting.details.push(`✅ ${file}: 금지 패턴 없음`);
    } else {
      checks.authRouting.details.push(`❌ ${file}: 금지 패턴 발견 (if (loading) return <Loading />)`);
    }
  });
}

// 5-3: DEV/PROD 분리 확인
function checkDevProdSeparation() {
  console.log("\n🔒 5-3: DEV/PROD 분리 확인");
  
  // Eruda 체크
  const indexHtmlPath = join(ROOT_DIR, "index.html");
  if (existsSync(indexHtmlPath)) {
    const content = readFileSync(indexHtmlPath, "utf-8");
    // Eruda가 조건부 로드되는지 확인 (isDev, localhost 체크 등)
    const hasErudaGuard = 
      /isDev|localhost|127\.0\.0\.1/.test(content) && 
      /eruda.*init|Eruda.*enabled/i.test(content);
    const hasUnconditionalEruda = /eruda.*init/i.test(content) && !hasErudaGuard;
    
    checks.devProdSeparation.total++;
    if (hasErudaGuard && !hasUnconditionalEruda) {
      checks.devProdSeparation.passed++;
      checks.devProdSeparation.details.push(`✅ index.html: Eruda 조건부 로드 (DEV만)`);
    } else if (hasUnconditionalEruda) {
      checks.devProdSeparation.details.push(`❌ index.html: Eruda 무조건 로드 (PROD에서도 실행됨)`);
    } else {
      checks.devProdSeparation.details.push(`⚠️ index.html: Eruda 가드 확인 필요`);
    }
  }

  // telemetry.ts 원문 로그 체크
  const telemetryPath = join(ROOT_DIR, "src/speech/telemetry.ts");
  if (existsSync(telemetryPath)) {
    const content = readFileSync(telemetryPath, "utf-8");
    const hasDevGuard = /import\.meta\.env\.DEV/.test(content);
    const hasTranscriptInProd = /console\.(warn|log).*transcript.*PROD/i.test(content);
    
    checks.devProdSeparation.total++;
    if (hasDevGuard && !hasTranscriptInProd) {
      checks.devProdSeparation.passed++;
      checks.devProdSeparation.details.push(`✅ telemetry.ts: DEV/PROD 분리 OK`);
    } else {
      checks.devProdSeparation.details.push(`❌ telemetry.ts: PROD에서 transcript 로그 가능성`);
    }
  }
}

// 5-4: 보안 확인
function checkSecurity() {
  console.log("\n🔒 5-4: 보안 & 개인정보 확인");
  
  // Firestore rules 확인
  const rulesPath = join(ROOT_DIR, "firestore.rules");
  if (existsSync(rulesPath)) {
    const content = readFileSync(rulesPath, "utf-8");
    const hasVoiceTelemetry = /voice_telemetry/.test(content);
    const hasCreateOnly = /allow create: if true/.test(content) && /allow read.*if false/.test(content);
    
    checks.security.total++;
    if (hasVoiceTelemetry && hasCreateOnly) {
      checks.security.passed++;
      checks.security.details.push(`✅ firestore.rules: voice_telemetry 쓰기만 허용`);
    } else {
      checks.security.details.push(`❌ firestore.rules: voice_telemetry 규칙 확인 필요`);
    }
  }

  // telemetry.ts 원문 저장 체크
  const telemetryPath = join(ROOT_DIR, "src/speech/telemetry.ts");
  if (existsSync(telemetryPath)) {
    const content = readFileSync(telemetryPath, "utf-8");
    const hasTranscriptSave = /transcript.*addDoc|addDoc.*transcript/i.test(content);
    
    checks.security.total++;
    if (!hasTranscriptSave) {
      checks.security.passed++;
      checks.security.details.push(`✅ telemetry.ts: 원문 transcript 저장 없음`);
    } else {
      checks.security.details.push(`❌ telemetry.ts: 원문 transcript 저장 가능성`);
    }
  }
}

// 결과 출력
function printResults() {
  console.log("\n" + "=".repeat(80));
  console.log("🛡 Phase 5 — RELEASE SEAL CHECKLIST 결과");
  console.log("=".repeat(80));

  const sections = [
    { name: "5-1: Desktop 가드", data: checks.desktopGuards },
    { name: "5-2: Auth/Routing", data: checks.authRouting },
    { name: "5-3: DEV/PROD 분리", data: checks.devProdSeparation },
    { name: "5-4: 보안", data: checks.security },
  ];

  let totalPassed = 0;
  let totalChecks = 0;

  sections.forEach((section) => {
    const { passed, total, details } = section.data;
    totalPassed += passed;
    totalChecks += total;

    console.log(`\n${section.name}: ${passed}/${total} 통과`);
    details.forEach((detail) => console.log(`  ${detail}`));
  });

  console.log("\n" + "=".repeat(80));
  console.log(`전체: ${totalPassed}/${totalChecks} 통과`);
  
  if (totalPassed === totalChecks) {
    console.log("✅ Phase 5 통과! 출시 가능합니다.");
    process.exit(0);
  } else {
    console.log("❌ Phase 5 미통과. 위 항목을 수정하세요.");
    process.exit(1);
  }
}

// 실행
console.log("🛡 Phase 5 — RELEASE SEAL CHECKLIST 자동 점검 시작");
checkDesktopGuards();
checkAuthRouting();
checkDevProdSeparation();
checkSecurity();
printResults();

