/**
 * 🔥 PendingRequestCard - 가입 요청 대기 중 카드
 * 
 * P1-W 상태: 팀 가입 요청을 보냈고 승인 대기 중
 */

import { useState, useEffect } from "react";
import { Clock, X, Users } from "lucide-react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cancelTeamJoinRequest } from "@/lib/team/teamJoinRequest";
import type { TeamJoinRequest } from "@/lib/team/teamJoinRequest";

interface PendingRequestCardProps {
  request: TeamJoinRequest;
  onCanceled: () => void;
}

export function PendingRequestCard({ request, onCanceled }: PendingRequestCardProps) {
  const [teamName, setTeamName] = useState<string>("");
  const [canceling, setCanceling] = useState(false);
  const [requestDate, setRequestDate] = useState<string>("");

  // 팀 정보 실시간 조회
  useEffect(() => {
    if (!request.teamId) return;

    const teamRef = doc(db, "teams", request.teamId);
    const unsubscribe = onSnapshot(teamRef, (snap) => {
      if (snap.exists()) {
        setTeamName(snap.data().name || "팀");
      }
    }, (error) => {
      console.error("팀 정보 조회 실패:", error);
      setTeamName("팀");
    });

    return () => unsubscribe();
  }, [request.teamId]);

  // 요청 날짜 포맷팅
  useEffect(() => {
    if (request.createdAt) {
      const date = request.createdAt?.toDate?.() || new Date(request.createdAt);
      setRequestDate(date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }));
    }
  }, [request.createdAt]);

  const handleCancel = async () => {
    if (!confirm("가입 요청을 취소하시겠어요?")) {
      return;
    }

    setCanceling(true);
    try {
      await cancelTeamJoinRequest(request.id, request.userId);
      onCanceled();
    } catch (error: any) {
      console.error("요청 취소 실패:", error);
      alert(error.message || "요청 취소에 실패했습니다.");
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border-2 border-amber-200 p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
          <Clock className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            팀 가입 요청 중 ⏳
          </h3>
          <p className="text-sm text-gray-600">
            {teamName || "팀"}에 가입 요청을 보냈어요.
            <br />
            팀장이 승인하면 알림으로 알려드릴게요.
          </p>
        </div>
      </div>

      {requestDate && (
        <div className="text-xs text-gray-500 mb-4 pl-13">
          요청일: {requestDate}
        </div>
      )}

      <button
        onClick={handleCancel}
        disabled={canceling}
        className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <X className="w-4 h-4" />
        {canceling ? "취소 중..." : "요청 취소"}
      </button>
    </div>
  );
}
