import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getMessaging } from "firebase-admin/messaging";
import { getAuth } from "firebase-admin/auth";

/**
 * 🔔 관리자 토픽 구독 HTTPS 함수
 * 클라이언트에서 호출하여 FCM 토큰을 "admins" 토픽에 구독시킵니다.
 */
export const subscribeAdminTopic = onCall(
    {
        cors: true,
        region: "asia-northeast3",
    },
    async (request) => {
        const { token } = request.data || {};

        if (!token || typeof token !== "string") {
            throw new Error("FCM token이 필요합니다.");
        }

        const uid = request.auth?.uid;
        if (!uid) {
            throw new Error("인증이 필요합니다.");
        }

        try {
            // 관리자 권한 확인
            const user = await getAuth().getUser(uid);
            const isAdmin = user.customClaims?.admin === true;

            // TODO: 실제 관리자 체크 로직으로 교체
            // 예: 특정 이메일 목록이나 Firestore의 admin 역할 확인
            const adminEmails = process.env.ADMIN_EMAILS?.split(",") || ["admin@yagovibe.com"];
            const isAdminByEmail = user.email && adminEmails.includes(user.email);

            if (!isAdmin && !isAdminByEmail) {
                logger.warn(`⚠️ 관리자가 아닌 사용자의 토픽 구독 시도: ${uid} (${user.email})`);
                throw new Error("관리자만 토픽에 구독할 수 있습니다.");
            }

            // FCM 토픽 구독
            const messaging = getMessaging();
            await messaging.subscribeToTopic([token], "admins");

            logger.info(`✅ 관리자 토픽 구독 완료: ${uid} (${user.email})`);

            return {
                success: true,
                message: "관리자 토픽 구독이 완료되었습니다.",
                topic: "admins",
            };
        } catch (error) {
            logger.error("❌ 토픽 구독 중 오류:", error);
            throw error instanceof Error ? error : new Error("토픽 구독에 실패했습니다.");
        }
    }
);

