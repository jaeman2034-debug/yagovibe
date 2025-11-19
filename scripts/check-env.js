#!/usr/bin/env node
/**
 * 🔍 YAGO VIBE 환경 변수 누락 검사기
 * 
 * 사용법:
 *   node scripts/check-env.js
 * 
 * 또는 npm 스크립트:
 *   npm run check:env
 */

const fs = require("fs");
const path = require("path");

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

// 선택적 환경 변수 목록
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
  const ENV_PATHS = [
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), ".env.production"),
  ];

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
  const varMap = new Map();

  for (let line of lines) {
    line = line.trim();

    if (!line || line.startsWith("#")) continue;

    const equalIndex = line.indexOf("=");
    if (equalIndex === -1) continue;

    const key = line.substring(0, equalIndex).trim();
    let value = line.substring(equalIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && value) {
      varMap.set(key, value);
    }
  }

  return varMap;
}

// 메인 함수
function main() {
  console.log("🔍 YAGO VIBE 환경 변수 누락 검사기\n");

  const envPath = findEnvFile();
  if (!envPath) {
    console.error("❌ .env 파일을 찾을 수 없습니다.");
    console.error("   다음 위치를 확인하세요:");
    console.error("   - .env.local");
    console.error("   - .env");
    console.error("   - .env.production\n");
    process.exit(1);
  }

  console.log(`✅ .env 파일 발견: ${envPath}\n`);

  const varMap = parseEnvFile(envPath);

  console.log("🔍 환경 변수 검사 중...\n");

  // 필수 변수 검사
  const missingRequired = [];
  const foundRequired = [];

  for (const requiredVar of REQUIRED_VARS) {
    if (varMap.has(requiredVar)) {
      const value = varMap.get(requiredVar);
      const maskedValue =
        value.length > 10
          ? value.substring(0, 8) + "..." + value.substring(value.length - 4)
          : "***";
      foundRequired.push({ key: requiredVar, value: maskedValue });
    } else {
      missingRequired.push(requiredVar);
    }
  }

  // 선택적 변수 검사
  const missingOptional = [];
  const foundOptional = [];

  for (const optionalVar of OPTIONAL_VARS) {
    if (varMap.has(optionalVar)) {
      const value = varMap.get(optionalVar);
      const maskedValue =
        value.length > 10
          ? value.substring(0, 8) + "..." + value.substring(value.length - 4)
          : "***";
      foundOptional.push({ key: optionalVar, value: maskedValue });
    } else {
      missingOptional.push(optionalVar);
    }
  }

  // 결과 출력
  let hasError = false;

  if (foundRequired.length > 0) {
    console.log("✅ 필수 환경 변수 (OK):\n");
    foundRequired.forEach((v) => {
      console.log(`   ✔ ${v.key.padEnd(30)} = ${v.value}`);
    });
    console.log();
  }

  if (missingRequired.length > 0) {
    console.error("❌ 필수 환경 변수 누락:\n");
    missingRequired.forEach((v) => {
      console.error(`   ❌ ${v}`);
    });
    console.error();
    hasError = true;
  }

  if (foundOptional.length > 0) {
    console.log("ℹ️  선택적 환경 변수 (설정됨):\n");
    foundOptional.forEach((v) => {
      console.log(`   ✔ ${v.key.padEnd(30)} = ${v.value}`);
    });
    console.log();
  }

  if (missingOptional.length > 0) {
    console.log("⚠️  선택적 환경 변수 (미설정):\n");
    missingOptional.forEach((v) => {
      console.log(`   ⚠️  ${v}`);
    });
    console.log();
  }

  // 최종 결과
  console.log("─".repeat(60));
  if (hasError) {
    console.error("\n❌ 환경 변수 검사 실패!");
    console.error("   필수 환경 변수를 추가한 후 다시 실행하세요.\n");
    process.exit(1);
  } else {
    console.log("\n✅ 환경 변수 검사 통과!");
    console.log("   모든 필수 환경 변수가 설정되어 있습니다.\n");
  }
}

// 실행
main();

