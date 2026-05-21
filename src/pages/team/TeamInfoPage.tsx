/**
 * 🔥 팀 정보 페이지 (P2/P3 공용, 읽기 중심)
 * 
 * 경로: /teams/:teamId
 * 
 * 핵심 정체성: "팀의 얼굴이자 기준점"
 * - 관리 페이지 ❌
 * - 설정 페이지 ❌
 * - 누가 봐도 이해되는 팀 소개 페이지 ✅
 * 
 * 접근 권한:
 * - P2 (팀원): ✅
 * - P3 (팀장): ✅
 * - P1: ❌ (초대 링크로만 접근)
 * 
 * 역할:
 * - 팀 프로필 표시
 * - 팀원 목록 표시
 * - 내 역할 명시
 * - 팀장만 보는 보조 CTA (팀 관리로 이동)
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import { Building2, Users, MapPin, Crown, User, ArrowLeft, Settings, Calendar, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamSettingsModal } from "@/components/team/TeamSettingsModal";

export default function TeamInfoPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { teamMembers } = useMyTeams();

  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [isCaptain, setIsCaptain] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 팀 정보 및 멤버십 확인
  useEffect(() => {
    if (!teamId || !user) {
      setLoading(false);
      return;
    }

    const loadTeam = async () => {
      try {
        // 1. 팀 정보 조회
        const teamRef = doc(db, "teams", teamId);
        const teamSnap = await getDoc(teamRef);

        if (!teamSnap.exists()) {
          navigate("/me", { replace: true });
          return;
        }

        const teamData = teamSnap.data();
        setTeam({ id: teamSnap.id, ...teamData });

        // 2. 멤버십 확인 (team_members에서)
        const myTeamMember = teamMembers.find((tm) => tm.teamId === teamId);
        if (myTeamMember) {
          setIsMember(true);
          setIsCaptain(
            myTeamMember.role === "admin" ||
            myTeamMember.role === "owner" ||
            myTeamMember.accessLevel === "OWNER" ||
            teamData.ownerUid === user.uid
          );
        } else {
          // team_members에 없으면 teams 컬렉션의 ownerUid 확인
          setIsCaptain(teamData.ownerUid === user.uid);
          setIsMember(teamData.ownerUid === user.uid);
        }

        // 3. 팀원 목록 실시간 구독
        const membersRef = collection(db, `teams/${teamId}/members`);
        const unsubscribe = onSnapshot(membersRef, async (snap) => {
          const membersList = await Promise.all(
            snap.docs.map(async (d) => {
              const data = d.data();
              const uid = d.id;

              // 사용자 정보 조회
              let userName: string | undefined;
              let userPhotoURL: string | undefined;

              try {
                const userRef = doc(db, "users", uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                  const userData = userSnap.data();
                  userName = userData.displayName || userData.name || userData.email?.split("@")[0] || uid;
                  userPhotoURL = userData.photoURL || userData.avatar;
                } else {
                  userName = uid;
                }
              } catch (e) {
                console.error("사용자 정보 조회 실패:", e);
                userName = uid;
              }

              const isCaptainMember =
                uid === teamData.ownerUid ||
                data.role === "admin" ||
                data.role === "owner" ||
                data.accessLevel === "OWNER";

              return {
                id: d.id,
                uid,
                role: data.role || "member",
                userName,
                userPhotoURL,
                isCaptain: isCaptainMember,
              };
            })
          );

          // 팀장 먼저, 그 다음 가입일 순으로 정렬
          membersList.sort((a, b) => {
            if (a.isCaptain && !b.isCaptain) return -1;
            if (!a.isCaptain && b.isCaptain) return 1;
            return 0;
          });

          setMembers(membersList);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("팀 정보 조회 실패:", error);
        navigate("/me", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadTeam();
  }, [teamId, user, teamMembers, navigate]);

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

  if (!team) {
    return null; // 리다이렉트 중
  }

  // P1 (팀원이 아닌 경우) 접근 차단
  if (!isMember) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-none text-center md:mx-auto md:max-w-3xl">
          <p className="text-gray-900 font-semibold mb-2">이 팀의 멤버가 아닙니다.</p>
          <p className="text-sm text-gray-600 mb-4">
            팀 정보는 팀원만 볼 수 있어요.
          </p>
          <Button onClick={() => navigate("/me")}>돌아가기</Button>
        </div>
      </div>
    );
  }

  // 협회 상태 텍스트
  const getAssociationStatus = () => {
    if (team.associationId || team.membership === "member") {
      return { text: "가입 완료", color: "text-green-700", bg: "bg-green-50" };
    }
    if (team.membership === "pending") {
      return { text: "대기 중", color: "text-yellow-700", bg: "bg-yellow-50" };
    }
    return { text: "미가입", color: "text-gray-500", bg: "bg-gray-50" };
  };

  const associationStatus = getAssociationStatus();
  const captain = members.find((m) => m.isCaptain);
  const regularMembers = members.filter((m) => !m.isCaptain);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none md:mx-auto md:max-w-2xl py-6 md:p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/me")}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            돌아가기
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">팀 정보</h1>
        </div>

        {/* 1️⃣ 팀 프로필 카드 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{team.name}</h2>
              <div className="space-y-2 text-sm text-gray-600">
                {team.region && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{team.region}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${associationStatus.bg} ${associationStatus.color}`}>
                    {team.associationId ? "협회 소속" : associationStatus.text}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2️⃣ 팀 소개 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">팀 소개</h3>
          {team.description ? (
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {team.description}
            </p>
          ) : (
            <p className="text-sm text-gray-500 italic">
              아직 팀 소개가 없어요.
            </p>
          )}
        </div>

        {/* 3️⃣ 팀원 리스트 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            팀원 ({members.length}명)
          </h3>

          <div className="space-y-3">
            {/* 팀장 */}
            {captain && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                  {captain.userPhotoURL ? (
                    <img
                      src={captain.userPhotoURL}
                      alt={captain.userName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <Crown className="w-5 h-5 text-amber-700" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {captain.userName || captain.uid}
                    </span>
                    <Crown className="w-4 h-4 text-amber-600" />
                    {captain.uid === user?.uid && (
                      <span className="text-xs text-gray-600">(나)</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">역할: 팀장</div>
                </div>
              </div>
            )}

            {/* 팀원 */}
            {regularMembers.length > 0 && (
              <div className="space-y-2">
                {regularMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      {member.userPhotoURL ? (
                        <img
                          src={member.userPhotoURL}
                          alt={member.userName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {member.userName || member.uid}
                        </span>
                        {member.uid === user?.uid && (
                          <span className="text-xs text-gray-600">(나)</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">역할: 팀원</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4️⃣ 내 역할 카드 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">내 역할</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-medium text-gray-900">
                {isCaptain ? "팀장" : "팀원"}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {isCaptain
                  ? "팀을 관리하고 운영할 수 있어요"
                  : "팀 정보를 확인할 수 있어요"}
              </p>
            </div>
            {isCaptain && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSettingsOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  팀 설정
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/teams/${teamId}/manage`)}
                  className="flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  팀 관리
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 5️⃣ 액션 버튼 (팀원 모두) */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">팀 활동</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(`/activity/schedule/create?teamId=${teamId}`)}
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              일정 만들기
            </Button>
            <Button
              variant="outline"
              onClick={async (e) => {
                if (!teamId || !user?.uid) return;
                
                // 로딩 상태 관리
                const button = e.currentTarget;
                const originalText = button.textContent;
                button.disabled = true;
                button.textContent = "채팅방 준비 중...";
                
                try {
                  const { ensureTeamChatRoom } = await import("@/services/chat/ensureTeamChatRoom");
                  const chatRoomId = await ensureTeamChatRoom(teamId);
                  navigate(`/chat/${chatRoomId}`);
                } catch (error: any) {
                  console.error("❌ [TeamInfoPage] 채팅방 생성 실패:", error);
                  alert(error.message || "채팅방 생성에 실패했습니다.");
                } finally {
                  button.disabled = false;
                  button.textContent = originalText;
                }
              }}
              className="flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              팀 채팅
            </Button>
          </div>
        </div>
      </div>

      {/* 팀 설정 모달 */}
      {teamId && (
        <TeamSettingsModal
          teamId={teamId}
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSuccess={() => {
            // 팀 정보 새로고침
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
