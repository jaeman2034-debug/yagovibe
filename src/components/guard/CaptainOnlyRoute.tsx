/**
 * 🔥 CaptainOnlyRoute - 팀장 전용 라우트 가드
 * 
 * 역할:
 * - 팀장(P3)만 접근 가능
 * - 팀원(P2) 접근 시 /me로 리다이렉트 + 토스트 메시지
 * - URL 직접 입력해도 차단
 * 
 * 권한 체크:
 * - isCaptain = role === "owner" || role === "admin"
 * - 과도기: accessLevel === "OWNER" fallback (마이그레이션 완료 후 제거 예정)
 * 
 * 사용법:
 * <Route
 *   path="/teams/:teamId/manage"
 *   element={
 *     <CaptainOnlyRoute>
 *       <TeamManagePage />
 *     </CaptainOnlyRoute>
 *   }
 * />
 */

import { ReactNode, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { useMyTeams } from '@/hooks/useMyTeams';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isCaptain } from '@/lib/team/roleConstants';

interface CaptainOnlyRouteProps {
  children: ReactNode;
}

export function CaptainOnlyRoute({ children }: CaptainOnlyRouteProps) {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { teamMembers, loading: teamsLoading } = useMyTeams();
  const [checkingTeam, setCheckingTeam] = useState(false);
  // 상태 변수는 유틸 함수 isCaptain과 이름 충돌을 피해야 함
  const [hasCaptainRole, setHasCaptainRole] = useState<boolean | null>(null);

  // 로그인 체크
  if (authLoading) {
    return null; // 로딩 중
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-none text-center md:mx-auto md:max-w-3xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-4">팀 관리 기능은 로그인 후 이용할 수 있어요.</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition"
          >
            로그인하러 가기
          </button>
        </div>
      </div>
    );
  }

  // teamId가 없으면 /me로 리다이렉트
  if (!teamId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-none text-center md:mx-auto md:max-w-3xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">팀 정보가 필요합니다</h2>
          <p className="text-gray-600 mb-4">올바른 팀 경로로 다시 접속해 주세요.</p>
          <button
            onClick={() => navigate('/me', { replace: true })}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black active:scale-[0.98] transition"
          >
            마이 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  // 팀장 권한: SoT(teams/.../members) 우선 → team_members·상태머신·teams.ownerUid 순 (TeamHome isOwner 과 정합)
  useEffect(() => {
    console.log("🔍 [CaptainOnlyRoute] 권한 체크 시작:", {
      teamId,
      userId: user?.uid,
      teamsLoading,
      /** `useMyTeams` 소속 팀 목록 개수(팀 로스터 인원 아님) */
      myTeamMembershipsCount: teamMembers.length,
      myTeamMemberships: teamMembers.map((tm) => ({
        teamId: tm.teamId,
        role: tm.role,
        accessLevel: tm.accessLevel,
      })),
    });

    if (teamsLoading || !teamId || !user) {
      console.log("⏭️ [CaptainOnlyRoute] 체크 스킵:", { teamsLoading, teamId, user: !!user });
      setHasCaptainRole(null);
      return;
    }

    let cancelled = false;
    setCheckingTeam(true);

    void (async () => {
      try {
        const hubSnap = await getDoc(doc(db, "teams", teamId, "members", user.uid));
        if (cancelled) return;
        if (hubSnap.exists()) {
          const data = hubSnap.data();
          const role = typeof data.role === "string" ? data.role : undefined;
          const al = typeof data.accessLevel === "string" ? data.accessLevel : undefined;
          if (isCaptain(role) || al === "OWNER") {
            console.log("✅ [CaptainOnlyRoute] SoT members 문서로 팀장·운영진 확인");
            setHasCaptainRole(true);
            return;
          }
        }

        // useMyTeams 결과에서 현재 teamId의 팀장/운영진 여부를 바로 판정
        const captainInMembers = teamMembers.some(
          (tm) =>
            tm.teamId === teamId &&
            (isCaptain(tm.role) || tm.accessLevel === "OWNER")
        );

        if (captainInMembers) {
          setHasCaptainRole(true);
          return;
        }

        const teamSnap = await getDoc(doc(db, "teams", teamId));
        if (cancelled) return;
        if (teamSnap.exists()) {
          const teamData = teamSnap.data();
          const ownerUid =
            (typeof teamData.ownerUid === "string" && teamData.ownerUid) ||
            (typeof teamData.ownerUserId === "string" && teamData.ownerUserId) ||
            "";
          if (ownerUid === user.uid) {
            setHasCaptainRole(true);
          } else {
            setHasCaptainRole(false);
          }
        } else {
          setHasCaptainRole(false);
        }
      } catch (error) {
        console.error("[CaptainOnlyRoute] 팀 권한 확인 실패:", error);
        setHasCaptainRole(false);
      } finally {
        if (!cancelled) setCheckingTeam(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [teamId, user?.uid, teamMembers, teamsLoading]);

  // 로딩 중
  if (teamsLoading || (hasCaptainRole === null && checkingTeam)) {
    return null;
  }

  // 팀장이 아니면 차단
  if (!hasCaptainRole) {
    console.warn("❌ [CaptainOnlyRoute] 팀장 권한 없음 - 차단 화면 노출:", {
      teamId,
      userId: user?.uid,
      isCaptain: hasCaptainRole,
      teamMembers: teamMembers.filter(tm => tm.teamId === teamId),
    });
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-none text-center md:mx-auto md:max-w-3xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">접근 권한이 없습니다</h2>
          <p className="text-gray-600 mb-4">팀장 또는 부팀장만 접근할 수 있어요.</p>
          <div className="mb-2 text-sm text-gray-500">
            현재 권한: <span className="font-medium">{'일반 팀원'}</span>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(`/teams/${encodeURIComponent(teamId)}/play`, { replace: true })}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 active:scale-[0.98] transition"
            >
              팀 페이지로 이동
            </button>
            <button
              onClick={() => navigate('/me', { replace: true })}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition"
            >
              마이 페이지
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  console.log("✅ [CaptainOnlyRoute] 팀장 권한 확인 완료 - 접근 허용");

  // 팀장이면 접근 허용
  return <>{children}</>;
}
