import * as admin from "firebase-admin";
admin.initializeApp();

export const sendTestPush = async (token: string) => {
    const message = {
        token,
        notification: {
            title: "🏆 YAGO SPORTS 알림 테스트",
            body: "브라우저 푸시 알림이 정상적으로 작동합니다!",
        },
    };

    try {
        await admin.messaging().send(message);
        console.log("✅ 푸시 알림 전송 성공!");
    } catch (error) {
        console.error("❌ 푸시 전송 실패:", error);
    }
};

