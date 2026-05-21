/**
 * 🔥 팀 가입 요청 승인 패널 (STEP: 팀원 가입 플로우)
 * 
 * 팀장이 가입 요청을 승인/거절할 수 있는 UI
 */

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getTeamJoinRequests, approveTeamJoinRequest } from "@/lib/team/teamJoinRequest";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Check } from "lucide-react";

interface TeamJoinRequestsPanelProps {
  teamId: string;
}

interface JoinRequestWithUser {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: any;
}

export function TeamJoinRequestsPanel({ teamId }: TeamJoinRequestsPanelProps) {
  const [requests, setRequests] = useState<JoinRequestWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  // 가입 요청 목록 조회
  useEffect(() => {
    const loadRequests = async () => {
      try {
        setLoading(true);
        const teamRequests = await getTeamJoinRequests(teamId);

        // 사용자 정보 조회
        const requestsWithUser = await Promise.all(
          teamRequests.map(async (req) => {
            try {
              const userRef = doc(db, "users", req.userId);
              const userSnap = await getDoc(userRef);
              const userData = userSnap.exists() ? userSnap.data() : null;

              return {
                ...req,
                userName: userData?.displayName || userData?.nickname || "이름 없음",
                userEmail: userData?.email || "이메일 없음",
              };
            } catch (error) {
              console.error("[TeamJoinRequestsPanel] 사용자 정보 조회 실패:", error);
              return {
                ...req,
                userName: "이름 없음",
                userEmail: "이메일 없음",
              };
            }
          })
        );

        setRequests(requestsWithUser);
      } catch (error) {
        console.error("[TeamJoinRequestsPanel] 가입 요청 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, [teamId]);

  const handleApprove = async (requestId: string, userId: string) => {
    setProcessing(requestId);

    try {
      await approveTeamJoinRequest(requestId, teamId, userId);
      
      // 목록에서 제거
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      
      alert("가입 요청이 승인되었습니다.");
    } catch (error: any) {
      console.error("[TeamJoinRequestsPanel] 승인 실패:", error);
      alert(error.message || "승인에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-gray-500">로딩 중...</p>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            가입 요청
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">대기 중인 가입 요청이 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          가입 요청 ({requests.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900">{request.userName}</p>
                <p className="text-xs text-gray-500">{request.userEmail}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleApprove(request.id, request.userId)}
                  disabled={processing === request.id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-1" />
                  {processing === request.id ? "처리 중..." : "승인"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
