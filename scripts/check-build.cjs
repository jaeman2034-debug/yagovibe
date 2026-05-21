#!/usr/bin/env node
/**
 * 🔧 YAGO VIBE Vercel 빌드 오류 방지 체크리스트
 *
 * 사용법:
 *   node scripts/check-build.cjs
 *
 * 또는 npm 스크립트:
 *   npm run check:build
 */

const fs = require("fs");
const path = require("path");

// 체크 항목
const CHECKS = [
  {
    name: "환경 변수 파일 확인",
    check: () => {
      const envPaths = [".env.local", ".env", ".env.production"];
      const found = envPaths.filter((p) => fs.existsSync(path.join(process.cwd(), p)));
      return {
        pass: found.length > 0,
        message: found.length > 0
          ? `✅ .env 파일 발견: ${found.join(", ")}`
          : "❌ .env 파일을 찾을 수 없습니다",
      };
    },
  },
  {
    name: "필수 환경 변수 확인",
    check: () => {
      const requiredVars = [
        "VITE_FIREBASE_API_KEY",
        "VITE_FIREBASE_AUTH_DOMAIN",
        "VITE_FIREBASE_PROJECT_ID",
        "VITE_FIREBASE_STORAGE_BUCKET",
        "VITE_FIREBASE_MESSAGING_SENDER_ID",
        "VITE_FIREBASE_APP_ID",
        "VITE_FUNCTIONS_ORIGIN",
      ];

      const envPaths = [".env.local", ".env", ".env.production"].filter((p) =>
        fs.existsSync(path.join(process.cwd(), p))
      );

      if (envPaths.length === 0) {
        return { pass: false, message: "❌ .env 파일 없음" };
      }

      const combined = envPaths.map((p) => fs.readFileSync(p, "utf-8")).join("\n");
      const missing = requiredVars.filter((v) => !combined.includes(`${v}=`));

      return {
        pass: missing.length === 0,
        message: missing.length === 0
          ? `✅ 모든 필수 환경 변수 설정됨 (${requiredVars.length}개, ${envPaths.join(", ")})`
          : `❌ 누락된 변수: ${missing.join(", ")}`,
      };
    },
  },
  {
    name: "Vite 설정 확인",
    check: () => {
      const viteConfigPath = path.join(process.cwd(), "vite.config.ts");
      if (!fs.existsSync(viteConfigPath)) {
        return { pass: false, message: "❌ vite.config.ts 파일 없음" };
      }

      const content = fs.readFileSync(viteConfigPath, "utf-8");
      const hasAlias = content.includes("resolve") && content.includes("alias");
      const hasPlugin = content.includes("@vitejs/plugin-react") || content.includes("react()");

      return {
        pass: hasAlias && hasPlugin,
        message: hasAlias && hasPlugin
          ? "✅ Vite 설정 정상"
          : `❌ Vite 설정 확인 필요 (alias: ${hasAlias}, plugin: ${hasPlugin})`,
      };
    },
  },
  {
    name: "TypeScript 설정 확인",
    check: () => {
      const candidates = ["tsconfig.app.json", "tsconfig.json"];
      let hasPaths = false;
      for (const name of candidates) {
        const tsConfigPath = path.join(process.cwd(), name);
        if (!fs.existsSync(tsConfigPath)) continue;
        const content = fs.readFileSync(tsConfigPath, "utf-8");
        if (content.includes('"@/*"') || content.includes('"paths"')) {
          hasPaths = true;
          break;
        }
      }

      return {
        pass: hasPaths,
        message: hasPaths
          ? "✅ TypeScript 경로 alias 설정됨 (tsconfig.app.json 또는 tsconfig.json)"
          : "❌ TypeScript 경로 alias 확인 필요",
      };
    },
  },
  {
    name: "vercel.json 확인",
    check: () => {
      const vercelJsonPath = path.join(process.cwd(), "vercel.json");
      if (!fs.existsSync(vercelJsonPath)) {
        return { pass: false, message: "❌ vercel.json 파일 없음" };
      }

      const content = fs.readFileSync(vercelJsonPath, "utf-8");
      const hasBuild = content.includes("buildCommand");
      const hasOutput = content.includes("outputDirectory");

      return {
        pass: hasBuild && hasOutput,
        message: hasBuild && hasOutput
          ? "✅ vercel.json 설정 정상"
          : "❌ vercel.json 빌드 설정 확인 필요",
      };
    },
  },
  {
    name: "package.json 빌드 스크립트 확인",
    check: () => {
      const packageJsonPath = path.join(process.cwd(), "package.json");
      if (!fs.existsSync(packageJsonPath)) {
        return { pass: false, message: "❌ package.json 파일 없음" };
      }

      const content = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      const hasBuild = content.scripts && content.scripts.build;

      return {
        pass: hasBuild,
        message: hasBuild
          ? `✅ 빌드 스크립트: ${content.scripts.build}`
          : "❌ package.json에 build 스크립트 없음",
      };
    },
  },
  {
    name: "환경 변수 VITE_ 접두사 확인",
    check: () => {
      const envPath =
        fs.existsSync(".env.local") ? ".env.local" :
        fs.existsSync(".env") ? ".env" :
        fs.existsSync(".env.production") ? ".env.production" : null;

      if (!envPath) {
        return { pass: false, message: "❌ .env 파일 없음" };
      }

      const raw = fs.readFileSync(envPath, "utf-8");
      const lines = raw.split("\n");
      const invalidVars = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const equalIndex = trimmed.indexOf("=");
        if (equalIndex === -1) continue;

        const key = trimmed.substring(0, equalIndex).trim();
        const value = trimmed.substring(equalIndex + 1).trim();

        // Vite에서 읽을 변수인데 VITE_ 접두사가 없는 경우
        if (key && value && !key.startsWith("VITE_") && key !== "NODE_ENV") {
          // Firebase, Functions 관련 변수는 VITE_ 접두사 필요
          if (
            key.includes("FIREBASE") ||
            key.includes("FUNCTIONS") ||
            key.includes("KAKAO") ||
            key.includes("SENTRY") ||
            key.includes("GA") ||
            key.includes("APP_VERSION")
          ) {
            invalidVars.push(key);
          }
        }
      }

      return {
        pass: invalidVars.length === 0,
        message: invalidVars.length === 0
          ? "✅ 모든 환경 변수에 VITE_ 접두사 정상"
          : `❌ VITE_ 접두사 필요: ${invalidVars.join(", ")}`,
      };
    },
  },
  {
    name: ".gitignore 환경 변수 제외 확인",
    check: () => {
      const gitignorePath = path.join(process.cwd(), ".gitignore");
      if (!fs.existsSync(gitignorePath)) {
        return { pass: false, message: "❌ .gitignore 파일 없음" };
      }

      const content = fs.readFileSync(gitignorePath, "utf-8");
      const hasEnv = content.includes(".env") || content.includes(".env.local");

      return {
        pass: hasEnv,
        message: hasEnv
          ? "✅ .env 파일이 .gitignore에 포함됨"
          : "❌ .env 파일을 .gitignore에 추가하세요",
      };
    },
  },
];

// 메인 함수
function main() {
  console.log("🔧 YAGO VIBE Vercel 빌드 오류 방지 체크리스트\n");
  console.log("=".repeat(60));
  console.log();

  const results = [];

  for (const check of CHECKS) {
    const result = check.check();
    results.push({ name: check.name, ...result });

    console.log(`${check.name}:`);
    console.log(`  ${result.message}\n`);
  }

  // 결과 요약
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;

  console.log("=".repeat(60));
  console.log();
  console.log(`📊 검사 결과: ${passed}개 통과, ${failed}개 실패`);
  console.log();

  if (failed === 0) {
    console.log("✅ 모든 검사를 통과했습니다!");
    console.log("   Vercel 배포 준비 완료! 🎉\n");
    process.exit(0);
  } else {
    console.error("❌ 일부 검사를 통과하지 못했습니다.");
    console.error("   위 항목들을 수정한 후 다시 실행하세요.\n");
    process.exit(1);
  }
}

// 실행
main();
