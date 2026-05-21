// scripts/seed-emulator-data.js
// 🔥 Firestore Emulator에 최소 테스트 데이터 생성 (Admin SDK 사용)
// 사용법: cd functions && node ../scripts/seed-emulator-data.js

// functions 폴더의 node_modules 사용
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const admin = require("../functions/node_modules/firebase-admin");

// Firebase Admin 초기화 (Emulator 사용)
admin.initializeApp({
  projectId: "yago-vibe-spt",
});

// Firestore Emulator 연결
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8081";
const db = admin.firestore();

async function seedData() {
  try {
    console.log("🌱 Firestore Emulator에 테스트 데이터 생성 시작...");

    // 현재 로그인한 사용자 UID (실제 사용 시 변경 필요)
    const ownerUid = process.env.OWNER_UID || "oC23hGzbyPOQ3uYGGDPzAxy06vL2";
    const teamId = "7EvUSvUeWiYBxbF5HXE";
    const memberId = "0YQAx6XQpSyK7hQ0Cyqf";

    // 1️⃣ 팀 문서 생성/업데이트
    console.log(`📝 팀 문서 생성: teams/${teamId}`);
    await db.collection("teams").doc(teamId).set({
      name: "테스트팀",
      ownerUid: ownerUid,
      owners: [ownerUid],
      plan: "free",
      allowManualFee: true,
      sportType: "football", // 🔥 TeamContext에서 필수
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log("✅ 팀 문서 생성 완료");

    // 2️⃣ 회원 문서 생성 (여러 명 추가)
    const members = [
      {
        id: memberId,
        name: "김상욱",
        role: "member",
        status: "active",
        feePlan: "monthly",
        monthlyFee: 20000,
        unpaidMonths: 0,
      },
      {
        id: "member2",
        name: "이철수",
        role: "member",
        status: "active",
        feePlan: "monthly",
        monthlyFee: 20000,
        unpaidMonths: 1,
      },
      {
        id: "member3",
        name: "박영희",
        role: "총무",
        status: "active",
        feePlan: "monthly",
        monthlyFee: 20000,
        unpaidMonths: 0,
      },
    ];

    for (const member of members) {
      console.log(`📝 회원 문서 생성: teams/${teamId}/members/${member.id}`);
      await db.collection("teams").doc(teamId).collection("members").doc(member.id).set({
        name: member.name,
        role: member.role,
        status: member.status,
        feePlan: member.feePlan,
        monthlyFee: member.monthlyFee,
        unpaidMonths: member.unpaidMonths,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    console.log(`✅ 회원 문서 생성 완료 (${members.length}명)`);

    // 3️⃣ team_members 컬렉션에도 추가 (권한 체크용)
    // 🔥 중요: TeamContext는 team_members에서 uid로 조회하므로 문서 ID는 자유롭게 설정 가능
    console.log(`📝 team_members 문서 생성: team_members/${ownerUid}_${teamId}`);
    await db.collection("team_members").doc(`${ownerUid}_${teamId}`).set({
      teamId: teamId,
      uid: ownerUid,
      role: "admin",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log("✅ team_members 문서 생성 완료");

    // 4️⃣ 추가 회원들도 team_members에 추가 (선택사항)
    const additionalMembers = [
      { uid: "user2", role: "member" },
      { uid: "user3", role: "member" },
    ];
    
    for (const member of additionalMembers) {
      const memberDocId = `${member.uid}_${teamId}`;
      await db.collection("team_members").doc(memberDocId).set({
        teamId: teamId,
        uid: member.uid,
        role: member.role,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    console.log(`✅ 추가 team_members 문서 생성 완료 (${additionalMembers.length}명)`);

    console.log("\n🎉 테스트 데이터 생성 완료!");
    console.log(`\n📋 생성된 데이터:`);
    console.log(`   - 팀: teams/${teamId}`);
    console.log(`   - 회원: teams/${teamId}/members/${memberId}`);
    console.log(`   - 권한: team_members/${ownerUid}_${teamId}`);
    console.log(`\n✅ 이제 브라우저에서 회비 납부 테스트가 가능합니다!`);

    process.exit(0);
  } catch (error) {
    console.error("❌ 데이터 생성 실패:", error);
    process.exit(1);
  }
}

seedData();
