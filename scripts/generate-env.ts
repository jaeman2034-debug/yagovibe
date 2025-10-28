/**
 * 🔧 generate-env.ts
 * YAGO VIBE 개발용 환경변수 자동 복원 스크립트
 * 
 * 사용법:
 *   npx tsx scripts/generate-env.ts
 *   또는
 *   npm run generate-env
 */

import { writeFileSync, existsSync } from "fs";
import { resolve } from "path";

const envContent = `
# 🌐 기본 환경 설정
VITE_APP_NAME=YAGO_VIBE
VITE_APP_ENV=development
VITE_APP_URL=https://localhost:5173

# 🔥 Firebase 구성
# ⚠️ 실제 Firebase 프로젝트 설정으로 교체하세요 (Firebase Console에서 확인)
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# 📬 Firebase Cloud Messaging (FCM) 웹 푸시용 VAPID 키
# ✅ 이 값은 실제 VAPID 키입니다 (Firebase Console > Cloud Messaging > Web Push 인증서)
VITE_FIREBASE_VAPID_KEY=BBq4syaG4toS6RjeBlb4SW9sGTDxBsJILjvSiSBHAiFAhspsFHKUcJtzSDsyFp00K65l60YHIyT-BnZIg-BqBlQ

# 🧭 Google Maps / Kakao Maps API (선택)
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_KAKAO_API_KEY=your-kakao-api-key

# 🧠 OpenAI / Voice Assistant 관련
# ⚠️ 실제 OpenAI API 키로 교체하세요 (https://platform.openai.com/api-keys)
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here
VITE_ASSISTANT_VOICE_MODEL=gpt-4o-mini

# 🔗 Slack / n8n Webhook (선택)
VITE_N8N_WEBHOOK_URL=https://n8n.yagovibe.ai/webhook/ai-report

# 🧩 기타 설정
VITE_DEFAULT_LANGUAGE=ko
VITE_DEFAULT_REGION=KR
VITE_DEBUG_MODE=true
`.trim();

const targetPath = resolve(process.cwd(), ".env.local");

try {
    // 기존 파일이 있으면 백업 제안
    if (existsSync(targetPath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupPath = resolve(process.cwd(), `.env.local.backup.${timestamp}`);
        console.log("⚠️  기존 .env.local 파일이 발견되었습니다.");
        console.log(`📦 백업: ${backupPath}`);

        // 백업 생성 (선택사항 - 주석 처리 가능)
        // const { readFileSync } = require("fs");
        // writeFileSync(backupPath, readFileSync(targetPath, "utf8"), "utf8");
    }

    writeFileSync(targetPath, envContent, "utf8");
    console.log("✅ .env.local 파일이 성공적으로 생성되었습니다!");
    console.log("📄 경로:", targetPath);
    console.log("\n📝 다음 단계:");
    console.log("   1. .env.local 파일을 열어서 실제 Firebase 설정 값으로 교체하세요");
    console.log("   2. OpenAI API 키 등 필요한 값들을 입력하세요");
    console.log("   3. 개발 서버 재시작: npm run dev");
} catch (error) {
    console.error("❌ .env.local 생성 중 오류 발생:", error);
    process.exit(1);
}

