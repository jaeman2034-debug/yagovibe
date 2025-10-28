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
exports.predictEventTrends = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
// import { getStorage } from "firebase-admin/storage"; // 미사용
const app_1 = require("firebase-admin/app");
const openai_1 = __importDefault(require("openai"));
const node_fetch_1 = __importDefault(require("node-fetch"));
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
// const bucket = getStorage().bucket(); // 미사용
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || "<YOUR_OPENAI_KEY>",
});
const SLACK_WEBHOOK_URL = "<SLACK_WEBHOOK_URL>";
exports.predictEventTrends = (0, scheduler_1.onSchedule)({
    schedule: "0 8 * * 5", // 매주 금요일 오전 8시 예측 리포트
    timeZone: "Asia/Seoul",
}, async () => {
    var _a;
    logger.info("🤖 AI 이벤트 예측 리포트 시작");
    try {
        // 1️⃣ 최근 4주간 리포트 데이터 수집
        const snap = await db.collection("weeklyReports").orderBy("createdAt", "desc").limit(4).get();
        const reports = snap.docs.map((d) => d.data());
        // const weeks = reports.map((r) => // 미사용
        //     new Date(r.createdAt?.toDate?.() || r.createdAt).toLocaleDateString("ko-KR")
        // );
        const members = reports.map((r) => r.totalMembers || 0);
        const matches = reports.map((r) => r.totalMatches || 0);
        // 2️⃣ AI 예측 텍스트 요약 생성
        const prompt = `지난 4주간 회원 수 ${members.join(", ")} 및 경기 수 ${matches.join(", ")} 데이터를 바탕으로 다음 주 참여율 및 no-show 확률을 예측하고 요약해줘.`;
        let aiSummary = "예측 결과 없음";
        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
            });
            aiSummary = ((_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || aiSummary;
        }
        catch (aiError) {
            logger.warn("⚠️ AI 예측 생성 실패, 기본 요약 사용");
            aiSummary = `활동률: ${members[0]}명 회원이 ${matches[0]}건의 경기에 참여했습니다.`;
        }
        // 3️⃣ Slack 메시지 작성 (Windows에서 그래프 스킵)
        const message = {
            text: `🤖 *YAGO VIBE AI 이벤트 예측 리포트*\n\n${aiSummary}\n\n📊 최근 트렌드: 회원 ${members[0]}명, 경기 ${matches[0]}건`,
        };
        // 4️⃣ Slack 전송
        await (0, node_fetch_1.default)(SLACK_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(message),
        });
        logger.info("✅ AI 이벤트 예측 리포트 완료");
    }
    catch (err) {
        logger.error("❌ AI 이벤트 예측 리포트 오류", err);
    }
});
//# sourceMappingURL=eventPredictionNotifier.js.map