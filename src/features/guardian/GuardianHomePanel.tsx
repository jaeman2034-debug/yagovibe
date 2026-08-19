import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useParentTeamIds } from "@/hooks/useParentTeamIds";
import { db } from "@/lib/firebase";
import { readParentLinksForTeam, type ParentLinkRow } from "@/lib/team/parentLinksRead";
import { readPlayers } from "@/lib/team/teamMemberRead";
import { ParentHomeGrowthCardV2 } from "@/components/ai-growth/ParentHomeGrowthCardV2";
import { ParentGrowthNotificationFeed } from "@/components/ai-growth/ParentGrowthNotificationFeed";
import { ParentGrowthRiskWarningCard } from "@/components/ai-growth/ParentGrowthRiskWarningCard";
import { readAcademyPlayers } from "@/lib/team/academyPlayersRead";
import { ParentVisionHomeSummaryCard } from "@/components/vision/parent/ParentVisionHomeSummaryCard";

type TeamGuardianSummary = {
  teamId: string;
  teamName: string;
  links: ParentLinkRow[];
};

function playerDisplayName(playerUid: string, rosterNames: Map<string, string>): string {
  return rosterNames.get(playerUid) ?? "자녀";
}

function mergeAcademyNames(
  rosterMap: Map<string, string>,
  academyPlayers: Awaited<ReturnType<typeof readAcademyPlayers>>
): Map<string, string> {
  const merged = new Map(rosterMap);
  for (const p of academyPlayers) {
    merged.set(p.playerId, p.displayName);
  }
  return merged;
}

export default function GuardianHomePanel() {
  const { user } = useAuth();
  const { parentTeamIds, loading: parentTeamsLoading } = useParentTeamIds();
  const [summaries, setSummaries] = useState<TeamGuardianSummary[]>([]);
  const [rosterByTeam, setRosterByTeam] = useState<Record<string, Map<string, string>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || parentTeamIds.length === 0) {
      setSummaries([]);
      setRosterByTeam({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const next: TeamGuardianSummary[] = [];
      const names: Record<string, Map<string, string>> = {};

      for (const teamId of parentTeamIds) {
        const [links, teamSnap, roster, academyPlayers] = await Promise.all([
          readParentLinksForTeam(teamId),
          getDoc(doc(db, "teams", teamId)),
          readPlayers(teamId),
          readAcademyPlayers(teamId),
        ]);
        const mine = links.filter((l) => l.parentUid === user.uid);
        const teamName = String(teamSnap.data()?.name ?? teamId);
        next.push({ teamId, teamName, links: mine });

        const map = new Map<string, string>();
        for (const r of roster) {
          map.set(r.memberDocumentId, r.displayName);
          if (r.billingUid) map.set(r.billingUid, r.displayName);
          if (r.linkedAuthUid) map.set(r.linkedAuthUid, r.displayName);
        }
        names[teamId] = mergeAcademyNames(map, academyPlayers);
      }

      if (!cancelled) {
        setSummaries(next);
        setRosterByTeam(names);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, parentTeamIds.join("|")]);

  if (parentTeamsLoading || loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        보호자 홈 불러오는 중…
      </div>
    );
  }

  if (parentTeamIds.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
        <p>보호자로 등록된 팀이 없습니다.</p>
        <Link to="/my-teams" className="mt-2 inline-block text-sm font-medium text-blue-600 underline">
          내 팀 목록
        </Link>
      </div>
    );
  }

  const activeLinkCount = summaries.reduce(
    (n, s) => n + s.links.filter((l) => l.status === "active").length,
    0
  );

  const firstActiveChild = summaries.flatMap((team) =>
    team.links
      .filter((l) => l.status === "active")
      .map((link) => ({
        teamId: team.teamId,
        playerId: link.playerUid,
        playerName: playerDisplayName(link.playerUid, rosterByTeam[team.teamId] ?? new Map()),
      }))
  )[0];

  return (
    <div className="mt-6 space-y-4" data-testid="guardian-home-panel">
      <ParentVisionHomeSummaryCard
        teamId={firstActiveChild?.teamId}
        playerId={firstActiveChild?.playerId}
        playerName={firstActiveChild?.playerName}
      />
      <ParentGrowthNotificationFeed />
      <ParentHomeGrowthCardV2 />
      <ParentGrowthRiskWarningCard />

      <p className="text-xs font-medium text-slate-600">
        연결된 자녀 {activeLinkCount}명 · 팀 {summaries.length}개
      </p>

      {summaries.map((team) => {
        const nameMap = rosterByTeam[team.teamId] ?? new Map();
        const activeChildren = team.links.filter((l) => l.status === "active");
        const pendingChildren = team.links.filter((l) => l.status === "pending");

        return (
          <section
            key={team.teamId}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <h2 className="text-base font-semibold text-gray-900">{team.teamName}</h2>
            <div className="mt-3 space-y-2">
              {activeChildren.map((link) => (
                <div
                  key={link.linkId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {playerDisplayName(link.playerUid, nameMap)}
                    </p>
                    <p className="text-[11px] text-slate-500">연결됨 · 회비·출석 조회 가능</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/team/${encodeURIComponent(team.teamId)}?tab=guardian`}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      회비 보기
                    </Link>
                    <Link
                      to={`/team/${encodeURIComponent(team.teamId)}?tab=attendance`}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
                    >
                      출석
                    </Link>
                  </div>
                </div>
              ))}
              {pendingChildren.map((link) => (
                <div key={link.linkId} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                  {playerDisplayName(link.playerUid, nameMap)} — 초대 수락 대기
                  <Link
                    to={`/team/${encodeURIComponent(team.teamId)}?tab=roster`}
                    className="ml-2 font-semibold text-indigo-700 underline"
                  >
                    명단에서 수락
                  </Link>
                </div>
              ))}
              {activeChildren.length === 0 && pendingChildren.length === 0 ? (
                <p className="text-xs text-slate-500">이 팀에 연결된 자녀가 없습니다.</p>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Link
                to={`/team/${encodeURIComponent(team.teamId)}?tab=schedule`}
                className="text-indigo-700 underline"
              >
                일정
              </Link>
              <Link to={`/team/${encodeURIComponent(team.teamId)}`} className="text-indigo-700 underline">
                팀 공지
              </Link>
            </div>
          </section>
        );
      })}
    </div>
  );
}
