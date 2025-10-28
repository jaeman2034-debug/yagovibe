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
exports.onVoiceCommand = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
// Firebase Admin 초기화
if (!admin.apps.length) {
    admin.initializeApp();
}
/**
 * 🎤 onVoiceCommand (OpenAI 연동 버전)
 * Firestore의 voice_commands/{commandId} 문서가 생성될 때마다 실행됨
 */
exports.onVoiceCommand = (0, firestore_1.onDocumentCreated)("voice_commands/{commandId}", async (event) => {
    var _a, _b, _c;
    const snap = event.data;
    if (!snap)
        return;
    const data = snap.data();
    const { text, userId } = data;
    const commandId = event.params.commandId;
    console.log("🎧 음성 명령 수신:", text);
    try {
        // ✅ OpenAI API 호출
        const response = await (0, node_fetch_1.default)("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "당신은 YAGO VIBE 스포츠 어시스턴트입니다. 사용자의 음성 명령을 분석하고 간결하게 답변하세요.",
                    },
                    {
                        role: "user",
                        content: text,
                    },
                ],
                temperature: 0.7,
            }),
        });
        const result = await response.json();
        const summary = ((_c = (_b = (_a = result.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || "AI 응답 없음";
        // ✅ Firestore에 결과 저장
        await admin.firestore().collection("voice_analysis").doc(commandId).set({
            userId,
            originalText: text,
            aiResult: { summary },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log("✅ AI 응답 저장 완료:", summary);
    }
    catch (err) {
        console.error("❌ onVoiceCommand 오류:", err);
    }
});
//# sourceMappingURL=onVoiceCommand.js.map