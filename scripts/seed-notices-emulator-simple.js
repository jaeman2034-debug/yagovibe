/**
 * 🔥 Firestore Emulator 공지 더미 데이터 시드 스크립트 (간단 버전)
 * 
 * 사용법:
 *   node scripts/seed-notices-emulator-simple.js <associationId>
 * 
 * 예시:
 *   node scripts/seed-notices-emulator-simple.js assoc-nowon-football
 */

const admin = require("firebase-admin");

// 🔥 Emulator 연결 설정
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8084";

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "demo-test",
  });
}

const db = admin.firestore();

// 🔥 더미 공지 데이터
const DUMMY_NOTICES = [
  {
    title: "2025년 봄 시즌 대회 안내",
    content: `# 2025년 봄 시즌 대회 안내

안녕하세요. 협회 운영진입니다.

2025년 봄 시즌 대회 일정을 안내드립니다.

## 대회 일정
- 신청 기간: 2025년 3월 1일 ~ 3월 15일
- 조 추첨: 2025년 3월 20일
- 대회 기간: 2025년 4월 1일 ~ 4월 30일

## 참가비
- 기본 참가비: 50,000원
- 추가 팀당: 10,000원

많은 참여 부탁드립니다.`,
    isPinned: true,
    level: "high",
  },
  {
    title: "경기장 이용 안내",
    content: `# 경기장 이용 안내

경기장 이용 시 다음 사항을 준수해주세요.

1. 경기 시작 30분 전 도착
2. 복장 규정 준수
3. 경기 후 정리 정돈

감사합니다.`,
    isPinned: false,
    level: "normal",
  },
  {
    title: "회원 등록 절차 안내",
    content: `# 회원 등록 절차 안내

신규 회원 등록 절차를 안내드립니다.

## 등록 절차
1. 온라인 신청서 작성
2. 서류 제출
3. 승인 대기
4. 등록 완료

문의사항은 협회 사무국으로 연락주세요.`,
    isPinned: false,
    level: "normal",
  },
  {
    title: "2025년 상반기 일정표",
    content: `# 2025년 상반기 일정표

## 주요 일정
- 3월: 봄 시즌 대회
- 5월: 중간 평가전
- 6월: 하계 대회

자세한 일정은 추후 공지하겠습니다.`,
    isPinned: false,
    level: "normal",
  },
];

async function seedNotices(associationId) {
  console.log(`🔥 [시드 스크립트] 공지 더미 데이터 생성 시작`);
  console.log(`   Association ID: ${associationId}`);
  console.log(`   Emulator: localhost:8084`);

  const now = admin.firestore.Timestamp.now();
  const noticesRef = db.collection(`associations/${associationId}/notices`);

  console.log(`\n📝 공지 생성 중...`);

  for (let i = 0; i < DUMMY_NOTICES.length; i++) {
    const notice = DUMMY_NOTICES[i];
    const noticeId = `notice-${i + 1}`;
    
    const noticeData = {
      title: notice.title,
      content: notice.content,
      summary: notice.content.substring(0, 100) + "...",
      status: "published", // 🔥 필수: published 상태
      isPinned: notice.isPinned,
      level: notice.level,
      isOfficial: true, // 🔥 필수: isOfficial true
      visibility: "public",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      viewCount: 0,
      clickCount: 0,
    };

    try {
      await noticesRef.doc(noticeId).set(noticeData);
      console.log(`   ✅ ${i + 1}. ${notice.title} (${notice.isPinned ? "고정" : "일반"})`);
    } catch (error) {
      console.error(`   ❌ ${i + 1}. ${notice.title} 생성 실패:`, error.message);
    }
  }

  console.log(`\n✅ 공지 더미 데이터 생성 완료!`);
  console.log(`   총 ${DUMMY_NOTICES.length}개 공지 생성됨`);
  console.log(`\n📌 다음 단계:`);
  console.log(`   1. Firestore Emulator UI에서 확인: http://localhost:4001`);
  console.log(`   2. 프론트엔드에서 공지 섹션 확인`);
  console.log(`   3. 브라우저 새로고침 (실시간 업데이트)`);
}

// 🔥 실행
const associationId = process.argv[2];

if (!associationId) {
  console.error("❌ Association ID가 필요합니다.");
  console.error("\n📌 Association ID 찾는 방법:");
  console.error("   1. Firestore Emulator UI 접속: http://localhost:4001");
  console.error("   2. 'associations' 컬렉션 확인");
  console.error("   3. 문서 ID를 associationId로 사용");
  console.error("\n사용법:");
  console.error("   node scripts/seed-notices-emulator-simple.js <associationId>");
  console.error("\n예시:");
  console.error("   node scripts/seed-notices-emulator-simple.js assoc-nowon-football");
  process.exit(1);
}

seedNotices(associationId)
  .then(() => {
    console.log("\n🎉 시드 스크립트 완료!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 시드 스크립트 실패:", error);
    process.exit(1);
  });
