/**
 * ✅ COMMIT 17: 테넌트 목록 조회
 * _tenants 컬렉션에서 tenantId 목록을 읽어옴
 */

import * as admin from "firebase-admin";

const db = admin.firestore();

export async function listTenants(): Promise<string[]> {
  const snap = await db.collection("_tenants").limit(200).get();
  if (snap.empty) return [];
  return snap.docs.map((d) => String((d.data() as any).tenantId ?? d.id));
}

