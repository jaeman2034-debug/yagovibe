/**
 * activities ↔ 원본 문서 동기화 (삭제 시 피드 정리)
 */

import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ActivityRefCollection } from "@/types/activity";

const BATCH_MAX = 400;

/**
 * 같은 refId·refCollection 을 가리키는 activities 문서 삭제
 * (예: matches 문서 삭제 직후 호출)
 */
export async function deleteActivitiesForRef(
  refId: string,
  refCollection: ActivityRefCollection
): Promise<number> {
  const q = query(
    collection(db, "activities"),
    where("refId", "==", refId),
    where("refCollection", "==", refCollection)
  );
  const snap = await getDocs(q);
  let deleted = 0;
  let batch = writeBatch(db);
  let n = 0;

  for (const d of snap.docs) {
    batch.delete(d.ref);
    n++;
    deleted++;
    if (n >= BATCH_MAX) {
      await batch.commit();
      batch = writeBatch(db);
      n = 0;
    }
  }
  if (n > 0) {
    await batch.commit();
  }
  return deleted;
}

/**
 * refCollection 필드가 없는 레거시 문서만 정리 (refId 단독, 최후 수단)
 */
export async function deleteActivitiesByRefIdLegacy(refId: string): Promise<number> {
  const q = query(collection(db, "activities"), where("refId", "==", refId));
  const snap = await getDocs(q);
  const legacy = snap.docs.filter((d) => d.data().refCollection == null);
  let batch = writeBatch(db);
  let n = 0;
  let deleted = 0;
  for (const d of legacy) {
    batch.delete(d.ref);
    n++;
    deleted++;
    if (n >= BATCH_MAX) {
      await batch.commit();
      batch = writeBatch(db);
      n = 0;
    }
  }
  if (n > 0) await batch.commit();
  return deleted;
}
