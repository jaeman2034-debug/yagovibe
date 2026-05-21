import { doc, serverTimestamp, updateDoc, type UpdateData } from "firebase/firestore";
import { db } from "@/lib/firebase";

function omitUndefined<T extends Record<string, unknown>>(input: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/**
 * 팀 문서 부분 갱신 + `updatedAt` 항상 갱신 (Admin KPI·활동 지표용).
 * 클라이언트에서 teams 직접 update 하던 코드는 점차 이 함수로 모으면 된다.
 */
export async function updateTeamDocument(teamId: string, patch: Record<string, unknown>): Promise<void> {
  const ref = doc(db, "teams", teamId);
  const payload = omitUndefined(patch);
  await updateDoc(
    ref,
    {
      ...payload,
      updatedAt: serverTimestamp(),
    } as UpdateData<Record<string, unknown>>
  );
}
