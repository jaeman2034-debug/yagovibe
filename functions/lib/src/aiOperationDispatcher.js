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
exports.dispatchAIReport = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const N8N_WEBHOOK_URL = "https://n8n.yagovibe.com/webhook/ai-operation";
exports.dispatchAIReport = (0, scheduler_1.onSchedule)({
    schedule: "0 10 * * 1", // 매주 월요일 10시
    timeZone: "Asia/Seoul",
}, async () => {
    logger.info("📡 n8n 자동화 루틴 트리거 시작");
    try {
        const snap = await db
            .collection("weeklyReports")
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
        if (snap.empty) {
            logger.warn("⚠️ 최신 리포트가 없습니다.");
            return;
        }
        const latest = snap.docs[0].data();
        const payload = {
            reportType: "AI 주간 운영 리포트",
            summary: latest.summary || "요약 없음",
            chartUrl: `https://storage.googleapis.com/YOUR_BUCKET/${latest.storagePath}`,
        };
        await (0, node_fetch_1.default)(N8N_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        logger.info("✅ n8n 루틴 전송 완료");
    }
    catch (err) {
        logger.error("❌ n8n 전송 실패", err);
    }
});
//# sourceMappingURL=aiOperationDispatcher.js.map