import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";

/**
 * Step 43: 사용자 액션 로깅 Helper
 * reports/{reportId}/auditLogs에 활동 로그 기록
 */
export async function logUserAction(
    reportId: string,
    action: string,
    target?: string
): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
        console.warn("⚠️ 로그인되지 않은 사용자의 액션 로깅 시도");
        return;
    }

    try {
        const auditLogsRef = collection(db, "reports", reportId, "auditLogs");
        await addDoc(auditLogsRef, {
            uid: user.uid,
            email: user.email || "unknown",
            action,
            target: target || "",
            createdAt: serverTimestamp(),
        });
        console.log(`✅ 활동 로그 기록: ${action} (${target || "N/A"})`);
    } catch (error) {
        console.error("❌ 활동 로그 기록 실패:", error);
        // 로그 실패해도 액션은 계속 진행
    }
}

/**
 * 관리자 권한 확인 (이메일 기반)
 */
export function isAdminUser(): boolean {
    const user = auth.currentUser;
    if (!user || !user.email) return false;

    const ADMIN_EMAILS = [
        "admin@yagovibe.com",
        "admin@yago-vibe.com",
        // 추가 관리자 이메일
    ];

    return ADMIN_EMAILS.includes(user.email) || user.email.includes("admin");
}

