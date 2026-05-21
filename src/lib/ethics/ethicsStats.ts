/**
 * Ethics Decision 집계 로직
 * 
 * _ethicsDecisions 컬렉션에서 통계 수집
 */

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function loadEthicsStats(tenantId: string) {
  if (!tenantId) {
    return {
      total: 0,
      allow: 0,
      review: 0,
      block: 0,
      scoreBuckets: { "0-59": 0, "60-79": 0, "80-100": 0 },
      topReasons: [],
    };
  }

  try {
    const q = query(
      collection(db, "_ethicsDecisions"),
      where("tenantId", "==", tenantId)
    );

    const snap = await getDocs(q);

    let total = 0;
    let allow = 0;
    let review = 0;
    let block = 0;

    const scoreBuckets = { "0-59": 0, "60-79": 0, "80-100": 0 };
    const reasonCount: Record<string, number> = {};

    snap.forEach((d) => {
      total++;
      const e = d.data() as any;

      if (e.verdict === "allow") allow++;
      if (e.verdict === "review_required") review++;
      if (e.verdict === "block") block++;

      if (e.score < 60) scoreBuckets["0-59"]++;
      else if (e.score < 80) scoreBuckets["60-79"]++;
      else scoreBuckets["80-100"]++;

      (e.reasons ?? []).forEach((r: string) => {
        reasonCount[r] = (reasonCount[r] ?? 0) + 1;
      });
    });

    return {
      total,
      allow,
      review,
      block,
      scoreBuckets,
      topReasons: Object.entries(reasonCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    };
  } catch (error: any) {
    console.error("loadEthicsStats 에러:", error);
    // 인덱스 없음 등 에러 발생 시 빈 결과 반환
    return {
      total: 0,
      allow: 0,
      review: 0,
      block: 0,
      scoreBuckets: { "0-59": 0, "60-79": 0, "80-100": 0 },
      topReasons: [],
    };
  }
}

