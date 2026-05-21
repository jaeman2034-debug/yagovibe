import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AppCard } from "@/components/ui/AppCard";
import { Button } from "@/components/ui/button";
import { useSportsHubUser } from "@/context/SportsHubUserContext";
import { db } from "@/lib/firebase";
import { publicInviteLandingUrlStrict } from "@/lib/growth/teamInviteShare";
import { createTeamInviteLink } from "@/lib/team/teamInviteLink";
import type { UserStage } from "@/lib/sportsHubRecommendation";
import { track } from "@/lib/analytics";

type Role = "owner" | "other" | "unknown";

/**
 * 11단계 성장 — 팀 초대 링크(`inviteLinks` + `/invite/:id`)를 허브에서 바로 만들고 복사
 */
export function SportsHubGrowthInviteCard({ stage }: { stage: Exclude<UserStage, "NEW"> }) {
  const navigate = useNavigate();
  const { user, userState, primaryTeamId, primaryTeamName } = useSportsHubUser();

  const [role, setRole] = useState<Role>("unknown");
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const teamLabel = primaryTeamName?.trim() || "우리 팀";

  useEffect(() => {
    let cancelled = false;
    if (!user?.uid || !primaryTeamId || !userState.hasTeam) {
      setRole("unknown");
      setInviteId(null);
      return;
    }

    (async () => {
      try {
        const teamSnap = await getDoc(doc(db, "teams", primaryTeamId));
        if (cancelled) return;
        if (!teamSnap.exists()) {
          setRole("unknown");
          return;
        }
        const ownerUid = (teamSnap.data() as { ownerUid?: string }).ownerUid;
        setRole(ownerUid === user.uid ? "owner" : "other");

        const q = query(
          collection(db, "inviteLinks"),
          where("teamId", "==", primaryTeamId),
          where("isActive", "==", true)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        if (!snap.empty) {
          setInviteId(snap.docs[0].id);
        } else {
          setInviteId(null);
        }
      } catch {
        if (!cancelled) {
          setRole("unknown");
          setInviteId(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, primaryTeamId, userState.hasTeam]);

  const refreshInviteId = useCallback(async () => {
    if (!primaryTeamId) return;
    const q = query(
      collection(db, "inviteLinks"),
      where("teamId", "==", primaryTeamId),
      where("isActive", "==", true)
    );
    const snap = await getDocs(q);
    if (!snap.empty) setInviteId(snap.docs[0].id);
  }, [primaryTeamId]);

  const handleCreateAndCopy = useCallback(async () => {
    if (!user?.uid || !primaryTeamId || role !== "owner") return;
    setBusy(true);
    try {
      let id = inviteId;
      if (!id) {
        id = await createTeamInviteLink(primaryTeamId, user.uid, {
          teamName: primaryTeamName?.trim() || undefined,
        });
        setInviteId(id);
      }
      const url = publicInviteLandingUrlStrict(id);
      await navigator.clipboard.writeText(url);
      void track("team_invite_link_copied", { teamId: primaryTeamId, source: "sports_hub" });
      toast.success("초대 링크를 복사했어요. 카톡·문자로 보내 보세요!");
    } catch (e) {
      console.warn("[SportsHubGrowthInviteCard] 초대 링크 실패:", e);
      toast.error("링크를 만들 수 없어요. 팀장 계정인지 확인해 주세요.");
    } finally {
      setBusy(false);
      void refreshInviteId();
    }
  }, [user?.uid, primaryTeamId, role, inviteId, refreshInviteId]);

  const handleCopyOnly = useCallback(async () => {
    if (!inviteId || !primaryTeamId) return;
    try {
      await navigator.clipboard.writeText(publicInviteLandingUrlStrict(inviteId));
      void track("team_invite_link_copied", { teamId: primaryTeamId, source: "sports_hub" });
      toast.success("초대 링크를 복사했어요!");
    } catch {
      toast.error("복사에 실패했어요.");
    }
  }, [inviteId, primaryTeamId]);

  if (!user?.uid || !userState.hasTeam || !primaryTeamId) return null;

  return (
    <AppCard className="mb-6 border-indigo-100 bg-gradient-to-br from-indigo-50/90 to-white dark:border-indigo-900/40 dark:from-indigo-950/30 dark:to-gray-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800 dark:text-indigo-200">
        함께하면 커져요
      </p>
      <h3 className="mt-1 text-sm font-bold text-gray-900 dark:text-gray-50">
        {teamLabel} — 팀원 초대
      </h3>
      <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
        스포츠는 혼자보다 같이 할 때 가치가 커집니다. 링크 하나로 가입 요청까지 이어집니다.
      </p>

      {role === "owner" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={() => void handleCreateAndCopy()}>
            {inviteId ? "초대 링크 복사" : "초대 링크 만들고 복사"}
          </Button>
          {inviteId ? (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void handleCopyOnly()}>
              다시 복사
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            초대 링크는 팀장이 발급할 수 있어요. 팀 페이지에서 합류를 요청하거나 팀장에게 링크를 받아 보세요.
          </p>
          <Button type="button" size="sm" variant="secondary" onClick={() => navigate(`/app/team/${encodeURIComponent(primaryTeamId)}`)}>
            팀 페이지로 이동
          </Button>
        </div>
      )}

      {stage === "SETUP" ? (
        <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-500">
          경기·채팅을 제대로 돌리려면 팀원이 몇 명이라도 붙어 있는 게 좋아요.
        </p>
      ) : null}
    </AppCard>
  );
}
