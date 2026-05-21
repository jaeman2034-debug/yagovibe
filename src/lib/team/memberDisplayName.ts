/**
 * 팀 멤버 목록 등에서 표시용 이름 해석 (uid·docId를 그대로 노출하지 않음)
 */

export const FALLBACK_MEMBER_DISPLAY_NAME = "이름 정보 없음";

/** Firestore 멤버/users 문서에서 표시용 이름 후보 수집 */
export function pickDisplayNameFromRecord(data: Record<string, unknown> | undefined): string {
  if (!data) return "";
  const keys = ["name", "displayName", "userName", "nickname", "fullName", "profileName"] as const;
  for (const k of keys) {
    const v = data[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const email = data.email;
  if (typeof email === "string" && email.includes("@")) {
    const local = email.split("@")[0]?.trim();
    if (local) return local;
  }
  return "";
}
