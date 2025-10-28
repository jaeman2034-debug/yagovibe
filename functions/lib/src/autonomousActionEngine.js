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
exports.autonomousActionEngine = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const openai_1 = __importDefault(require("openai"));
const node_fetch_1 = __importDefault(require("node-fetch"));
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || "<YOUR_OPENAI_KEY>",
});
exports.autonomousActionEngine = (0, scheduler_1.onSchedule)({
    schedule: "every 6 hours",
    timeZone: "Asia/Seoul",
}, async () => {
    var _a, _b;
    logger.info("🤖 Autonomous Action Engine 실행 시작");
    const reportsSnap = await db
        .collection("predictiveReports")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
    if (reportsSnap.empty) {
        logger.warn("❌ 예측 리포트 없음");
        return;
    }
    const latest = reportsSnap.docs[0].data();
    const forecasts = ((_a = latest.forecast) === null || _a === void 0 ? void 0 : _a.teamForecasts) || [];
    const prompt = `
    다음 팀별 4주 예측 데이터를 보고 각 팀에 필요한 실행 조치를 결정해줘.
    가능한 액션 타입: ["휴식일 추가", "훈련 강도 조정", "코치 배정 추가", "격려 메시지 전송", "이상 없음"]
    JSON 형식:
    {"actions":[{"team":"...", "action":"...", "reason":"..."}]}
    데이터:
    ${JSON.stringify(forecasts, null, 2)}
    `;
    let parsed = { actions: [] };
    try {
        const ai = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        const result = ((_b = ai.choices[0].message) === null || _b === void 0 ? void 0 : _b.content) || "{}";
        parsed = JSON.parse(result);
    }
    catch (err) {
        logger.warn("⚠️ AI 분석 실패");
    }
    const actions = parsed.actions || [];
    logger.info("⚙️ AI 결정 조치:", actions.length);
    for (const act of actions) {
        const { team, action, reason } = act;
        // Firestore에 기록
        await db.collection("autonomousActions").add({
            team,
            action,
            reason,
            executedAt: new Date(),
        });
        // Slack / n8n Webhook 연동
        const webhook = process.env.SLACK_WEBHOOK_URL;
        if (webhook) {
            await (0, node_fetch_1.default)(webhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: `🤖 *AI Autonomous Action 수행됨*\n🏟️ 팀: ${team}\n⚙️ 조치: ${action}\n🧠 이유: ${reason}`,
                }),
            });
        }
        // 추가 자동 조치 시뮬레이션
        if (action.includes("휴식")) {
            await db.collection("events").add({
                team,
                type: "휴식",
                date: new Date(),
                note: "AI 자동 휴식일 등록",
            });
        }
    }
    logger.info("✅ AI Autonomous Action 완료");
});
//# sourceMappingURL=autonomousActionEngine.js.map