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
exports.vibeAutoReport = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const node_fetch_1 = __importDefault(require("node-fetch"));
/**
 * 🤖 주간 자동 리포트 생성 함수
 * 매주 월요일 오전 9시(KST) 자동 실행
 * Cloud Scheduler 트리거 사용
 */
exports.vibeAutoReport = functions.scheduler.onSchedule({
    schedule: "0 9 * * 1", // 매주 월요일 09:00 (KST)
    timeZone: "Asia/Seoul",
}, async () => {
    try {
        console.log("🚀 [vibeAutoReport] 시작: 주간 리포트 자동 생성");
        // 호스팅된 앱의 API 호출
        const appUrl = process.env.FUNCTIONS_URL || "https://yago-vibe-spt.web.app";
        const apiUrl = `${appUrl}/api/generateReport`;
        console.log("Profile API URL:", apiUrl);
        const response = await (0, node_fetch_1.default)(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("✅ 자동 리포트 생성 완료:", data.url || "no URL");
        // Firestore에 로그 기록
        const admin = await Promise.resolve().then(() => __importStar(require("firebase-admin")));
        await admin.firestore().collection("auto_reports").add({
            success: true,
            url: data.url || "N/A",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    catch (err) {
        console.error("❌ 자동 리포트 생성 실패:", err);
        // 에러 로그도 Firestore에 기록
        try {
            const admin = await Promise.resolve().then(() => __importStar(require("firebase-admin")));
            await admin.firestore().collection("auto_reports").add({
                success: false,
                error: String(err),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        catch (logErr) {
            console.error("❌ 에러 로그 기록 실패:", logErr);
        }
    }
});
//# sourceMappingURL=vibeAutoReport.js.map