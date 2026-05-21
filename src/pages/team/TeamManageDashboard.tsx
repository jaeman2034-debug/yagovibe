/**
 * 🔥 팀 관리 대시보드 - 행동 중심 첫 화면
 * 
 * 경로: /teams/:teamId/manage
 * 
 * 핵심 질문 3가지:
 * 1. 우리 팀 상태는 어떤가?
 * 2. 지금 당장 해야 할 일이 있는가?
 * 3. 다음으로 무엇을 하면 되는가?
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthProvider';
import {
  Users,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Settings,
  UserPlus,
  Trophy,
  Calendar,
  Building2,
  LineChart,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeamMemberInviteBar } from '@/components/team/TeamMemberInviteBar';

export default function TeamManageDashboard() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<any>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [joinRequestCount, setJoinRequestCount] = useState(0);
  const [isLeader, setIsLeader] = useState(false);
  const [lastActivityText, setLastActivityText] = useState<string | null>(null);

  // 팀 정보 및 상태 조회
  useEffect(() => {
    if (!teamId || !user) {
      if (!user) {
        navigate('/login', { replace: true });
      } else if (!teamId) {
        navigate('/me', { replace: true });
      }
      return;
    }

    let cancelled = false;
    let unsubscribeRequests: (() => void) | null = null;

    const loadDashboard = async () => {
      try {
        // 1. 팀 정보 조회
        const teamRef = doc(db, 'teams', teamId);
        const teamSnap = await getDoc(teamRef);

        if (!teamSnap.exists()) {
          navigate('/me', { replace: true });
          return;
        }

        const teamData = teamSnap.data();
        const userIsLeader = teamData.ownerUid === user.uid;
        let userIsViceCaptain = false;

        if (!userIsLeader) {
          const memberRef = doc(db, 'teams', teamId, 'members', user.uid);
          const memberSnap = await getDoc(memberRef);
          if (memberSnap.exists()) {
            const memberData = memberSnap.data();
            const role = typeof memberData.role === 'string' ? memberData.role : '';
            const accessLevel =
              typeof memberData.accessLevel === 'string' ? memberData.accessLevel : '';
            userIsViceCaptain =
              role === 'vice' || role === '부팀장' || accessLevel === 'ADMIN' || accessLevel === 'OWNER';
          }
        }

        if (!userIsLeader && !userIsViceCaptain) {
          navigate(`/team/${teamId}`, { replace: true });
          return;
        }

        if (cancelled) return;
        setTeam({ id: teamSnap.id, ...teamData });
        setIsLeader(userIsLeader || userIsViceCaptain);

        // 2. 팀원 수 조회 (active 상태만)
        const membersRef = collection(db, `teams/${teamId}/members`);
        const membersQuery = query(membersRef, where('status', '==', 'active'));
        const membersSnap = await getDocs(membersQuery);
        setMemberCount(membersSnap.size);

        // 3. 가입 요청 수 실시간 구독
        const requestsRef = collection(db, 'teamJoinRequests');
        const requestsQuery = query(
          requestsRef,
          where('teamId', '==', teamId),
          where('status', '==', 'pending')
        );

        unsubscribeRequests = onSnapshot(requestsQuery, (snap) => {
          if (!cancelled) setJoinRequestCount(snap.size);
        });

        // 4. 최근 활동 시간 표시 (팀 문서 lastActiveAt 또는 owner의 lastActiveAt)
        const ts: Timestamp | undefined = teamData.lastActiveAt || undefined;
        if (ts?.toDate) {
          const diffMs = Date.now() - ts.toDate().getTime();
          const mins = Math.floor(diffMs / 60000);
          const hours = Math.floor(mins / 60);
          const days = Math.floor(hours / 24);
          let label = '방금 전';
          if (mins >= 1 && mins < 60) label = `${mins}분 전`;
          else if (hours >= 1 && hours < 24) label = `${hours}시간 전`;
          else if (days >= 1) label = `${days}일 전`;
          setLastActivityText(label);
        } else {
          setLastActivityText(null);
        }

      } catch (e) {
        console.error('대시보드 로드 실패:', e);
        navigate('/me', { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadDashboard();
    return () => {
      cancelled = true;
      unsubscribeRequests?.();
    };
  }, [teamId, user?.uid, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!team || !isLeader) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">팀 권한 확인 중...</p>
      </div>
    );
  }

  const hasAssociation = team.associationId || team.membership === 'member';
  const isPending = team.membership === 'pending';
  const hasJoinRequests = joinRequestCount > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none md:mx-auto md:max-w-4xl py-6 md:p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">팀 관리</h1>
          <p className="text-sm text-gray-600">팀을 운영하고 관리하세요</p>
        </div>

        {/* 1️⃣ 팀 상태 요약 카드 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{team.name}</h2>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>팀원 수: <strong className="text-gray-900">{memberCount}명</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  {hasAssociation ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span>협회 소속: <strong className="text-green-700">가입됨</strong></span>
                    </>
                  ) : isPending ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <span>협회 소속: <strong className="text-yellow-700">승인 대기 중</strong></span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-gray-400" />
                      <span>협회 소속: <strong className="text-gray-500">미가입</strong></span>
                    </>
                  )}
                </div>
                {lastActivityText && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">마지막 활동</span>
                    <span className="text-xs font-medium text-gray-700">{lastActivityText}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2️⃣ 🔥 핵심 블록: "지금 해야 할 것" */}
        {(hasJoinRequests ||
          (!hasAssociation && !isPending) ||
          isPending) && (
          <div className="bg-white rounded-lg border-2 border-blue-500 shadow-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">지금 해야 할 것</h3>
            <div className="space-y-3">
              {/* 가입 요청 */}
              {hasJoinRequests && (
                <button
                  onClick={() => navigate(`/teams/${teamId}/manage?tab=requests&focus=1`)}
                  className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 active:scale-[0.98] rounded-lg border border-blue-200 transition-all text-left shadow-sm hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 ring-4 ring-blue-100">
                      <span className="text-white font-bold text-lg">{joinRequestCount}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">가입 요청</p>
                        <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                          지금 확인 필요
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        승인 대기 중인 요청이 {joinRequestCount}건 있어요
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-blue-600" />
                </button>
              )}

              {/* 협회 가입 (비회원팀일 때) */}
              {!hasAssociation && !isPending && (
                <button
                  onClick={() => navigate(`/associations/assoc-nowon-football/apply?teamId=${teamId}`)}
                  className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 active:scale-[0.98] rounded-lg border border-purple-200 transition-all text-left shadow-sm hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🚀</span>
                    <div>
                      <p className="font-semibold text-gray-900">협회에 가입하기</p>
                      <p className="text-sm text-gray-600">협회 가입하면 대회/리그에 참여할 수 있어요</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-purple-600" />
                </button>
              )}

              {/* 협회 가입 승인 대기 중 */}
              {isPending && (
                <div className="w-full flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">협회 가입 승인 대기 중</p>
                    <p className="text-sm text-gray-600">협회 관리자의 승인을 기다리고 있어요 (보통 1~2일 소요)</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 팀원 초대 — 긴급 블록 바로 다음에 두어 스크롤 시 위 녹색 카드를 놓치는 경우를 줄임 */}
        {teamId && (
          <div className="mb-6 rounded-lg border border-green-200 bg-gradient-to-br from-green-50/90 to-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <UserPlus className="h-5 w-5 shrink-0 text-green-700" />
              <h3 className="text-base font-semibold text-gray-900">팀원 초대하기</h3>
            </div>
            <p className="mb-3 text-xs text-gray-600">
              초대 링크 만들기·복사와 가입 요청 바로가기입니다. 아래「팀 관리」에서도 동일한 초대 화면으로 이동할 수 있어요.
            </p>
            <TeamMemberInviteBar teamId={teamId} />
          </div>
        )}

        {/* 3️⃣ 🔥 "이제 할 수 있어요" 섹션 (협회 가입 완료 후) */}
        {hasAssociation && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 shadow-lg p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">이제 할 수 있어요</h3>
                <p className="text-sm text-gray-600 mb-4">
                  협회 소속 팀으로 다양한 활동을 시작할 수 있어요
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => {
                  const sportType = team.sportType || 'football';
                  navigate(`/sports/${sportType}`);
                }}
                className="flex items-center gap-2 p-3 bg-white rounded-lg border border-green-200 hover:bg-green-50 transition-colors text-left"
              >
                <Trophy className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">리그 참가</p>
                  <p className="text-xs text-gray-600">대회 신청하기</p>
                </div>
              </button>
              <button
                onClick={() => {
                  const associationId = team.associationId;
                  if (associationId) {
                    navigate(`/association/${associationId}`);
                  }
                }}
                className="flex items-center gap-2 p-3 bg-white rounded-lg border border-green-200 hover:bg-green-50 transition-colors text-left"
              >
                <Building2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">협회 공지</p>
                  <p className="text-xs text-gray-600">공지 확인하기</p>
                </div>
              </button>
              <button
                onClick={() => {
                  const associationId = team.associationId;
                  if (associationId) {
                    navigate(`/association/${associationId}/tournaments`);
                  }
                }}
                className="flex items-center gap-2 p-3 bg-white rounded-lg border border-green-200 hover:bg-green-50 transition-colors text-left"
              >
                <Calendar className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">대회 일정</p>
                  <p className="text-xs text-gray-600">일정 확인하기</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 4️⃣ 팀 관리 메뉴 (항상 접근 가능) */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">팀 관리</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => navigate(`/teams/${teamId}/invite`)}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-green-50/80 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">팀원 초대하기</p>
                  <p className="text-xs text-gray-600">초대 링크 만들기 · 공유</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => navigate(`/teams/${teamId}/manage?tab=requests`)}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">가입 요청 관리</p>
                  <p className="text-xs text-gray-600">
                    {joinRequestCount > 0 ? `${joinRequestCount}건 대기 중` : '가입 요청 확인'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => navigate(`/teams/${teamId}/manage?tab=stats`)}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <LineChart className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">회비 KPI</p>
                  <p className="text-xs text-gray-600">이번 달 수익·납부율·자동결제</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => navigate(`/teams/${teamId}/manage?tab=members`)}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">팀원 관리</p>
                  <p className="text-xs text-gray-600">{memberCount}명의 팀원</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => navigate(`/teams/${teamId}/manage?tab=settings`)}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">팀 정보 수정</p>
                  <p className="text-xs text-gray-600">팀 설정 및 정보 관리</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
