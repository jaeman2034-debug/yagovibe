// src/lib/logging.ts
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

// ✅ 반드시 포함되어야 하는 타입 정의
export type VoiceIntent =
    | "지도열기"
    | "근처검색"
    | "위치이동"
    | "홈이동"
    | "미확인";

// ✅ 공통 로그 타입
type BaseLog = {
    ts?: any;
    uid?: string | null;
    text?: string;
    intent?: VoiceIntent;
    action?: string;
    keyword?: string;
    lat?: number;
    lng?: number;
    resultCount?: number;
    note?: string;
};

const coll = () => collection(db, "voice_logs");

const currentUid = () => {
    try {
        return auth?.currentUser?.uid ?? null;
    } catch {
        return null;
    }
};

// ✅ 음성 이벤트 로그 저장
export async function logVoiceEvent(p: {
    text?: string;
    intent?: VoiceIntent;
    action?: string;
    keyword?: string;
    note?: string;
}) {
    try {
        await addDoc(coll(), {
            ts: serverTimestamp(),
            uid: currentUid(),
            ...p,
        } as BaseLog);
    } catch (e) {
        console.warn("⚠️ logVoiceEvent 오류", e);
    }
}

// ✅ 위치 변경 로그 저장
export async function logPosition(p: {
    lat: number;
    lng: number;
    note?: string;
}) {
    try {
        await addDoc(coll(), {
            ts: serverTimestamp(),
            uid: currentUid(),
            lat: p.lat,
            lng: p.lng,
            note: p.note ?? "position",
        } as BaseLog);
    } catch (e) {
        console.warn("⚠️ logPosition 오류", e);
    }
}

// ✅ 검색 결과 로그 저장
export async function logSearchResult(p: {
    keyword: string;
    lat?: number;
    lng?: number;
    resultCount: number;
}) {
    try {
        await addDoc(coll(), {
            ts: serverTimestamp(),
            uid: currentUid(),
            intent: "근처검색",
            action: "nearbySearch",
            keyword: p.keyword,
            lat: p.lat,
            lng: p.lng,
            resultCount: p.resultCount,
        } as BaseLog);
    } catch (e) {
        console.warn("⚠️ logSearchResult 오류", e);
    }
}

// ✅ 간단한 음성 액션 로그 (추가 편의 함수)
export async function logVoiceAction(data: {
    text: string;
    intent: string;
    target?: string;
    result?: any;
}) {
    try {
        await logVoiceEvent({
            text: data.text,
            intent: data.intent as any,
            keyword: data.target,
            note: JSON.stringify(data.result),
        });
        console.log("✅ 음성 액션 로그 저장 완료");
    } catch (err) {
        console.error("🔥 로그 저장 실패:", err);
    }
}
