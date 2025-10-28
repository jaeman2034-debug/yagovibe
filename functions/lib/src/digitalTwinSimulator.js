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
exports.runDigitalTwinSimulation = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const openai_1 = __importDefault(require("openai"));
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || "<YOUR_OPENAI_KEY>",
});
exports.runDigitalTwinSimulation = (0, https_1.onCall)(async (req) => {
    var _a;
    const { team, scenario } = req.data;
    if (!team || !scenario)
        return { error: "팀명과 시나리오 설명이 필요합니다." };
    logger.info("🧩 Digital Twin Simulation 실행:", { team, scenario });
    // 1️⃣ 실제 팀 데이터 조회
    const teamData = await db.collection("teamSummaries").doc(team).get();
    if (!teamData.exists) {
        return { error: "팀 데이터를 찾을 수 없습니다." };
    }
    const data = teamData.data();
    // 2️⃣ AI 시뮬레이션 프롬프트
    const prompt = `
  팀명: ${team}
  현재 데이터:
  ${JSON.stringify(data, null, 2)}
  가상 시나리오: "${scenario}"

  예측 결과를 JSON 형식으로 생성해줘:
  {
    "예상참여율변화": "+10%" 또는 "-5%",
    "예상만족도": 0~100 숫자,
    "예상피로도": "낮음|보통|높음",
    "리스크요인": "...",
    "추천전략": "..." 
  }
  `;
    let parsed = {
        예상참여율변화: "0%",
        예상만족도: 50,
        예상피로도: "보통",
        리스크요인: "AI 분석 실패",
        추천전략: "데이터 부족",
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
        logger.warn("⚠️ AI 시뮬레이션 실패");
    }
    await db.collection("digitalTwinSimulations").add(Object.assign(Object.assign({ team,
        scenario }, parsed), { createdAt: new Date() }));
    return { message: `✅ ${team} 시나리오 시뮬레이션 완료`, result: parsed };
});
//# sourceMappingURL=digitalTwinSimulator.js.map