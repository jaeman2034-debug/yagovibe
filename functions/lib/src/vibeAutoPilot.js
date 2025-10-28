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
Object.defineProperty(exports, "__esModule", { value: true });
exports.vibeAutoPilot = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
// ✅ Firestore 컬렉션 'logs'에 새 문서가 생성될 때 실행
exports.vibeAutoPilot = (0, firestore_1.onDocumentCreated)("logs/{logId}", async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const data = snap.data();
    const logId = event.params.logId;
    console.log("🧠 vibeAutoPilot 실행됨:", logId, data);
    // 예시: n8n 또는 AI 엔진으로 자동 분석 트리거
    const summary = `🔥 [AutoPilot] ${data.user || "unknown"}가 남긴 로그 분석 완료`;
    await admin.firestore().collection("analysis").doc(logId).set({
        summary,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log("✅ 분석 결과 저장 완료");
});
//# sourceMappingURL=vibeAutoPilot.js.map