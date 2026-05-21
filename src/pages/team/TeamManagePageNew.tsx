/**
 * 🔥 팀 관리 페이지 (결승 구현)
 * 
 * 경로: /team/:teamId/manage
 * 
 * 역할:
 * - LEADER만 접근 가능
 * - 참여 요청 승인/거절
 * - 팀원 목록 + 역할 표시
 * - 팀원 추방 (LEADER만)
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useJoinRequests } from "@/hooks/useJoinRequests";
import { approveTeamJoinRequest, rejectTeamJoinRequest, type TeamJoinRequest } from "@/lib/team/teamJoinRequest";
import { UserPlus, Check, X, Users, Crown, Shield, ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TeamMember {
  uid: string;
  role: "owner" | "admin" | "member"; // 🔥 소문자로 통일 (LEADER → owner, MEMBER → member)
  joinedAt: any;
  status: "active";
}

interface Team {
  id: string;
  name: string;
  ownerUid?: string;
  owners?: string[];
}

export default function TeamManagePageNew() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLeader, setIsLeader] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, {
    name: string;
    sport?: string;
    region?: string;
    email?: string;
  }>>({});

  const { requests, loading: requestsLoading } = useJoinRequests(teamId, { enabled: !!teamId && isLeader });

  // 팀 정보 조회
  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    const teamRef = doc(db, "teams", teamId);
    const unsub = onSnapshot(teamRef, async (snap) => {
      if (!snap.exists()) {
        setTeam(null);
        setLoading(false);
        return;
      }

      const teamData = snap.data();
      const teamInfo: Team = {
        id: snap.id,
        name: teamData.name || "이름 없음",
        ownerUid: teamData.ownerUid,
        owners: teamData.owners || [],
      };
      setTeam(teamInfo);

      // LEADER 권한 확인
      if (user?.uid) {
        const isOwner = teamInfo.ownerUid === user.uid || teamInfo.owners?.includes(user.uid);
        setIsLeader(isOwner);

        if (!isOwner) {
          // LEADER가 아니면 /me로 리다이렉트
          navigate("/me");
          return;
        }
      }

      setLoading(false);
    }, (error) => {
      console.error("팀 정보 조회 실패:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [teamId, user?.uid, navigate]);

  // 팀원 목록 조회
  useEffect(() => {
    if (!teamId || !isLeader) return;

    const membersRef = collection(db, "teams", teamId, "members");
    const unsub = onSnapshot(membersRef, (snap) => {
      const membersList: TeamMember[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        membersList.push({
          uid: doc.id,
          role: (data.role === "admin" || data.role === "owner" || data.role === "LEADER") ? "owner" : "member", // 🔥 소문자로 통일
          joinedAt: data.joinedAt,
          status: data.status || "active",
        });
      });
      setMembers(membersList);

      // 팀원 프로필 조회
      const fetchProfiles = async () => {
        const profiles: Record<string, {
          name: string;
          sport?: string;
          region?: string;
          email?: string;
        }> = {};

        for (const member of membersList) {
          try {
            const userDoc = await getDoc(doc(db, "users", member.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              profiles[member.uid] = {
                name: userData.displayName || userData.nickname || userData.email || "이름 없음",
                sport: userData.sport,
                region: userData.region,
                email: userData.email,
              };
            }
          } catch (error) {
            console.error(`사용자 ${member.uid} 조회 실패:`, error);
          }
        }
        setUserProfiles(profiles);
      };

      fetchProfiles();
    }, (error) => {
      console.error("팀원 목록 조회 실패:", error);
    });

    return () => unsub();
  }, [teamId, isLeader]);

  // 요청자 프로필 조회
  useEffect(() => {
    const fetchRequestProfiles = async () => {
      const profiles: Record<string, {
        name: string;
        sport?: string;
        region?: string;
        email?: string;
      }> = {};

      for (const request of requests) {
        if (userProfiles[request.userId]) continue; // 이미 조회됨

        try {
          const userDoc = await getDoc(doc(db, "users", request.userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            profiles[request.userId] = {
              name: userData.displayName || userData.nickname || userData.email || "이름 없음",
              sport: userData.sport,
              region: userData.region,
              email: userData.email,
            };
          }
        } catch (error) {
          console.error(`사용자 ${request.userId} 조회 실패:`, error);
        }
      }

      setUserProfiles((prev) => ({ ...prev, ...profiles }));
    };

    if (requests.length > 0) {
      fetchRequestProfiles();
    }
  }, [requests, userProfiles]);

  // 승인 처리
  const handleApprove = async (request: TeamJoinRequest) => {
    if (!user || processing || !teamId) return;

    const profile = userProfiles[request.userId];
    if (!window.confirm(`${profile?.name || "사용자"}님의 참여 요청을 승인하시겠습니까?`)) {
      return;
    }

    setProcessing(request.id);
    try {
      if (!user?.uid) {
        throw new Error("로그인이 필요합니다.");
      }
      
      await approveTeamJoinRequest(request.id, teamId, request.userId, user.uid);
      alert("✅ 참여 요청이 승인되었습니다.");
      
      // 목록 자동 새로고침 (onSnapshot이 자동으로 업데이트)
    } catch (error: any) {
      console.error("승인 실패:", error);
      alert(`❌ 승인 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setProcessing(null);
    }
  };

  // 거절 처리
  const handleReject = async (request: TeamJoinRequest) => {
    if (!user || processing) return;

    const profile = userProfiles[request.userId];
    const reason = window.prompt(
      `${profile?.name || "사용자"}님의 참여 요청을 거절하시겠습니까?\n\n거절 사유를 입력해주세요 (선택):`
    );

    if (reason === null) return; // 취소

    setProcessing(request.id);
    try {
      if (!user?.uid) {
        throw new Error("로그인이 필요합니다.");
      }
      
      await rejectTeamJoinRequest(request.id, user.uid);
      alert("❌ 참여 요청이 거절되었습니다.");
      
      // 목록 자동 새로고침 (onSnapshot이 자동으로 업데이트)
    } catch (error: any) {
      console.error("거절 실패:", error);
      alert(`❌ 거절 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setProcessing(null);
    }
  };

  // 팀원 추방 (LEADER만)
  const handleRemoveMember = async (memberUid: string) => {
    if (!teamId || !user || processing) return;

    const profile = userProfiles[memberUid];
    if (!window.confirm(`${profile?.name || "팀원"}님을 팀에서 제외하시겠습니까?`)) {
      return;
    }

    setProcessing(memberUid);
    try {
      // teams/{teamId}/members/{uid} 삭제
      await deleteDoc(doc(db, "teams", teamId, "members", memberUid));
      
      // team_members 역인덱스 삭제
      await deleteDoc(doc(db, "team_members", `${teamId}_${memberUid}`));
      
      alert("✅ 팀원이 제외되었습니다.");
    } catch (error: any) {
      console.error("팀원 제외 실패:", error);
      alert(`❌ 팀원 제외 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setProcessing(null);
    }
  };

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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-4">팀을 찾을 수 없습니다</h1>
          <Button onClick={() => navigate("/me")} className="w-full">
            마이페이지로 이동
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none md:mx-auto md:max-w-4xl py-6">
        {/* 헤더 */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/me")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로
          </Button>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
                <p className="text-sm text-gray-500 mt-1">팀 관리</p>
              </div>
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-medium text-gray-700">팀장</span>
              </div>
            </div>
          </div>
        </div>

        {/* 참여 요청 섹션 */}
        {requestsLoading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-2 text-gray-600">
              <UserPlus className="w-5 h-5 animate-pulse" />
              <span className="text-sm">참여 요청 확인 중...</span>
            </div>
          </div>
        ) : requests.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                참여 요청 ({requests.length}건)
              </h2>
            </div>

            <div className="space-y-3">
              {requests.map((request) => {
                const profile = userProfiles[request.userId];
                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {profile?.name || "로딩 중..."}
                        </div>
                        <div className="text-sm text-gray-500 space-y-0.5">
                          {profile?.sport && profile?.region && (
                            <div>
                              {profile.sport} · {profile.region}
                            </div>
                          )}
                          <div>
                            {request.createdAt?.toDate?.()?.toLocaleDateString("ko-KR") || "날짜 없음"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleApprove(request)}
                        disabled={processing === request.id || !!processing}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        승인
                      </Button>
                      <Button
                        onClick={() => handleReject(request)}
                        disabled={processing === request.id || !!processing}
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        size="sm"
                      >
                        <X className="w-4 h-4 mr-1" />
                        거절
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* 팀원 목록 섹션 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              팀원 목록 ({members.length}명)
            </h2>
          </div>

          {members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              등록된 팀원이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => {
                const profile = userProfiles[member.uid];
                const isCurrentUser = member.uid === user?.uid;
                const canRemove = isLeader && member.role === "member" && !isCurrentUser; // 🔥 소문자로 통일 (MEMBER → member)

                return (
                  <div
                    key={member.uid}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        member.role === "owner" ? "bg-yellow-100" : "bg-blue-100" // 🔥 소문자로 통일 (LEADER → owner)
                      }`}>
                        {member.role === "owner" ? (
                          <Crown className="w-5 h-5 text-yellow-600" />
                        ) : (
                          <Shield className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {profile?.name || "로딩 중..."}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            member.role === "owner"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-blue-100 text-blue-700"
                          }`}>
                            {member.role === "owner" ? "팀장" : "팀원"} {/* 🔥 소문자로 통일 (LEADER → owner) */}
                          </span>
                          {isCurrentUser && (
                            <span className="text-xs text-gray-500">(나)</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 space-y-0.5">
                          {profile?.sport && profile?.region && (
                            <div>
                              {profile.sport} · {profile.region}
                            </div>
                          )}
                          <div>
                            가입일: {member.joinedAt?.toDate?.()?.toLocaleDateString("ko-KR") || "날짜 없음"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {canRemove && (
                      <Button
                        onClick={() => handleRemoveMember(member.uid)}
                        disabled={processing === member.uid || !!processing}
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        제외
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
