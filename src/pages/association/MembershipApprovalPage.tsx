// src/pages/association/MembershipApprovalPage.tsx
// 🔥 노원구 축구협회 관리자 승인 화면
// 
// 협회 운영 → 회원 관리 → 회원 신청 팀
// - 승인 대기 중인 신청 팀 목록
// - 승인/거절 기능
// - 확인 모달 포함

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Building2, CheckCircle2, XCircle, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MembershipRequest {
  requestId: string;
  teamId: string;
  teamName: string;
  region: string;
  requestedAt: any; // Timestamp
  requestedBy: string;
  memo?: string;
}

export default function MembershipApprovalPage() {
  const { associationId } = useParams<{ associationId: string }>();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // 신청 목록 조회
  useEffect(() => {
    const fetchRequests = async () => {
      if (!associationId) return;

      setLoading(true);
      try {
        const getRequests = httpsCallable<
          { associationId: string; status?: string },
          { success: boolean; requests: MembershipRequest[]; count: number }
        >(functions, "getMembershipRequests");

        const result = await getRequests({
          associationId,
          status: "pending",
        });

        if (result.data.success) {
          setRequests(result.data.requests);
        }
      } catch (error: any) {
        console.error("❌ [MembershipApprovalPage] 신청 목록 조회 실패:", error);
        alert("신청 목록을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [associationId]);

  // 승인 처리
  const handleApprove = async (request: MembershipRequest) => {
    if (!associationId) return;

    setApprovingId(request.requestId);
    try {
      const approveMembership = httpsCallable<
        { teamId: string; associationId: string },
        { success: boolean; message: string }
      >(functions, "approveTeamMembership");

      const result = await approveMembership({
        teamId: request.teamId,
        associationId,
      });

      if (result.data.success) {
        // 리스트에서 제거
        setRequests((prev) => prev.filter((r) => r.requestId !== request.requestId));
        setShowApproveModal(null);
        alert("승인이 완료되었습니다.");
      }
    } catch (error: any) {
      console.error("❌ [MembershipApprovalPage] 승인 실패:", error);
      alert(error?.message || "승인 처리에 실패했습니다.");
    } finally {
      setApprovingId(null);
    }
  };

  // 거절 처리
  const handleReject = async (request: MembershipRequest) => {
    if (!associationId) return;

    setRejectingId(request.requestId);
    try {
      const rejectMembership = httpsCallable<
        { teamId: string; associationId: string; rejectionReason?: string },
        { success: boolean; message: string }
      >(functions, "rejectTeamMembership");

      const result = await rejectMembership({
        teamId: request.teamId,
        associationId,
        rejectionReason: rejectionReason.trim() || undefined,
      });

      if (result.data.success) {
        // 리스트에서 제거
        setRequests((prev) => prev.filter((r) => r.requestId !== request.requestId));
        setShowRejectModal(null);
        setRejectionReason("");
        alert("거절이 완료되었습니다.");
      }
    } catch (error: any) {
      console.error("❌ [MembershipApprovalPage] 거절 실패:", error);
      alert(error?.message || "거절 처리에 실패했습니다.");
    } finally {
      setRejectingId(null);
    }
  };

  // 날짜 포맷팅
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "날짜 없음";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">신청 목록을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* 상단 요약 바 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  노원구 축구협회 · 회원 신청 팀
                </h1>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                대기 중 {requests.length}팀
              </p>
            </div>
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="flex items-center gap-2"
            >
              뒤로 가기
            </Button>
          </div>
        </div>

        {/* 신청 팀 리스트 */}
        {requests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              승인 대기 중인 신청이 없습니다
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              모든 신청이 처리되었습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.requestId}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                      {request.teamName}
                    </h3>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4" />
                        <span>활동 지역: {request.region}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>신청일: {formatDate(request.requestedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => setShowApproveModal(request.requestId)}
                      disabled={approvingId === request.requestId}
                      className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      승인
                    </Button>
                    <Button
                      onClick={() => setShowRejectModal(request.requestId)}
                      disabled={rejectingId === request.requestId}
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      반려
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 승인 확인 모달 */}
        {showApproveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                회원 승인 확인
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                {requests.find((r) => r.requestId === showApproveModal)?.teamName} 팀을
                <br />
                노원구 축구협회 회원으로 승인하시겠습니까?
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  승인 후에는:
                  <br />- 우선 대관 혜택이 적용됩니다
                  <br />- 협회 공지가 노출됩니다
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    const request = requests.find((r) => r.requestId === showApproveModal);
                    if (request) {
                      handleApprove(request);
                    }
                  }}
                  disabled={approvingId === showApproveModal}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {approvingId === showApproveModal ? "승인 중..." : "승인 확정"}
                </Button>
                <Button
                  onClick={() => setShowApproveModal(null)}
                  variant="outline"
                  className="flex-1"
                >
                  취소
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 거절 모달 */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                회원 신청 거절
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                {requests.find((r) => r.requestId === showRejectModal)?.teamName} 팀의
                <br />
                회원 신청을 거절하시겠습니까?
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  거절 사유 (선택)
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">사유 선택 (선택사항)</option>
                  <option value="서류 미비">서류 미비</option>
                  <option value="지역 불일치">지역 불일치</option>
                  <option value="기타">기타</option>
                </select>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    const request = requests.find((r) => r.requestId === showRejectModal);
                    if (request) {
                      handleReject(request);
                    }
                  }}
                  disabled={rejectingId === showRejectModal}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {rejectingId === showRejectModal ? "거절 중..." : "거절 확정"}
                </Button>
                <Button
                  onClick={() => {
                    setShowRejectModal(null);
                    setRejectionReason("");
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  취소
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

