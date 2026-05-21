/**
 * 🔥 RequestCard - 가입 요청 카드 (STEP: 팀원 가입 플로우)
 * 
 * RequestCard 최소 구성:
 * - 신청자 이름
 * - 종목 / 지역
 * - [승인] [거절]
 */

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { approveTeamJoinRequest, rejectTeamJoinRequest } from "@/lib/team/teamJoinRequest";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/cards/Card";
import { MapPin, Trophy, Check, X } from "lucide-react";
import type { TeamJoinRequest } from "@/lib/team/teamJoinRequest";

interface RequestCardProps {
  request: TeamJoinRequest;
  teamId: string;
  onApproved?: () => void;
  onRejected?: () => void;
}

export function RequestCard({
  request,
  teamId,
  onApproved,
  onRejected,
}: RequestCardProps) {
  const [userInfo, setUserInfo] = useState<{
    name?: string;
    sport?: string;
    region?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<"approve" | "reject" | null>(null);

  // 사용자 정보 조회
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const userRef = doc(db, "users", request.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUserInfo({
            name: userData.displayName || userData.nickname || "이름 없음",
            sport: userData.sport,
            region: userData.region,
          });
        } else {
          setUserInfo({ name: "이름 없음" });
        }
      } catch (error) {
        console.warn("[RequestCard] 사용자 정보 조회 실패:", error);
        setUserInfo({ name: "이름 없음" });
      } finally {
        setLoading(false);
      }
    };

    loadUserInfo();
  }, [request.userId]);

  const handleApprove = async () => {
    setProcessing("approve");

    try {
      await approveTeamJoinRequest(request.id, teamId, request.userId);
      onApproved?.();
    } catch (error: any) {
      console.error("[RequestCard] 승인 실패:", error);
      alert(error.message || "승인에 실패했습니다.");
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    setProcessing("reject");

    try {
      await rejectTeamJoinRequest(request.id);
      onRejected?.();
    } catch (error: any) {
      console.error("[RequestCard] 거절 실패:", error);
      alert(error.message || "거절에 실패했습니다.");
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <Card variant="info">
        <div className="p-4">
          <p className="text-sm text-gray-500">로딩 중...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="info" className="hover:shadow-md transition-shadow">
      {/* 신청자 정보 */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {userInfo?.name || "이름 없음"}
        </h3>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          {userInfo?.region && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{userInfo.region}</span>
            </div>
          )}
          {userInfo?.sport && (
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              <span>{userInfo.sport === "football" ? "축구" : userInfo.sport}</span>
            </div>
          )}
        </div>
      </div>

      {/* 승인/거절 버튼 */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleApprove}
          disabled={processing !== null}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          size="sm"
        >
          <Check className="w-4 h-4 mr-1" />
          {processing === "approve" ? "처리 중..." : "승인"}
        </Button>
        <Button
          onClick={handleReject}
          disabled={processing !== null}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700"
          size="sm"
        >
          <X className="w-4 h-4 mr-1" />
          {processing === "reject" ? "처리 중..." : "거절"}
        </Button>
      </div>
    </Card>
  );
}
