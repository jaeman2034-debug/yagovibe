import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { uploadTextToStorage } from "../lib/storage";
import { sendSlackReport } from "./shareSlack";
import { getFunctionsOrigin } from "@/lib/functions/functionsOrigin";

/**
 * Cloud Functions generateWeeklyReport (server OpenAI) 호출.
 * 브라우저 OpenAI 클라이언트 사용 금지.
 */
export async function generateWeeklyReport(): Promise<string> {
  try {
    console.log("📊 서버 주간 리포트 생성 요청...");
    const response = await fetch(`${getFunctionsOrigin()}/generateWeeklyReport`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const body = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      summary?: string;
      message?: string;
      error?: string;
    };
    if (!response.ok || body.ok === false) {
      throw new Error(body.message || body.error || response.statusText);
    }
    return body.summary || "서버 리포트 생성이 완료되었습니다.";
  } catch (error) {
    console.error("❌ 리포트 생성 오류:", error);
    return `오류가 발생했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`;
  }
}

/** 로컬 voice_logs 집계만 (OpenAI 없음). */
export async function generateDailyReport(): Promise<string> {
  try {
    const q = query(collection(db, "voice_logs"), orderBy("ts", "desc"), limit(50));
    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map((d) => d.data());
    if (!logs.length) return "오늘 voice_logs가 없습니다.";
    const lines = logs.slice(0, 10).map((l) => `- ${l.text || "N/A"} (${l.intent || "미확인"})`);
    return `최근 로그 ${logs.length}건 (상위 10):\n${lines.join("\n")}`;
  } catch (error) {
    console.error("❌ 일간 리포트 오류:", error);
    return `오류: ${error instanceof Error ? error.message : "unknown"}`;
  }
}

export async function generateAndShareReport(): Promise<string> {
  const report = await generateWeeklyReport();
  try {
    const url = await uploadTextToStorage(report, `reports/weekly-${Date.now()}.txt`);
    await sendSlackReport(`${report.slice(0, 500)}\n\nStorage: ${url}`);
  } catch (e) {
    console.warn("공유 단계 실패:", e);
  }
  return report;
}
