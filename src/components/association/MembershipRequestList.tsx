/**
 * MembershipRequestList
 * 회원 신청 관리 섹션 (협회 관리자 전용)
 * 
 * 역할:
 * - 회원 신청 목록 조회 (status: PENDING)
 * - 승인/거절 버튼 제공
 * - 신청 상세 정보 표시 (팀명, 신청일시, 메모)
 * - 승인 후 상태 즉시 반영
 */

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Users, Clock, CheckCircle2, XCircle, Building2 } from "lucide-react";

interface MembershipRequest {
  id: string;
  teamId: string;
  teamName?: string;
  requestedAt: any;
  memo?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

interface MembershipRequestListProps {
  associationId: string;
  onApproved?: () => void;
}

export default function MembershipRequestList({
  associationId,
  onApproved,
}: MembershipRequestListProps) {
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 회원 신청 목록 조회
  useEffect(() => {
    const fetchRequests = async () => {
      if (!associationId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // membership_conversions 컬렉션에서 PENDING 상태 신청 조회
        const requestsRef = collection(db, "membership_conversions");
        const q = query(
          requestsRef,
          where("associationId", "==", associationId),
          where("status", "==", "PENDING")
        );

        const snapshot = await getDocs(q);
        const requestsList: MembershipRequest[] = [];

        // 각 신청에 대해 팀 정보 조회
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          const teamId = data.teamId;

          // 팀 정보 조회
          let teamName = "팀명 없음";
          try {
            const teamDoc = await getDoc(doc(db, "teams", teamId));
            if (teamDoc.exists()) {
              teamName = teamDoc.data().name || "팀명 없음";
            }
          } catch (error) {
            console.error("팀 정보 조회 실패:", error);
          }

          requestsList.push({
            id: docSnap.id,
            teamId,
            teamName,
            requestedAt: data.requestedAt,
            memo: data.memo || "",
            status: "PENDING",
          });
        }

        // 신청일시 기준 내림차순 정렬
        requestsList.sort((a, b) => {
          const aTime = a.requestedAt?.toDate?.()?.getTime() || 0;
          const bTime = b.requestedAt?.toDate?.()?.getTime() || 0;
          return bTime - aTime;
        });

        setRequests(requestsList);
      } catch (error) {
        console.error("회원 신청 목록 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [associationId]);

  // 승인 처리
  const handleApprove = async (requestId: string, teamId: string) => {
    try {
      setProcessingId(requestId);

      const approveMembershipFn = httpsCallable<
        { teamId: string; associationId: string },
        { success: boolean; message: string }
      >(functions, "approveTeamMembership");

      const result = await approveMembershipFn({
        teamId,
        associationId,
      });

      if (result.data.success) {
        // 목록에서 제거 (PENDING이 아니므로)
        setRequests((prev) => prev.filter((req) => req.id !== requestId));
        onApproved?.();
      } else {
        alert(result.data.message || "승인 처리에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("승인 처리 실패:", error);
      alert(error.message || "승인 처리 중 오류가 발생했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  // 거절 처리
  const handleReject = async (requestId: string, teamId: string) => {
    if (!confirm("이 신청을 거절하시겠습니까?")) {
      return;
    }

    try {
      setProcessingId(requestId);

      // TODO: 거절 API 구현
      // 현재는 임시로 목록에서만 제거
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (error: any) {
      console.error("거절 처리 실패:", error);
      alert(error.message || "거절 처리 중 오류가 발생했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            회원 신청 관리
          </h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          로딩 중...
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            회원 신청 관리
          </h3>
        </div>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          대기 중인 회원 신청이 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          회원 신청 관리
        </h3>
        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 rounded">
          {requests.length}건 대기
        </span>
      </div>

      <div className="space-y-4">
        {requests.map((request) => {
          const isProcessing = processingId === request.id;
          const requestedDate = request.requestedAt?.toDate?.() || new Date();

          return (
            <div
              key={request.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {request.teamName}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>
                      {requestedDate.toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {request.memo && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 bg-gray-50 dark:bg-gray-900/50 p-2 rounded">
                      {request.memo}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => handleApprove(request.id, request.teamId)}
                  disabled={isProcessing}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isProcessing ? "처리 중..." : "승인"}
                </Button>
                <Button
                  onClick={() => handleReject(request.id, request.teamId)}
                  disabled={isProcessing}
                  variant="outline"
                  className="flex-1 border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  거절
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

