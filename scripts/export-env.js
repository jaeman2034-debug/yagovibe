#!/usr/bin/env node
/**
 * 🚀 YAGO VIBE 환경 변수 자동 변환 스크립트
 * 
 * 사용법:
 *   node scripts/export-env.js
 * 
 * 또는 npm 스크립트:
 *   npm run export:env
 */

const fs = require("fs");
const path = require("path");

// .env 파일 경로 (여러 위치 확인)
const ENV_PATHS = [
  path.join(process.cwd(), ".env.local"),
  path.join(process.cwd(), ".env"),
  path.join(process.cwd(), ".env.production"),
];

// 필수 환경 변수 목록
const REQUIRED_VARS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FUNCTIONS_ORIGIN",
];

// 선택적 환경 변수 목록 (경고만 표시)
const OPTIONAL_VARS = [
  "VITE_KAKAO_MAP_KEY",
  "VITE_FIREBASE_VAPID_KEY",
  "VITE_SENTRY_DSN",
  "VITE_APP_VERSION",
  "VITE_GA_ID",
  "NODE_ENV",
];

// .env 파일 찾기
function findEnvFile() {
  for (const envPath of ENV_PATHS) {
    if (fs.existsSync(envPath)) {
      return envPath;
    }
  }
  return null;
}

// 환경 변수 파싱
function parseEnvFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split("\n");
  const vars = [];

  for (let line of lines) {
    line = line.trim();

    // 주석이나 빈 줄 스킵
    if (!line || line.startsWith("#")) continue;

    // 환경 변수 파싱
    const equalIndex = line.indexOf("=");
    if (equalIndex === -1) continue;

    const key = line.substring(0, equalIndex).trim();
    let value = line.substring(equalIndex + 1).trim();

    // 따옴표 제거
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // 빈 값이 아닌 경우만 추가
    if (key && value) {
      vars.push({ key, value });
    }
  }

  return vars;
}

// 환경 변수 검사
function validateEnvVars(vars) {
  const varMap = new Map();
  vars.forEach((v) => varMap.set(v.key, v.value));

  const missing = [];
  const warnings = [];

  // 필수 변수 검사
  for (const requiredVar of REQUIRED_VARS) {
    if (!varMap.has(requiredVar)) {
      missing.push(requiredVar);
    }
  }

  // 선택적 변수 검사 (경고만)
  for (const optionalVar of OPTIONAL_VARS) {
    if (!varMap.has(optionalVar)) {
      warnings.push(optionalVar);
    }
  }

  // NODE_ENV 확인 (없으면 자동 추가)
  if (!varMap.has("NODE_ENV")) {
    warnings.push("NODE_ENV (자동으로 production 추가됨)");
  }

  return { missing, warnings, varMap };
}

// 메인 함수
function main() {
  console.log("🚀 YAGO VIBE 환경 변수 자동 변환 스크립트\n");

  // .env 파일 찾기
  const envPath = findEnvFile();
  if (!envPath) {
    console.error("❌ .env 파일을 찾을 수 없습니다.");
    console.error("   다음 위치를 확인하세요:");
    ENV_PATHS.forEach((p) => console.error(`   - ${p}`));
    process.exit(1);
  }

  console.log(`✅ .env 파일 발견: ${envPath}\n`);
  console.log("🔍 환경 변수 분석 중...\n");

  // 환경 변수 파싱
  const vars = parseEnvFile(envPath);
  if (vars.length === 0) {
    console.error("❌ 환경 변수를 찾을 수 없습니다.");
    process.exit(1);
  }

  // 환경 변수 검사
  const { missing, warnings, varMap } = validateEnvVars(vars);

  // 누락된 필수 변수 표시
  if (missing.length > 0) {
    console.error("❌ 필수 환경 변수가 누락되었습니다:\n");
    missing.forEach((v) => console.error(`   ❌ ${v}`));
    console.error("\n⚠️  위 변수들을 추가한 후 다시 실행하세요.\n");
    process.exit(1);
  }

  // 경고 표시
  if (warnings.length > 0) {
    console.log("⚠️  선택적 환경 변수 (경고):\n");
    warnings.forEach((v) => console.log(`   ⚠️  ${v}`));
    console.log();
  }

  // 성공 메시지
  console.log("✅ 환경 변수 검사 완료!\n");
  console.log("🎉 변환 완료! 아래 내용을 'Vercel → Settings → Environment Variables'에 복사하세요:\n");
  console.log("─".repeat(60));

  // Vercel 환경 변수 포맷으로 출력
  vars.forEach((v) => {
    console.log(`${v.key}=${v.value}`);
  });

  // NODE_ENV가 없으면 자동 추가
  if (!varMap.has("NODE_ENV")) {
    console.log("NODE_ENV=production");
  }

  console.log("─".repeat(60));
  console.log();

  // 참고사항
  console.log("📋 참고사항:");
  console.log("   1. Vercel Dashboard → Project Settings → Environment Variables");
  console.log("   2. 위 내용을 'Key'와 'Value'로 나누어 추가하세요");
  console.log("   3. 'Production', 'Preview', 'Development' 모두 선택하는 것을 권장합니다");
  console.log("   4. Vite는 반드시 'VITE_' 접두사가 있어야 프론트에서 읽을 수 있습니다");
  console.log("   5. 환경 변수 추가 후 'Redeploy' 버튼을 클릭하세요\n");

  console.log("✨ 완료! 이제 Vercel에 환경 변수를 추가하세요.\n");
}

// 실행
main();

