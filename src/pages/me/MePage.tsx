/**
 * 🔥 /me 페이지 (Persona 기반 완전 재구성)
 * 
 * 핵심 원칙:
 * - Persona 기반 분기 (P0 ~ P4)
 * - IdentityHeader는 항상 렌더링
 * - PersonaSection은 Persona별로 분기
 * - OpportunitySection은 조건부 CTA 유도
 * - 절대 Empty State 없음 (모든 상태가 정상 분기)
 */

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collectionGroup, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthProvider";
import { toast } from "sonner";
import { useNotificationsRealtime } from "@/hooks/useNotificationsRealtime";
import { markNotificationAsRead } from "@/lib/notification/markAsRead";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useMyTeams } from "@/hooks/useMyTeams";
import { useMyTournamentApplications } from "@/hooks/useMyTournamentApplications";
import { useMeStats } from "@/hooks/useMeStats";
import { useMyPendingJoinRequests } from "@/hooks/useMyPendingJoinRequests";
import { isAdminUser } from "@/utils/auditLog";
import { resolvePersona } from "@/components/ui/personas/resolvePersona";
import type { Persona } from "@/components/ui/personas/types";
import { getUserState, type UserState } from "@/utils/userState";
import { HubLayout } from "@/components/ui/layout/HubLayout";
import { PersonaSection as UIPersonaSection } from "@/components/ui/layout/PersonaSection";
import { OpportunitySection as UIOpportunitySection } from "@/components/ui/layout/OpportunitySection";
import { MeIdentityHeader } from "@/components/me/MeIdentityHeader";
import { PersonaSection } from "@/components/me/PersonaSection";
import { OpportunitySection } from "@/components/me/OpportunitySection";
import { MeSkeleton } from "@/components/me/MeSkeleton";
import { db } from "@/lib/firebase";

type MyFederationTeam = {
  id: string;
  name: string;
  createdBy?: string;
  members?: string[];
};
type MyFederationMatch = {
  id: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeam?: string;
  awayTeam?: string;
  status?: "scheduled" | "live" | "completed";
  matchDate?: string;
  matchTime?: string;
  venueName?: string;
  homeScore?: number | null;
  awayScore?: number | null;
};
type MyFederationNotification = {
  id: string;
  title: string;
  message: string;
  type?: string;
  targetTeamId?: string | null;
  targetUserId?: string | null;
  createdAt?: any;
};

