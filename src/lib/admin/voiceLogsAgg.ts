/** Client-side aggregation from voice_logs rows (read model only — no new SoT). */

import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, where } from "firebase/firestore";
import dayjs from "dayjs";

export type VoiceLogsAgg = {
  date: string;
  total: number;
  intents: Record<string, number>;
  keywords: Record<string, number>;
  hours: Record<string, number>;
};

type VoiceLogRow = {
  ts?: { seconds?: number };
  intent?: string;
  keyword?: string;
};

export function buildVoiceLogsAggFromRows(rows: VoiceLogRow[]): VoiceLogsAgg {
  const date = new Date().toISOString().slice(0, 10);
  const intents: Record<string, number> = {};
  const keywords: Record<string, number> = {};
  const hours: Record<string, number> = {};

  for (const row of rows) {
    const intent = row.intent || "미확인";
    intents[intent] = (intents[intent] || 0) + 1;
    const kw = (row.keyword || "").trim();
    if (kw) keywords[kw] = (keywords[kw] || 0) + 1;
    const sec = row.ts?.seconds;
    if (typeof sec === "number") {
      const h = String(new Date(sec * 1000).getHours());
      hours[h] = (hours[h] || 0) + 1;
    }
  }

  return {
    date,
    total: rows.length,
    intents,
    keywords,
    hours,
  };
}

/** Reads voice_logs for today (same window as admin Insights). */
export async function aggregateVoiceLogsFromFirestore(): Promise<VoiceLogsAgg> {
  const todayStart = dayjs().startOf("day").toDate();
  const q = query(
    collection(db, "voice_logs"),
    where("ts", ">=", todayStart),
    orderBy("ts", "desc"),
    limit(1000)
  );
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => d.data() as VoiceLogRow);
  return buildVoiceLogsAggFromRows(rows);
}
