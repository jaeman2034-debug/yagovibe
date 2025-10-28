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
exports.vibeTTSReport = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const admin = __importStar(require("firebase-admin"));
/**
 * 🎤 TTS 리포트 자동 낭독 함수
 * 리포트가 생성될 때 자동으로 TTS 변환
 */
exports.vibeTTSReport = functions.firestore
    .document("auto_reports/{reportId}")
    .onCreate(async (snap) => {
    const data = snap.data();
    if (!(data === null || data === void 0 ? void 0 : data.report)) {
        console.log("⚠️ 리포트 텍스트가 없습니다.");
        return;
    }
    console.log("🎤 [TTS] 리포트 낭독 생성 중...");
    try {
        // OpenAI TTS API 호출
        const response = await (0, node_fetch_1.default)("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "tts-1",
                voice: "alloy",
                input: `이번 주 YAGO VIBE 리포트입니다. ${data.report}`,
            }),
        });
        if (!response.ok) {
            throw new Error(`TTS API 오류: ${response.status}`);
        }
        // 오디오 버퍼 변환
        const audioBuffer = Buffer.from(await response.arrayBuffer());
        const filename = `reports/audio/${snap.id}.mp3`;
        // Firebase Storage 업로드
        const bucket = admin.storage().bucket();
        const file = bucket.file(filename);
        await file.save(audioBuffer, {
            metadata: { contentType: "audio/mpeg" },
        });
        // 다운로드 URL 생성
        await file.makePublic();
        const url = `https://storage.googleapis.com/${bucket.name}/${filename}`;
        // Firestore 업데이트
        await snap.ref.update({ audioUrl: url });
        console.log("✅ [TTS] 오디오 생성 완료:", url);
    }
    catch (err) {
        console.error("❌ TTS 생성 실패:", err);
        // 실패해도 리포트는 정상 작동하도록 에러 로그만 기록
    }
});
//# sourceMappingURL=vibeTTSReport.js.map