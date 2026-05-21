// src/pages/team/TeamFeeDetailPage.tsx
// 💰 월별 회비 상세 화면
// 회원별 납부 현황 및 납부 완료 처리

import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  status: "active" | "paused" | "expelled";
  feePlan: "monthly" | "annual" | "exempt";
  unpaidMonths: number;
  monthlyFee?: number;
}

interface FeeItem {
  paid: boolean;
  amount?: number;
  paidAt?: any;
}

export default function TeamFeeDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { myTeam, role, plan } = useTeam();
  const { user } = useAuth();
  
  // 🔥 month 파라미터 (없으면 서울 달력 당월)
  const currentMonth = teamFeeCurrentSeoulMonthKey();
  const monthParam = searchParams.get("month") || currentMonth;
  const [selectedMonth, setSelectedMonth] = useState(monthParam);
  
  const [members, setMembers] = useState<Member[]>([]);
  const [feeItems, setFeeItems] = useState<{ [memberId: string]: FeeItem }>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    member: Member | null;
  }>({ show: false, member: null });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [year, month] = selectedMonth.split("-").map(Number);
  const monthName = `${year}년 ${month}월`;
  const isAdmin = role === "admin";
  const isProPlan = plan === "pro";
  const allowManualFee = myTeam?.allowManualFee === true;

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
            status: data.status || "active",
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

  // 🔥 해당 월 fee 조회 (새 구조: fees/{YYYY-MM}/items/{memberId})
  useEffect(() => {
    if (!teamId || members.length === 0 || !selectedMonth) return;

    const fetchFees = async () => {
      try {
        const itemsRef = collection(
          db,
          "teams",
          teamId,
          "fees",
          selectedMonth,
          "items"
        );
        const snapshot = await getDocs(itemsRef);
        const items: { [memberId: string]: FeeItem } = {};

        snapshot.forEach((doc) => {
          const data = doc.data();
          items[doc.id] = {
            paid: data.paid || false,
            amount: data.amount,
            paidAt: data.paidAt,
          };
        });

        setFeeItems(items);
      } catch (error) {
        console.error("fee 조회 실패:", error);
        // fee 컬렉션이 없으면 빈 객체 (모두 미납)
        setFeeItems({});
      }
    };

    fetchFees();
  }, [teamId, members, selectedMonth]);

  // 🔥 month 변경 시 URL 동기화
  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    // URL query 업데이트
    setSearchParams({ month: newMonth }, { replace: true });
  };

  // 🔥 납부 완료 처리
  const handlePaymentComplete = async (member: Member) => {
    if (!teamId || !user?.uid) return;

    setProcessing(member.id);
    try {
      // 🔥 Functions region 확인 로그
      console.log("🔥 [TeamFeeDetailPage] Functions 호출 시작");
      console.log("🔥 [TeamFeeDetailPage] functions 객체:", functions);
      console.log("🔥 [TeamFeePaymentPage] functions region:", functions.region || "기본값");
      console.log("🔥 [TeamFeeDetailPage] 호출 파라미터:", {
        teamId,
        memberId: member.id,
        month: selectedMonth,
        amount: member.monthlyFee || 20000,
      });
      
      const processFeePaymentCallable = httpsCallable(functions, "processFeePaymentCallable");
      console.log("🔥 [TeamFeeDetailPage] httpsCallable 생성 완료");
      
      const result = await processFeePaymentCallable({
        teamId,
        memberId: member.id,
        month: selectedMonth,
        amount: member.monthlyFee || 20000,
      });
      
      console.log("✅ [TeamFeeDetailPage] Functions 호출 성공:", result.data);

      // 화면 즉시 반영
      setFeeItems({
        ...feeItems,
        [member.id]: {
          paid: true,
          amount: member.monthlyFee || 20000,
          paidAt: new Date(),
        },
      });
    } catch (error: any) {
      console.error("납부 처리 실패:", error);
      const errorMessage = error.message || "납부 처리에 실패했습니다.";
      alert(errorMessage);
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
      <div className="w-full max-w-none md:mx-auto md:max-w-6xl py-6">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-700 mb-4"
          >
            ← 회비 / 회계로 돌아가기
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{monthName} 회비 상세</h1>
              <p className="text-gray-600 mt-1">회원별 납부 현황</p>
            </div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        {/* 회원 목록 테이블 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    회비
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    납부 여부
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.map((member) => {
                  const fee = feeItems[member.id];
                  const isPaid = fee?.paid === true;
                  const isProcessingMember = processing === member.id;
                  const canManualPay = isAdmin && (isProPlan || allowManualFee);

                  return (
                    <tr
                      key={member.id}
                      className={isPaid ? "bg-green-50" : ""}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {member.status === "active" ? "재원" : 
                           member.status === "paused" ? "휴원" : "제명"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {(member.monthlyFee || 20000).toLocaleString()}원
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          isPaid ? "text-green-600" : "text-red-600"
                        }`}>
                          {isPaid ? "완납" : "미납"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isPaid ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <span className="text-lg">✔</span>
                            <span>완료</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (canManualPay) {
                                setConfirmDialog({ show: true, member });
                              } else if (!isProPlan) {
                                // FREE + Non-admin: 업그레이드/권한 안내
                                setShowUpgradeModal(true);
                              } else {
                                alert("관리자만 납부 완료 처리를 할 수 있습니다.");
                              }
                            }}
                            disabled={isProcessingMember || !canManualPay}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                              canManualPay
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            }`}
                            title={
                              canManualPay
                                ? ""
                                : !isProPlan
                                ? "관리자 전용 + Free 플랜 (수동 허용 필요)"
                                : "관리자 전용 기능입니다"
                            }
                          >
                            {canManualPay ? (
                              <span className="flex items-center gap-2">
                                <span>납부 완료</span>
                                {!isProPlan && (
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                  disabled={processing === confirmDialog.member.id}
                >
                  취소
                </button>
                <button
                  onClick={() => handlePaymentComplete(confirmDialog.member!)}
                  disabled={processing === confirmDialog.member.id}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {processing === confirmDialog.member.id ? "처리 중..." : "확인"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 업그레이드 / 권한 안내 모달 (FREE + Non-admin) */}
        {showUpgradeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">권한 및 플랜 안내</h2>
              <p className="text-gray-700 mb-4">
                회비 납부 처리는 <strong>팀 관리자(총무/운영)</strong>만 직접 처리할 수 있습니다.
              </p>
              <p className="text-sm text-gray-600 mb-6">
                현재 팀은 <strong>{plan === "pro" ? "Pro" : "Free"}</strong> 플랜입니다.{" "}
                Free 플랜에서도 관리자는 수동으로 납부 완료 처리를 할 수 있고,{" "}
                Pro 플랜에서는 자동 알림·리포트 등 추가 기능을 사용할 수 있습니다.
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
                    setShowUpgradeModal(false);
                    // TODO: 업그레이드 페이지로 이동
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

