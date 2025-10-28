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
exports.notifyWeeklyReport = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const storage_1 = require("firebase-admin/storage");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)();
const SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/XXX/YYY/ZZZ"; // 실제 Webhook으로 교체
exports.notifyWeeklyReport = (0, scheduler_1.onSchedule)({
    schedule: "10 9 * * 1", // 매주 월요일 09:10
    timeZone: "Asia/Seoul",
}, async () => {
    const db = (0, firestore_1.getFirestore)();
    const bucket = (0, storage_1.getStorage)().bucket();
    logger.info("💬 Slack 리포트 자동 전송 시작");
    try {
        // 1️⃣ Firestore에서 가장 최근 weeklyReports 문서 가져오기
        const reportsRef = db.collection("weeklyReports").orderBy("createdAt", "desc").limit(1);
        const snapshot = await reportsRef.get();
        if (snapshot.empty) {
            logger.warn("⚠️ 최근 리포트 없음");
            return;
        }
        const latest = snapshot.docs[0].data();
        const filePath = latest.storagePath;
        // 2️⃣ Storage의 Signed URL 생성 (임시 접근 링크)
        const [url] = await bucket.file(filePath).getSignedUrl({
            action: "read",
            expires: Date.now() + 1000 * 60 * 60 * 24 * 3, // 3일 유효
        });
        // 3️⃣ Slack 메시지 작성
        const message = {
            text: `📊 *YAGO VIBE 주간 리포트*\n\n👥 총 회원 수: ${latest.totalMembers}\n⚽ 경기 수: ${latest.totalMatches}\n\n📄 [PDF 다운로드](${url})`,
        };
        // 4️⃣ Slack 전송
        await (0, node_fetch_1.default)(SLACK_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(message),
        });
        logger.info("✅ Slack 리포트 전송 완료", { url });
    }
    catch (err) {
        logger.error("❌ Slack 전송 오류", err);
    }
});
//# sourceMappingURL=reportNotifier.js.map