export default function MePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  
  // 🔥 /me/in-app/... 잘못된 경로 리다이렉트 처리
  useEffect(() => {
    if (location.pathname.startsWith('/me/in-app/')) {
      const correctPath = location.pathname.replace('/me/in-app', '/in-app');
      console.log('🔧 [MePage] 잘못된 경로 감지, 리다이렉트:', location.pathname, '→', correctPath);
      navigate(correctPath, { replace: true });
      return;
    }
  }, [location.pathname, navigate]);

  // 🔥 권한 가드 리다이렉트 시 토스트 메시지 표시
  useEffect(() => {
    const state = location.state as { showToast?: string } | null;
    if (state?.showToast) {
      toast.info(state.showToast);
      // state 초기화 (뒤로 가기 시 재표시 방지)
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location]);

  // 🔥 알림 실시간 구독 (다른 훅보다 먼저 선언)
  const { notifications } = useNotificationsRealtime({ enabled: true, limitCount: 5, unreadOnly: false });

  // 🔥 처리된 알림 ID 추적 (중복 표시 방지)
  const [processedNotificationIds, setProcessedNotificationIds] = useState<Set<string>>(new Set());
  const [myFederationTeams, setMyFederationTeams] = useState<MyFederationTeam[]>([]);
  const [myFederationMatches, setMyFederationMatches] = useState<MyFederationMatch[]>([]);
  const [myFederationNotifications, setMyFederationNotifications] = useState<MyFederationNotification[]>([]);
  const [myTeamNameMap, setMyTeamNameMap] = useState<Record<string, string>>({});

  // 🔥 알림 처리: 읽지 않은 팀 관련 알림 토스트 표시 (한 번만)
  useEffect(() => {
    if (!notifications.length || !user) return;

    const unreadTeamNotifications = notifications.filter(
      (n) => !n.isRead && 
      !processedNotificationIds.has(n.id) && // 이미 처리된 알림 제외
      (n.type === 'TEAM_JOIN_APPROVED' || 
       n.type === 'TEAM_CAPTAIN_DELEGATED' || 
       n.type === 'TEAM_MEMBER_REMOVED' ||
       n.type === 'ASSOCIATION_JOINED')
    );

    // 최신 알림 하나만 처리 (중복 방지)
    const latestNotification = unreadTeamNotifications[0];
    if (!latestNotification) return;

    // 알림 타입별 토스트 메시지
    let toastMessage = '';
    let toastType: 'success' | 'info' | 'error' = 'info';

    switch (latestNotification.type) {
      case 'TEAM_JOIN_APPROVED':
        toastMessage = '팀 가입이 승인되었어요 🎉';
        toastType = 'success';
        break;
      case 'TEAM_CAPTAIN_DELEGATED':
        // 알림 메시지에 따라 다른 토스트 표시
        if (latestNotification.message?.includes('위임되었어요')) {
          // 새 팀장: "🛡️ {팀명}의 팀장으로 위임되었어요. 이제 팀을 관리할 수 있어요."
          toastMessage = '팀장이 되었어요 👑';
          toastType = 'info';
        } else if (latestNotification.message?.includes('권한이 위임되었어요')) {
          // 이전 팀장: "ℹ️ {팀명}의 팀장 권한이 위임되었어요. 현재는 팀원으로 활동 중이에요."
          toastMessage = '팀장 권한이 위임되었어요';
          toastType = 'info';
        } else {
          // 기본값
          toastMessage = '팀장이 되었어요 👑';
          toastType = 'info';
        }
        break;
      case 'TEAM_MEMBER_REMOVED':
        toastMessage = '팀에서 제외되었어요.';
        toastType = 'info';
        break;
      case 'ASSOCIATION_JOINED':
        toastMessage = '🏆 우리 팀이 협회에 가입했어요!';
        toastType = 'success';
        break;
    }

    if (toastMessage) {
      // 처리된 알림 ID에 추가 (중복 방지)
      setProcessedNotificationIds(prev => new Set(prev).add(latestNotification.id));

      // 토스트 표시
      if (toastType === 'success') {
        toast.success(toastMessage);
      } else {
        toast.info(toastMessage);
      }

      // 알림 읽음 처리
      markNotificationAsRead(latestNotification.id).catch((error) => {
        console.error('알림 읽음 처리 실패:', error);
      });
    }
  }, [notifications, user, processedNotificationIds]);
  
  // 🔥 PR 2: 데이터 훅 직접 호출 (Persona 판단 로직은 resolvePersona에만)
  const profile = useMyProfile();
  const teams = useMyTeams();
  const applications = useMyTournamentApplications();
  const stats = useMeStats();
  const isPlatformAdmin = isAdminUser();
  const { requests: pendingRequests } = useMyPendingJoinRequests();

  // 🔥 상태 머신: 유저 상태 계산 (단일 진실 소스)
  const userState: UserState = getUserState({
    teams: teams.teamMembers,
    pendingRequests,
  });
  const myTeamIds = new Set([
    ...teams.teamMembers.map((t: any) => String(t.teamId || t.id || "")),
    ...myFederationTeams.map((t) => t.id),
  ].filter(Boolean));
  const myTeamNames = new Set([
    ...teams.teamMembers.map((t: any) => String(t.teamName || t.name || "")),
    ...myFederationTeams.map((t) => t.name),
  ].filter(Boolean));

  useEffect(() => {
    const ids = teams.teamIds || [];
    if (!ids.length) {
      setMyTeamNameMap({});
      return;
    }
    let cancelled = false;
    void Promise.all(
      ids.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, "teams", id));
          if (!snap.exists()) return [id, `팀`] as const;
          const n = (snap.data() as { name?: string })?.name;
          return [id, String(n || "팀")] as const;
        } catch {
          return [id, "팀"] as const;
        }
      })
    ).then((entries) => {
      if (!cancelled) setMyTeamNameMap(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [teams.teamIds]);

  useEffect(() => {
    if (!user?.uid) {
      setMyFederationTeams([]);
      return;
    }
    const q = query(collectionGroup(db, "teams"), where("createdBy", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const rows: MyFederationTeam[] = snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          name: String(x?.name || "팀"),
          createdBy: typeof x?.createdBy === "string" ? x.createdBy : "",
          members: Array.isArray(x?.members) ? x.members : [],
        };
      });
      setMyFederationTeams(rows);
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setMyFederationMatches([]);
      return;
    }
    const unsub = onSnapshot(collectionGroup(db, "matches"), (snap) => {
      const rows: MyFederationMatch[] = snap.docs
        .map((d) => {
          const x = d.data() as any;
          return {
            id: d.id,
            homeTeamId: typeof x?.homeTeamId === "string" ? x.homeTeamId : "",
            awayTeamId: typeof x?.awayTeamId === "string" ? x.awayTeamId : "",
            homeTeam: String(x?.homeTeam || ""),
            awayTeam: String(x?.awayTeam || ""),
            status: x?.status === "live" || x?.status === "completed" ? x.status : "scheduled",
            matchDate: typeof x?.matchDate === "string" ? x.matchDate : "",
            matchTime: typeof x?.matchTime === "string" ? x.matchTime : "",
            venueName: typeof x?.venueName === "string" ? x.venueName : "",
            homeScore: typeof x?.homeScore === "number" ? x.homeScore : null,
            awayScore: typeof x?.awayScore === "number" ? x.awayScore : null,
          };
        })
        .filter((m) => {
          const byId =
            (m.homeTeamId && myTeamIds.has(m.homeTeamId)) ||
            (m.awayTeamId && myTeamIds.has(m.awayTeamId));
          const byName =
            (m.homeTeam && myTeamNames.has(m.homeTeam)) ||
            (m.awayTeam && myTeamNames.has(m.awayTeam));
          return !!(byId || byName);
        })
        .sort((a, b) => `${a.matchDate || ""} ${a.matchTime || ""}`.localeCompare(`${b.matchDate || ""} ${b.matchTime || ""}`));
      setMyFederationMatches(rows);
    });
    return () => unsub();
  }, [user?.uid, teams.teamMembers, myFederationTeams]);

  useEffect(() => {
    if (!user?.uid) {
      setMyFederationNotifications([]);
      return;
    }
    const unsub = onSnapshot(collectionGroup(db, "notifications"), (snap) => {
      const rows: MyFederationNotification[] = snap.docs
        .map((d) => {
          const x = d.data() as any;
          return {
            id: d.id,
            title: String(x?.title || "알림"),
            message: String(x?.message || ""),
            type: typeof x?.type === "string" ? x.type : "",
            targetTeamId: typeof x?.targetTeamId === "string" ? x.targetTeamId : null,
            targetUserId: typeof x?.targetUserId === "string" ? x.targetUserId : null,
            createdAt: x?.createdAt || null,
          };
        })
        .filter((n) => n.targetUserId === user.uid || (n.targetTeamId && myTeamIds.has(n.targetTeamId)) || !n.targetUserId)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 20);
      setMyFederationNotifications(rows);
    });
    return () => unsub();
  }, [user?.uid, teams.teamMembers, myFederationTeams]);
  
  // 🔥 PR 2: 로딩 상태 (데이터 훅이 로딩 중)
  if (profile.loading || teams.loading || applications.isLoading || stats.loading) {
    return <MeSkeleton />;
  }
  
  // 🔥 PR 2: 로그인 여부 체크
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900 mb-2">로그인이 필요합니다</p>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }
  
  // 🔥 PR 2: Persona 판단 (resolvePersona만 사용, 조건문 없음)
  const persona: Persona = resolvePersona({
    isLoggedIn: true,
    hasProfile: profile.hasProfile,
    teamCount: teams.teamCount,
    applicationCount: applications.applications.length,
    role: isPlatformAdmin ? "ADMIN" : "USER",
  });
  
  // PR 2: PersonaData (PersonaSection에 전달용)
  const personaData = {
    hasTeam: teams.hasTeams,
    isTeamCaptain: teams.teamMembers.some(
      (tm) => tm.role === "admin" || tm.accessLevel === "OWNER"
    ),
    isAssociationAdmin: isPlatformAdmin,
    hasApplications: applications.applications.length > 0,
    profileComplete: profile.hasProfile,
    teamCount: teams.teamCount,
    applicationCount: applications.applications.length,
  };

  // 🔥 PR 2: ANON 처리 (이론적으로는 위에서 이미 처리되지만 방어 코드)
  if (persona === "ANON") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900 mb-2">로그인이 필요합니다</p>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }
  
  // 🔥 PR 2: 에러 분기 없음
  // 모든 에러는 데이터 훅에서 빈 배열/기본값으로 흡수됨
  // 여기까지 왔다는 건 100% 안전한 상태
  // /me 안에는 비즈니스 판단 로직이 남아 있으면 안 된다
  const handleSettings = () => {
    navigate("/me/settings");
  };
  
  const handleLogout = async () => {
    if (confirm("로그아웃하시겠습니까?")) {
      await logout();
      navigate("/");
    }
  };
  
  const handleCreateTeam = () => {
    // 🔥 mode=non-member 파라미터 추가: 바로 팀 생성 폼으로 이동 (선택 화면 스킵)
    navigate("/sports/soccer/team/create?mode=non-member");
  };
  
  const handleJoinTeam = () => {
    navigate("/teams/find");
  };
  
  const handleApplyTournament = () => {
    navigate("/tournaments");
  };

  const handleCoachDashboard = () => {
    // 🔥 첫 번째 팀의 대시보드로 이동
    if (teams.teams.length > 0) {
      const firstTeam = teams.teams[0];
      const teamId = String(firstTeam.teamId || firstTeam.id || "").trim();
      if (!teamId) {
        handleCreateTeam();
        return;
      }
      navigate(`/coach/dashboard/${encodeURIComponent(teamId)}`);
    } else {
      // 팀이 없으면 팀 만들기로 유도
      handleCreateTeam();
    }
  };
  const today = new Date().toISOString().slice(0, 10);
  const todayMatches = myFederationMatches.filter((m) => m.matchDate === today);
  
  // 🔥 STEP 15B: HubLayout 사용 (3-Layer 고정 구조)
  return (
    <HubLayout
      header={
        <MeIdentityHeader
          user={user}
          persona={persona}
          stats={{
            teamCount: stats.teamCount,
            tournamentCount: stats.tournamentCount,
            recordCount: stats.recordCount,
          }}
          onSettings={handleSettings}
          onLogout={handleLogout}
          onCreateTeam={handleCreateTeam}
          onCoachDashboard={handleCoachDashboard}
        />
      }
      persona={
        <UIPersonaSection
          persona={persona}
          map={{
            ANON: null,
            P0: <PersonaSection persona={persona} personaData={personaData} navigate={navigate} />,
            P1: <PersonaSection persona={persona} personaData={personaData} navigate={navigate} />,
            P2: <PersonaSection persona={persona} personaData={personaData} navigate={navigate} />,
            P3: <PersonaSection persona={persona} personaData={personaData} navigate={navigate} />,
            P4: <PersonaSection persona={persona} personaData={personaData} navigate={navigate} />,
          }}
        />
      }
      opportunity={
        <UIOpportunitySection
          persona={persona}
          map={{
            P1: (
              <OpportunitySection
                persona="P1"
                onCreateTeam={handleCreateTeam}
                onJoinTeam={handleJoinTeam}
                onApplyTournament={handleApplyTournament}
              />
            ),
            P3: (
              <OpportunitySection
                persona="P3"
                onCreateTeam={handleCreateTeam}
                onJoinTeam={handleJoinTeam}
                onApplyTournament={handleApplyTournament}
              />
            ),
          }}
        />
      }
      children={
        <section className="px-4 pb-8">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="rounded-xl border bg-white p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-gray-900">내 팀</h2>
                <button
                  type="button"
                  className="text-sm font-medium text-blue-600 hover:underline"
                  onClick={() => navigate("/my-teams")}
                >
                  전체 보기
                </button>
              </div>
              {teams.teamIds.length === 0 && myFederationTeams.length === 0 ? (
                <p className="text-sm text-gray-600">연결된 팀이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {[...new Set([...teams.teamIds, ...myFederationTeams.map((x) => x.id)])].map((id) => {
                    const label =
                      myTeamNameMap[id] ||
                      myFederationTeams.find((x) => x.id === id)?.name ||
                      "팀";
                    return (
                      <button
                        key={id}
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-100"
                        onClick={() => navigate(`/team/${id}`)}
                      >
                        <span>{label}</span>
                        <span className="text-xs text-gray-400">팀 홈</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border bg-white p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-2">내 경기</h2>
              <h3 className="text-sm font-semibold text-red-500 mb-2">🔥 오늘 경기</h3>
              {todayMatches.length === 0 ? (
                <p className="text-sm text-gray-600 mb-3">오늘 예정된 경기가 없습니다.</p>
              ) : (
                <div className="space-y-2 mb-3">
                  {todayMatches.map((m) => (
                    <div key={`today-${m.id}`} className="rounded border p-2 text-sm">
                      <div className="font-medium text-gray-900">{m.homeTeam} vs {m.awayTeam}</div>
                      <div className="text-xs text-gray-600 mt-1">{m.matchDate} {m.matchTime || "--:--"} · {m.venueName || "구장 미정"}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                {myFederationMatches.slice(0, 20).map((m) => (
                  <div key={m.id} className="rounded border p-2 flex items-center justify-between gap-2 text-sm">
                    <div>
                      <div className="font-medium text-gray-900">{m.homeTeam} vs {m.awayTeam}</div>
                      <div className="text-xs text-gray-600">{m.matchDate || "-"} {m.matchTime || "--:--"}</div>
                    </div>
                    <div className="text-right">
                      {m.status === "completed" && (
                        <div className="text-sm font-semibold text-gray-800">{m.homeScore ?? 0} : {m.awayScore ?? 0}</div>
                      )}
                      <span className={m.status === "live" ? "text-red-500 text-xs font-semibold" : m.status === "completed" ? "text-gray-500 text-xs" : "text-blue-500 text-xs"}>
                        {m.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-2">알림</h2>
              {myFederationNotifications.length === 0 ? (
                <p className="text-sm text-gray-600">새 알림이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {myFederationNotifications.map((n) => (
                    <div key={n.id} className="rounded border p-2 text-sm">
                      <div className="font-medium text-gray-900">{n.title}</div>
                      <div className="text-xs text-gray-600 mt-1">{n.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      }
    />
  );
}
