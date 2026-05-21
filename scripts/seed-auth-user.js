/**
 * Auth Emulator에 테스트 사용자를 생성하는 스크립트
 * 
 * 실행 방법:
 * 1. Firebase Emulators 실행 중이어야 함: firebase emulators:start
 * 2. node scripts/seed-auth-user.js
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

// Auth Emulator 연결 설정 (포트 9099)
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

// Firebase Admin 초기화 (Emulator)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "yago-vibe-spt",
  });
}

const auth = admin.auth();

// 생성할 사용자 정보
const TEST_USERS = [
  {
    email: "test@test.com",
    password: "test1234",
    displayName: "테스트 사용자",
    uid: "qGq5XmuXRBsRZOqJFEOyqtZY5Hin", // 기존 UID 사용 (권한 데이터와 일치)
  },
];

async function seedAuthUser() {
  try {
    console.log("🔥 Auth Emulator에 사용자 생성 시작...");
    console.log(`   Auth Emulator: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}\n`);

    for (const userData of TEST_USERS) {
      console.log(`\n📌 처리 중: ${userData.email}`);

      try {
        // 기존 사용자 확인
        let user;
        try {
          user = await auth.getUserByEmail(userData.email);
          console.log(`⚠️  사용자가 이미 존재합니다: ${user.uid}`);
          
          // 기존 사용자 삭제 후 재생성 (UID 일치를 위해)
          if (user.uid !== userData.uid) {
            console.log(`⚠️  UID 불일치. 기존 사용자 삭제 후 재생성...`);
            await auth.deleteUser(user.uid);
            user = null;
          } else {
            console.log(`✅ UID 일치. 기존 사용자 유지: ${user.uid}`);
            continue;
          }
        } catch (error) {
          // 사용자가 존재하지 않음 (정상)
          if (error.code === "auth/user-not-found") {
            console.log("✅ 사용자가 존재하지 않습니다. 생성합니다...");
          } else {
            throw error;
          }
        }

        // 새 사용자 생성
        if (!user) {
          user = await auth.createUser({
            uid: userData.uid,
            email: userData.email,
            password: userData.password,
            displayName: userData.displayName,
            emailVerified: true, // 이메일 인증 완료로 설정
          });
          console.log(`✅ 사용자 생성 완료: ${user.uid}`);
        }

        // 사용자 정보 출력
        console.log(`\n📋 생성된 사용자 정보:`);
        console.log(`   UID: ${user.uid}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Display Name: ${user.displayName || "(없음)"}`);
        console.log(`   Email Verified: ${user.emailVerified}`);

      } catch (error) {
        console.error(`❌ ${userData.email} 생성 실패:`, error.message);
        if (error.code) {
          console.error(`   에러 코드: ${error.code}`);
        }
      }
    }

    console.log("\n🎉 Auth Emulator 사용자 생성 완료!");
    console.log("\n다음 단계:");
    console.log("1. 브라우저에서 로그인 페이지 접속: http://localhost:5173/login");
    console.log("2. Email: test@test.com, Password: test1234로 로그인");
    console.log("3. 로그인 성공 후 권한 확인");

  } catch (error) {
    console.error("❌ 오류 발생:", error);
    console.error("\n확인 사항:");
    console.error("1. Auth Emulator가 실행 중인지 확인: firebase emulators:start");
    console.error("2. Emulator 포트가 9099인지 확인: firebase.json의 auth.port 확인");
    console.error("3. FIREBASE_AUTH_EMULATOR_HOST 환경 변수 확인");
    process.exit(1);
  }
}

seedAuthUser().then(() => {
  console.log("\n✅ 스크립트 실행 완료");
  process.exit(0);
});
