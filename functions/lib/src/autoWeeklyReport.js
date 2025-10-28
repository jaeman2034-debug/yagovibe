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
exports.autoWeeklyReport = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
/**
 * 🤖 주간 리포트 자동 생성 및 발송
 * 매주 월요일 오전 9시 자동 실행
 */
exports.autoWeeklyReport = functions
    .region("asia-northeast3") // 서울 리전
    .pubsub.schedule("0 9 * * 1") // 매주 월요일 오전 9시
    .timeZone("Asia/Seoul")
    .onRun(async () => {
    var _a, _b;
    console.log("🤖 [autoWeeklyReport] 주간 리포트 자동 생성 시작...");
    const generatedAt = new Date().toISOString();
    const reportDate = new Date().toISOString().split("T")[0];
    try {
        // 1️⃣ Firebase 데이터 수집
        const usersSnap = await admin.firestore().collection("users").get();
        const activeUsers = usersSnap.size;
        // Voice logs 통계
        const logsSnap = await admin.firestore()
            .collection("voice_logs")
            .orderBy("ts", "desc")
            .limit(100)
            .get();
        const totalLogs = logsSnap.size;
        console.log(`📊 데이터 수집 완료 - 사용자: ${activeUsers}명, 로그: ${totalLogs}건`);
        // 2️⃣ AI 리포트 생성 (generateWeeklyReport 호출)
        const generateReportUrl = `https://${((_a = functions.config().firebase) === null || _a === void 0 ? void 0 : _a.location) || "asia-northeast3"}-${process.env.GCLOUD_PROJECT || "yago-vibe-spt"}.cloudfunctions.net/generateWeeklyReport`;
        console.log("🧠 AI 리포트 생성 호출:", generateReportUrl);
        const pdfResponse = await (0, node_fetch_1.default)(generateReportUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: "YAGO VIBE 주간 AI 리포트",
                summary: `활성 사용자 수: ${activeUsers}명, 총 로그: ${totalLogs}건`,
                generatedAt,
            }),
        });
        if (!pdfResponse.ok) {
            throw new Error(`PDF 생성 실패: ${pdfResponse.status}`);
        }
        const pdfData = await pdfResponse.json();
        const pdfUrl = pdfData.pdfUrl || pdfData.url;
        console.log("✅ PDF 생성 완료:", pdfUrl);
        // 3️⃣ n8n 이메일 + Slack 전송 트리거
        const n8nWebhook = ((_b = functions.config().n8n) === null || _b === void 0 ? void 0 : _b.webhook) || "https://n8n.yagovibe.com/webhook/weekly-report";
        console.log("📧 n8n 웹훅 호출:", n8nWebhook);
        const n8nResponse = await (0, node_fetch_1.default)(n8nWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                pdfUrl,
                generatedAt,
                reportDate,
                reportType: "auto-weekly",
                triggeredBy: "firebase-functions",
                summary: `활성 사용자: ${activeUsers}명, 총 로그: ${totalLogs}건`,
            }),
        });
        if (!n8nResponse.ok) {
            console.warn("⚠️ n8n 웹훅 호출 실패:", n8nResponse.status);
        }
        else {
            console.log("✅ n8n 웹훅 호출 성공");
        }
        // 4️⃣ Firestore에 리포트 기록
        await admin.firestore().collection("auto_reports").add({
            type: "weekly",
            reportDate,
            pdfUrl,
            activeUsers,
            totalLogs,
            generatedAt,
            status: "completed",
        });
        console.log("✅ 주간 리포트 자동 생성 및 발송 완료!");
        return {
            success: true,
            pdfUrl,
            reportDate,
            activeUsers,
            totalLogs
        };
    }
    catch (error) {
        console.error("❌ 자동 리포트 생성 실패:", error);
        // 에러 기록
        await admin.firestore().collection("auto_reports").add({
            type: "weekly",
            reportDate,
            generatedAt,
            status: "failed",
            error: error instanceof Error ? error.message : String(error)
        });
        throw error;
    }
});
//# sourceMappingURL=autoWeeklyReport.js.map