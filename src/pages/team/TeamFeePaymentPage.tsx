// src/pages/team/TeamFeePaymentPage.tsx
// 💰 회비 납부 처리 페이지
// "홍길동 20,000원 냈다"를 3초 안에 체크

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTeam } from "@/context/TeamContext";
import { useAuth } from "@/context/AuthProvider";
import { collection, getDocs, query, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { teamFeeCurrentSeoulMonthKey } from "@/lib/fees/seoulFeeMonthKey";

interface Member {
  id: string;
  name: string;
  feePlan: "monthly" | "annual" | "exempt";
  unpaidMonths: number;
  monthlyFee?: number;
}

interface FeeStatus {
  paid: boolean;
  amount?: number;
  paidAt?: any;
}

export default function TeamFeePaymentPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { myTeam, role, plan } = useTeam();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [feeStatuses, setFeeStatuses] = useState<{ [memberId: string]: FeeStatus }>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    member: Member | null;
  }>({ show: false, member: null });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isAdmin = role === "admin";
  const isProPlan = plan === "pro";

  // 현재 월 계산 (Asia/Seoul 달력)
  const currentMonth = teamFeeCurrentSeoulMonthKey();
  const [year, month] = currentMonth.split("-").map(Number);
  const monthName = `${year}년 ${month}월`;

  // 🔥 회원 목록 조회
  useEffect(() => {
    if (!teamId) return;

    const fetchMembers = async () => {
      try {
        const membersQuery = query(collection(db, "teams", teamId, "members"));
        const snapshot = await getDocs(membersQuery);
        const membersList: Member[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          // 면제자는 제외
          if (data.feePlan === "exempt") return;
          
          membersList.push({
            id: doc.id,
            name: data.name || "",
            feePlan: data.feePlan || "monthly",
            unpaidMonths: data.unpaidMonths || 0,
            monthlyFee: data.monthlyFee || 20000,
          });
        });
        
        setMembers(membersList);
      } catch (error) {
        console.error("회원 목록 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [teamId]);

  // 🔥 각 회원의 납부 상태 조회
  useEffect(() => {
    if (!teamId || members.length === 0) return;

    const fetchFeeStatuses = async () => {
      try {
        const getFeeStatusCallable = httpsCallable(functions, "getFeeStatusCallable");
        const statuses: { [memberId: string]: FeeStatus } = {};

        for (const member of members) {
          try {
            const result = await getFeeStatusCallable({
              teamId,
              memberId: member.id,
              month: currentMonth,
            });
            statuses[member.id] = result.data as FeeStatus;
          } catch (error) {
            statuses[member.id] = { paid: false };
          }
        }

        setFeeStatuses(statuses);
      } catch (error) {
        console.error("납부 상태 조회 실패:", error);
      }
    };

    fetchFeeStatuses();
  }, [teamId, members, currentMonth]);

  // 🔥 납부 완료 처리
  const handlePaymentComplete = async (member: Member) => {
    if (!teamId || !user?.uid) return;

    setProcessing(member.id);
    try {
      const processFeePaymentCallable = httpsCallable(functions, "processFeePaymentCallable");
      await processFeePaymentCallable({
        teamId,
        memberId: member.id,
        month: currentMonth,
        amount: member.monthlyFee || 20000,
      });

      // 화면 즉시 반영
      setFeeStatuses({
        ...feeStatuses,
        [member.id]: {
          paid: true,
          amount: member.monthlyFee || 20000,
          paidAt: new Date(),
        },
      });

      // 회원 목록도 업데이트 (unpaidMonths 재계산됨)
      setMembers(
        members.map((m) =>
          m.id === member.id ? { ...m, unpaidMonths: 0 } : m
        )
      );
    } catch (error: any) {
      console.error("납부 처리 실패:", error);
      const errorMessage = error.message || "납부 처리에 실패했습니다.";
      
      // Pro 필요 에러인 경우 업그레이드 모달 표시
      if (errorMessage.includes("PRO_REQUIRED")) {
        setShowUpgradeModal(true);
      } else {
        alert(errorMessage);
      }
    } finally {
      setProcessing(null);
      setConfirmDialog({ show: false, member: null });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none md:mx-auto md:max-w-4xl py-6">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-700 mb-4"
          >
            ← 뒤로
          </button>
          <h1 className="text-2xl font-bold text-gray-900">회비 / 회계</h1>
          <p className="text-gray-600 mt-2">{monthName} 회비</p>
        </div>

        {/* 회원별 목록 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">회원별 납부 현황</h2>
          <div className="space-y-3">
            {members.map((member) => {
              const status = feeStatuses[member.id] || { paid: false };
              const isPaid = status.paid;
              const isProcessingMember = processing === member.id;

              return (
                <div
                  key={member.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    isPaid
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{member.name}</span>
                      {isPaid && (
                        <span className="text-green-600 text-sm">✔ 완료</span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      월회비: {(member.monthlyFee || 20000).toLocaleString()}원
                      {member.unpaidMonths > 0 && !isPaid && (
                        <span className="ml-2 text-red-600">
                          미납 {member.unpaidMonths}개월
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    {isPaid ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <span className="text-lg">✔</span>
                        <span className="text-sm">완료</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (isAdmin) {
                            setConfirmDialog({ show: true, member });
                          } else if (!isProPlan) {
                            setShowUpgradeModal(true);
                          } else {
                            alert("관리자만 납부 완료 처리를 할 수 있습니다.");
                          }
                        }}
                        disabled={isProcessingMember}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          isAdmin
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                        title={
                          isAdmin
                            ? ""
                            : !isProPlan
                            ? "관리자 전용 + Pro 기능 안내"
                            : "관리자 전용 기능입니다"
                        }
                      >
                        {isAdmin ? (
                          <span className="flex items-center gap-2">
                            <span>납부 완료</span>
                            {plan === "free" && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-white/30 border border-white/40">
                                수동
                              </span>
                            )}
                          </span>
                        ) : (
                          <>
                            <span>🔒 납부 완료</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 확인 다이얼로그 */}
        {confirmDialog.show && confirmDialog.member && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">회비 납부 확인</h2>
              <div className="space-y-3 mb-6">
                <div>
                  <span className="text-gray-600">회원:</span>
                  <span className="ml-2 font-medium">{confirmDialog.member.name}</span>
                </div>
                <div>
                  <span className="text-gray-600">월:</span>
                  <span className="ml-2 font-medium">{monthName}</span>
                </div>
                <div>
                  <span className="text-gray-600">금액:</span>
                  <span className="ml-2 font-medium">
                    {(confirmDialog.member.monthlyFee || 20000).toLocaleString()}원
                  </span>
                </div>
              </div>
              <p className="text-gray-700 mb-6">
                이 회원의 회비를 <strong>'납부 완료'</strong>로 처리할까요?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDialog({ show: false, member: null })}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={isProcessingMember}
                >
                  취소
                </button>
                <button
                  onClick={() => handlePaymentComplete(confirmDialog.member!)}
                  disabled={isProcessingMember}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isProcessingMember ? "처리 중..." : "확인"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pro 업그레이드 모달 */}
        {showUpgradeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Pro 플랜 필요</h2>
              <p className="text-gray-700 mb-4">
                회비 납부 처리는 <strong>Pro 플랜</strong>에서만 사용할 수 있습니다.
              </p>
              <p className="text-sm text-gray-600 mb-6">
                Pro 플랜으로 업그레이드하시면 회비 납부 처리를 포함한 모든 기능을 사용하실 수 있습니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  닫기
                </button>
                <button
                  onClick={() => {
                    // TODO: 업그레이드 페이지로 이동
                    setShowUpgradeModal(false);
                    alert("업그레이드 페이지로 이동합니다.");
                  }}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  업그레이드
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

