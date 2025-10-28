import * as admin from "firebase-admin";

// Firestore 에뮬레이터 사용 설정
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8082";

admin.initializeApp({
    projectId: "yago-vibe-spt",
});

async function main() {
    const db = admin.firestore();

    const testData = {
        user: "테스트유저",
        message: "AI 자동 트리거 작동 테스트 🚀",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await db.collection("logs").add(testData);
    console.log("✅ 테스트 문서 추가 완료:", ref.id);
}

main()
    .then(() => {
        console.log("🔥 Firestore logs 문서 추가 완료");
        process.exit(0);
    })
    .catch((err) => {
        console.error("❌ 오류 발생:", err);
        process.exit(1);
    });
