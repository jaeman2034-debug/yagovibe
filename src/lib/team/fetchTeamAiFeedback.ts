/**
 * Priority 1-3 — teams/{teamId}/aiFeedback 읽기 (client aggregate용)
 */
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AiFeedbackDoc } from "@/lib/team/aiOperationsAggregate";

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object" && v !== null && "toDate" in v && typeof (v as Timestamp).toDate === "function") {
    try {
      return (v as Timestamp).toDate();
    } catch {
      return null;
    }
  }
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  return null;
}

export async function fetchTeamAiFeedback(teamId: string, maxDocs = 500): Promise<AiFeedbackDoc[]> {
  const tid = teamId.trim();
  if (!tid) return [];

  const q = query(
    collection(db, "teams", tid, "aiFeedback"),
    orderBy("createdAt", "desc"),
    limit(Math.max(1, Math.min(2000, maxDocs)))
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => {
    const d = docSnap.data() as Record<string, unknown>;
    return {
      id: docSnap.id,
      teamId: tid,
      featureType: typeof d.featureType === "string" ? d.featureType : "",
      promptVersion: typeof d.promptVersion === "string" ? d.promptVersion : "",
      rating: typeof d.rating === "string" ? d.rating : "",
      edited: d.edited === true,
      regenerateCount: typeof d.regenerateCount === "number" ? d.regenerateCount : undefined,
      comment: typeof d.comment === "string" ? d.comment : "",
      createdBy: typeof d.createdBy === "string" ? d.createdBy : undefined,
      createdAt: toDate(d.createdAt),
      generatedAt: toDate(d.generatedAt),
    };
  });
}
