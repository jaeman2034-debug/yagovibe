import * as admin from "firebase-admin";

/** `teams/{teamId}` 운영 활동 시각 — Admin KPI `activeTeams7d` 등에 사용 */
export function teamDocumentActivityPatch(): Record<string, unknown> {
  return { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
}
