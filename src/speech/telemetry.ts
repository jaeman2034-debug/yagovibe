// src/speech/telemetry.ts
// 🔥 Phase 4-2: Firestore 기반 음성 텔레메트리 (PROD 안전 버전)
// ✅ 원칙: 원문 transcript 저장 ❌, 해시 + 메타데이터만 저장

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 가벼운 해시 함수 (보안용이 아니라 중복 집계용)
 * 동일한 문장은 항상 동일한 해시를 생성
 */
function stableHash(str: string): string {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/**
 * NLP 사용 메트릭 로깅 (Phase 6)
 */
export async function logMetric(metric: {
  type: "NLP_USED";
  ok: boolean;
  pathname: string;
  error?: string;
}): Promise<void> {
  if (import.meta.env.DEV) {
    console.log("[Telemetry][Metric]", metric);
    return;
  }

  try {
    const payload = {
      ...metric,
      ts: serverTimestamp(),
      v: import.meta.env.VITE_APP_VERSION ?? "dev",
    };
    await addDoc(collection(db, "voice_metrics"), payload);
  } catch (e) {
    // 실패해도 UX 영향 없음
    console.info("[Voice] metric logging skipped");
  }
}

/**
 * UNKNOWN 음성 명령 로깅
 * PROD: Firestore에 해시만 저장 (원문 없음)
 * DEV: 콘솔에 원문 + 해시 출력
 */
export async function logUnknownVoice(transcript: string, pathname: string): Promise<void> {
  if (!transcript) return;

  const normalized = transcript.trim().toLowerCase().replace(/\s+/g, " ");
  const hash = stableHash(normalized);

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const payload = {
    type: "UNKNOWN",
    hash,
    pathname,
    device: isMobile ? "mobile" : "desktop",
    ts: serverTimestamp(),
    v: import.meta.env.VITE_APP_VERSION ?? "dev",
  };

  // 🔥 DEV는 콘솔만 (원문 포함)
  if (import.meta.env.DEV) {
    console.warn("[Voice][UNKNOWN]", { transcript, payload });
    return;
  }

  // 🔥 PROD는 Firestore에 해시만 저장 (개인정보 보호)
  try {
    await addDoc(collection(db, "voice_telemetry"), payload);
  } catch (e) {
    // 실패해도 UX 영향 없음 (조용히 실패)
    console.info("[Voice] telemetry skipped");
  }
}

