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
exports.selfLearningGovernance = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const openai_1 = __importDefault(require("openai"));
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || "<YOUR_OPENAI_KEY>",
});
exports.selfLearningGovernance = (0, scheduler_1.onSchedule)({
    schedule: "every 24 hours",
    timeZone: "Asia/Seoul",
}, async () => {
    var _a;
    logger.info("🧠 Self-Learning Governance 업데이트 시작");
    // 1️⃣ 학습 데이터 수집
    const [alertsSnap, opsSnap, summarySnap] = await Promise.all([
        db.collection("governanceAlerts").orderBy("createdAt", "desc").limit(30).get(),
        db.collection("opsReports").orderBy("createdAt", "desc").limit(10).get(),
        db.collection("teamSummaries").get(),
    ]);
    const alerts = alertsSnap.docs.map((d) => d.data());
    const opsReports = opsSnap.docs.map((d) => d.data());
    const summaries = summarySnap.docs.map((d) => d.data());
    // 2️⃣ AI 정책 학습 요청
    const prompt = `
    아래는 최근 YAGO VIBE 운영 데이터입니다.
    이 데이터를 분석해서 다음 정책 파라미터를 조정해줘:
    
    Alerts (최근 30개): ${JSON.stringify(alerts.length > 0 ? alerts : "데이터 없음")}
    OpsReports (최근 10개): ${JSON.stringify(opsReports.length > 0 ? opsReports : "데이터 없음")}
    TeamSummaries: ${JSON.stringify(summaries.length > 0 ? summaries.length : "데이터 없음")}

    {
      "alertThreshold": {
        "satisfactionDrop": number,
        "lowActivityLevel": "낮음|보통|높음",
        "fatigueRise": number
      },
      "reportPolicy": {
        "generationFrequency": "daily|weekly",
        "summaryLength": "short|normal|detailed"
      },
      "governanceActions": [
        {"condition":"만족도 하락", "recommendedAction":"팀장 확인"}
      ],
      "comment": "이번 조정의 이유"
    }
    `;
    let parsed = {
        alertThreshold: {},
        reportPolicy: {},
        governanceActions: [],
        comment: "AI 분석 실패"
    };
    try {
        const ai = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        const result = ((_a = ai.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || "{}";
        parsed = JSON.parse(result);
    }
    catch (err) {
        logger.warn("⚠️ AI 학습 실패");
    }
    // 3️⃣ Firestore에 정책 버전 저장
    const versionRef = db.collection("governancePolicies").doc(`policy-${Date.now()}`);
    await versionRef.set(Object.assign({ createdAt: new Date() }, parsed));
    // 4️⃣ 현재 정책(Active Policy) 갱신
    await db.collection("governancePolicies").doc("active").set(Object.assign({ updatedAt: new Date() }, parsed));
    logger.info("✅ Self-Learning 정책 갱신 완료", { comment: parsed.comment });
});
//# sourceMappingURL=selfLearningGovernance.js.map