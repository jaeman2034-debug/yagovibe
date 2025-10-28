// src/utils/aggregateLogs.ts
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

/**
 * Firebase Firestore에서 로그 데이터를 집계하여 요약 반환
 * - geoSample: 위치 샘플링 (30~100개)
 * - devices: 디바이스별 집계
 */
export async function aggregateLogs() {
  try {
    const q = query(collection(db, "logs"), orderBy("timestamp", "desc"), limit(500));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => doc.data());

    // 샘플링
    const geoSample = data
      .filter((d: any) => d.geo)
      .slice(0, Math.min(100, Math.max(30, data.length)))
      .map((d: any) => d.geo);

    // 디바이스별 통계
    const devices = data.reduce((acc: Record<string, number>, cur: any) => {
      const key = cur.device || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // 액션별 통계
    const actions = data.reduce((acc: Record<string, number>, cur: any) => {
      const act = cur.action || "none";
      acc[act] = (acc[act] || 0) + 1;
      return acc;
    }, {});

    return {
      total: data.length,
      geoSample,
      devices,
      actions,
    };
  } catch (err) {
    console.error("aggregateLogs error:", err);
    return { total: 0, geoSample: [], devices: {}, actions: {} };
  }
}
