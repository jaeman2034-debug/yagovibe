"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.vibeHealthCheck = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const node_fetch_1 = __importDefault(require("node-fetch"));
/**
 * 🩺 시스템 상태 점검 함수
 * 6시간마다 자동 실행
 * 앱 상태 확인 후 Slack 경고 전송
 */
exports.vibeHealthCheck = functions.scheduler.onSchedule({
    schedule: "0 */6 * * *", // 6시간마다 실행
    timeZone: "Asia/Seoul",
}, async () => {
    try {
        console.log("🩺 [HealthCheck] 시스템 상태 점검 시작");
        const appUrl = process.env.FUNCTIONS_URL || "https://yago-vibe-spt.web.app";
        const healthUrl = `${appUrl}/api/health`;
        const res = await (0, node_fetch_1.default)(healthUrl);
        if (res.ok) {
            console.log("✅ VIBE 시스템 정상 작동 중");
            // 정상 상태도 Firestore에 기록
            const admin = await Promise.resolve().then(() => __importStar(require("firebase-admin")));
            await admin.firestore().collection("health_checks").add({
                status: "ok",
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        else {
            throw new Error(`HTTP Status: ${res.status}`);
        }
    }
    catch (err) {
        console.error("⚠️ 시스템 점검 실패:", err);
        // 실패 시 Slack 경고 전송
        const slackWebhook = process.env.SLACK_WEBHOOK_URL;
        if (slackWebhook) {
            try {
                await (0, node_fetch_1.default)(slackWebhook, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text: `🚨 *YAGO VIBE HealthCheck 경고!*\n\n오류: ${err}\n시간: ${new Date().toISOString()}`,
                    }),
                });
            }
            catch (slackErr) {
                console.error("❌ Slack 전송 실패:", slackErr);
            }
        }
        // 에러 로그 Firestore 저장
        try {
            const admin = await Promise.resolve().then(() => __importStar(require("firebase-admin")));
            await admin.firestore().collection("health_checks").add({
                status: "error",
                error: String(err),
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        catch (logErr) {
            console.error("❌ 에러 로그 저장 실패:", logErr);
        }
    }
});
//# sourceMappingURL=healthCheck.js.map