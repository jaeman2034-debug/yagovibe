/**
 * 팀 삭제 danger zone — `deleteTeam` + `canDeleteTeam` (owner only).
 * SettingsTab · TeamSettingsModal 등에서 공유.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import { canDeleteTeam } from "@/lib/team/permissions";
import { deleteTeam } from "@/lib/team/deleteTeam";

const DELETE_CONFIRM_MESSAGE =
  "정말 팀을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.\n\n삭제되는 데이터:\n- 팀 문서\n- 모든 팀원 정보\n- 팀 관련 활동\n- 초대 링크";

type TeamDeleteDangerZoneProps = {
  teamId: string;
  /** 삭제 성공 후 추가 동작 (모달 닫기 등) */
  onDeleted?: () => void;
  /** 설정 후 이동할 경로. 미지정 시 이동하지 않음 */
  redirectTo?: string;
  layout?: "section" | "compact";
};

export function TeamDeleteDangerZone({
  teamId,
  onDeleted,
  redirectTo,
  layout = "section",
}: TeamDeleteDangerZoneProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [canDelete, setCanDelete] = useState(false);
  const [permLoading, setPermLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user?.uid || !teamId) {
        setCanDelete(false);
        setPermLoading(false);
        return;
      }
      setPermLoading(true);
      try {
        const ok = await canDeleteTeam(user.uid, teamId);
        if (alive) setCanDelete(ok);
      } catch {
        if (alive) setCanDelete(false);
      } finally {
        if (alive) setPermLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [teamId, user?.uid]);

  const handleDelete = async () => {
    if (!user?.uid || !canDelete) return;
    if (!window.confirm(DELETE_CONFIRM_MESSAGE)) return;

    setDeleting(true);
    try {
      await deleteTeam(teamId, user.uid);
      toast.success("팀이 완전히 삭제되었습니다.");
      onDeleted?.();
      if (redirectTo) {
        navigate(redirectTo, { replace: true });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "팀 삭제에 실패했습니다.";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  if (permLoading || !canDelete) return null;

  if (layout === "compact") {
    return (
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        <span>팀 삭제</span>
      </button>
    );
  }

  return (
    <div
      id="team-delete-danger-zone"
      className="rounded-lg border border-red-200 bg-red-50/50 p-6 shadow-sm"
    >
      <h3 className="text-lg font-semibold text-red-900">위험 구역</h3>
      <p className="mt-1 text-sm text-red-800/90">
        팀을 삭제하면 팀 문서, 멤버, 활동, 초대 링크가 모두 제거됩니다. 되돌릴 수 없습니다.
      </p>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="mt-4 flex items-center gap-2 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        {deleting ? "삭제 중..." : "팀 영구 삭제"}
      </button>
    </div>
  );
}
