/**
 * 🔥 팀 참여 요청 승인 섹션
 * 
 * 역할:
 * - 팀장이 팀 참여 요청을 승인/거절
 * - 승인 시 teams/{teamId}/members/{userId} 생성
 * - 팀원 목록에 역할 표시 (LEADER / MEMBER)
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useJoinRequests } from "@/hooks/useJoinRequests";
import { approveTeamJoinRequest, rejectTeamJoinRequest, type TeamJoinRequest } from "@/lib/team/teamJoinRequest";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserPlus, Check, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TeamJoinRequestsSectionProps {
  teamId: string;
  onApproved?: () => void; // 승인 후 콜백 (팀원 목록 새로고침 등)
}

export default function TeamJoinRequestsSection({ teamId, onApproved }: TeamJoinRequestsSectionProps) {
  const { user } = useAuth();
  const { requests, loading } = useJoinRequests(teamId);
  const [processing, setProcessing] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, {
    name: string;
    sport?: string;
    region?: string;
    email?: string;
  }>>({});

  // 요청자 프로필 조회 (이름, 종목, 지역)
  useEffect(() => {
    const fetchUserProfiles = async () => {
      const profiles: Record<string, {
        name: string;
        sport?: string;
        region?: string;
        email?: string;
      }> = {};
      
      for (const request of requests) {
        try {
          const userDoc = await getDoc(doc(db, "users", request.userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            profiles[request.userId] = {
              name: userData.displayName || userData.nickname || userData.email || "알 수 없음",
              sport: userData.sport,
              region: userData.region,
              email: userData.email,
            };
          } else {
            profiles[request.userId] = {
              name: "알 수 없음",
            };
          }
        } catch (error) {
          console.error(`사용자 ${request.userId} 조회 실패:`, error);
          profiles[request.userId] = {
            name: "알 수 없음",
          };
        }
      }
      setUserProfiles(profiles);
    };

    if (requests.length > 0) {
      fetchUserProfiles();
    }
  }, [requests]);

  // 승인 처리
  const handleApprove = async (request: TeamJoinRequest) => {
    if (!user || processing) return;

    const profile = userProfiles[request.userId];
    if (!window.confirm(`${profile?.name || "사용자"}님의 참여 요청을 승인하시겠습니까?`)) {
      return;
    }

    setProcessing(request.id);
    try {
      await approveTeamJoinRequest(request.id, request.teamId, request.userId);
      
      // 승인 성공 알림 (추후 Push 알림으로 확장 가능)
      if (onApproved) {
        onApproved();
      }
      
      alert("✅ 참여 요청이 승인되었습니다.");
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
      await rejectTeamJoinRequest(request.id);
      alert("❌ 참여 요청이 거절되었습니다.");
    } catch (error: any) {
      console.error("거절 실패:", error);
      alert(`❌ 거절 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 text-gray-600">
          <UserPlus className="w-5 h-5 animate-pulse" />
          <span className="text-sm">참여 요청 확인 중...</span>
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return null; // 요청이 없으면 표시하지 않음
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          참여 요청 ({requests.length}건)
        </h3>
      </div>

      <div className="space-y-3">
        {requests.map((request) => (
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
                  {userProfiles[request.userId]?.name || "로딩 중..."}
                </div>
                <div className="text-sm text-gray-500 space-y-0.5">
                  {userProfiles[request.userId]?.sport && userProfiles[request.userId]?.region && (
                    <div>
                      {userProfiles[request.userId].sport} · {userProfiles[request.userId].region}
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
        ))}
      </div>
    </div>
  );
}
