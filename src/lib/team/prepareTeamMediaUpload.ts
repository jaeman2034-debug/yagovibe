import { ensureTeamMediaUploadAccess } from "@/lib/team/ensureTeamMediaUploadAccess";
import { backfillMyTeamMemberships } from "@/lib/team/backfillMyTeamMemberships";
import { devWarn } from "@/lib/utils/dev";

/**
 * 업로드 직전 멤버십 보장 — 팀 단위(우선) → 전체 백필(폴백, owner 쿼리 우선 실행됨).
 */
export async function prepareTeamMediaUpload(teamId: string): Promise<void> {
  const tid = teamId.trim();
  if (!tid) return;

  try {
    await ensureTeamMediaUploadAccess(tid);
    return;
  } catch (e) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code?: string }).code)
        : "";
    if (code === "functions/not-found") {
      devWarn("[prepareTeamMediaUpload] ensureTeamMediaUploadAccess 미배포");
    } else {
      devWarn("[prepareTeamMediaUpload] ensure 실패, backfill 시도", e);
    }
  }

  try {
    await backfillMyTeamMemberships();
  } catch (e) {
    devWarn("[prepareTeamMediaUpload] backfill 실패 (서버 업로드로 계속 시도 가능)", e);
  }
}
