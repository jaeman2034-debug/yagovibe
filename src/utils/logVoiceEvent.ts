// === CORE PROTECTED: DO NOT MODIFY BELOW ===
// 🔥 YAGO SPORTS Voice Event Logger
// 음성 명령 처리 과정 추적 및 분석

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/core/firebase";

export const logVoiceEvent = async (type: string, payload: any) => {
    try {
        await addDoc(collection(db, "voice_logs"), {
            type,                  // "STT", "NLU", "TTS", "ERROR", "MAP_ACTION"
            payload,
            createdAt: serverTimestamp(),
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
        });

        console.log(`📊 로그 저장 완료: ${type}`, payload);
    } catch (err) {
        console.error("🔥 로그 저장 실패:", err);
    }
};

// ✅ 특화된 로그 함수들
export const logSTTEvent = async (recognizedText: string, confidence?: number) => {
    await logVoiceEvent("STT", {
        recognizedText,
        confidence,
        timestamp: Date.now(),
    });
};

export const logNLUEvent = async (plan: any, originalText: string) => {
    await logVoiceEvent("NLU", {
        plan,
        originalText,
        timestamp: Date.now(),
    });
};

export const logTTSEvent = async (text: string, success: boolean = true) => {
    await logVoiceEvent("TTS", {
        text,
        success,
        timestamp: Date.now(),
    });
};

export const logMapActionEvent = async (action: string, target: string, result: any) => {
    await logVoiceEvent("MAP_ACTION", {
        action,
        target,
        result,
        timestamp: Date.now(),
    });
};

export const logErrorEvent = async (error: any, context: string) => {
    await logVoiceEvent("ERROR", {
        message: error.message || error,
        stack: error.stack,
        context,
        timestamp: Date.now(),
    });
};

// === END PROTECTED ===
