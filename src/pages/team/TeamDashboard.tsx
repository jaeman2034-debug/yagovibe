// src/pages/team/TeamDashboard.tsx
// 🔥 Step 14: 상태 안정화 (튕김/리셋 방지 최종)
// 🔥 Step 15: UX 마감 (딱 3개)

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTeam } from "@/context/TeamContext";
import SeniorModeToggle from "@/components/SeniorModeToggle";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Paywall from "@/components/Paywall";
import { track } from "@/lib/analytics";
import TeamBlogManagement from "@/components/team/TeamBlogManagement";
import { publicInviteLandingUrlStrict } from "@/lib/growth/teamInviteShare";
import { teamFeeCurrentSeoulMonthKey } from "@/lib/fees/seoulFeeMonthKey";

interface TeamMember {
  id: string;
  name: string;
  role: "admin" | "member";
}

interface Dues {
  amount: number;
  paid: number;
  unpaid: number;
}

type ViewMode = "dashboard" | "members" | "dues" | "schedule" | "attendance" | "blog";

export default function TeamDashboard() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { myTeam, role, plan, refreshTeam, seniorMode } = useTeam();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState<
    "unpaid_notification" | "payment_link" | "attendance_stats" | "multiple_admins" | undefined
  >(undefined);
  const [joinRequests, setJoinRequests] = useState(1);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // 🔥 팀 대시보드 진입 추적
  useEffect(() => {
    if (myTeam?.id) {
      track("team_dashboard_view", {
        teamId: myTeam.id,
        sportType: type,
      });
    }
  }, [myTeam?.id, type]);

  // 🔥 회비 요약 상태 (실제 Firestore 데이터 기반)
  const [dues, setDues] = useState<Dues>({
    amount: 0,
    paid: 0,
    unpaid: 0,
  });

  const dummyMembers: TeamMember[] = [
    { id: "1", name: "홍길동", role: "admin" },
    { id: "2", name: "김철수", role: "member" },
    { id: "3", name: "이영희", role: "member" },
    { id: "4", name: "박민수", role: "member" },
  ];

  // 🔥 팀원 목록 조회 (실제 구조: teams/{teamId}/members)
  useEffect(() => {
    if (!myTeam) return;

    const fetchMembers = async () => {
      try {
        const membersRef = collection(db, "teams", myTeam.id, "members");
        const snapshot = await getDocs(membersRef);
        const membersList: TeamMember[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          membersList.push({
            id: docSnap.id,
            name: data.name || data.uid || "이름 없음",
            role: (data.role as "admin" | "member") || "member",
          });
        });

        setMembers(membersList.length > 0 ? membersList : dummyMembers);
      } catch (error) {
        console.error("팀원 목록 조회 실패:", error);
        setMembers(dummyMembers);
      }
    };

    fetchMembers();
  }, [myTeam]);

  // 🔥 회비 요약 조회 (구조: teams/{teamId}/fees/{YYYY-MM}/members)
  useEffect(() => {
    if (!myTeam) return;

    const fetchFees = async () => {
      try {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(
          now.getMonth() + 1
        ).padStart(2, "0")}`;

        const feesRef = collection(
          db,
          "teams",
          myTeam.id,
          "fees",
          currentMonth,
          "members"
        );

        const snapshot = await getDocs(feesRef);

        let paid = 0;
        let unpaid = 0;
        let totalAmount = 0;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          const dueAmount = data.dueAmount ?? data.baseAmount ?? 0;
          const paidAmount = data.paidAmount ?? 0;
          const status = data.status ?? "unpaid";

          totalAmount += dueAmount;

          if (status === "paid" || paidAmount >= dueAmount) {
            paid++;
          } else {
            unpaid++;
          }
        });

        setDues({
          amount: totalAmount,
          paid,
          unpaid,
        });
      } catch (error) {
        console.error("회비 데이터 조회 실패:", error);
      }
    };

    fetchFees();
  }, [myTeam]);

  // 🔥 Step 6: 팀원 관리 화면 → 회원 관리 페이지로 리다이렉트 (Hook은 조건부 return 전에 호출)
  useEffect(() => {
    if (viewMode === "members" && myTeam) {
      navigate(`/sports/${type}/team/members`);
    }
  }, [viewMode, myTeam, navigate, type]);

  // 🔥 Step 7: Pro 기능 잠금 UX 고정
  const handleProFeature = (trigger: typeof paywallTrigger) => {
    if (plan === "free") {
      setPaywallTrigger(trigger);
      setPaywallOpen(true);
    } else {
      // 🔥 Step 10: Pro 플랜 → "준비중" 토스트
      setToastMessage("준비중입니다");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  // 🔥 Step 6: 팀원 초대 링크 복사
  const handleCopyInviteLink = () => {
    if (!myTeam) return;
    const inviteCode = myTeam.id;
    const inviteLink = publicInviteLandingUrlStrict(inviteCode);
    navigator.clipboard.writeText(inviteLink).then(() => {
      // 🔥 Step 15: 성공 토스트
      setToastMessage("초대 링크가 복사되었습니다");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    });
  };

  // 🔥 Step 12: 관리자 권한 체크 (대소문자 무시, 다양한 role 지원)
  const normalizedRole = (role || "").toLowerCase();
  const isAdmin = normalizedRole === "admin" || normalizedRole === "관리자" || normalizedRole === "owner";
  const isTreasurer = isAdmin || normalizedRole === "treasurer" || normalizedRole === "총무"; // 🔥 총무 권한 추가

  if (!myTeam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">팀 정보를 찾을 수 없습니다.</p>
      </div>
    );
  }

  // 🔥 Step 10: 회비(Pro) 탭
  if (viewMode === "dues") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-none md:mx-auto md:max-w-2xl py-6">
          <div className="mb-6">
            <button
              onClick={() => setViewMode("dashboard")}
              className="text-blue-600 hover:text-blue-700 mb-4"
            >
              ← 뒤로
            </button>
            <h1 className="text-2xl font-bold text-gray-900">💰 회비 / 회계</h1>
          </div>

          {/* 회비 정보 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">이번 달 회비</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">금액</span>
                <span className="font-bold text-gray-900">{dues.amount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">납부 완료</span>
                <span className="font-semibold text-green-600">{dues.paid}명</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">미납</span>
                <span className="font-semibold text-red-600">{dues.unpaid}명</span>
              </div>
            </div>

            {/* 이번 달 상세 보기 버튼 (요약 카드 하단) */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  if (!myTeam) return;
                  const currentMonth = teamFeeCurrentSeoulMonthKey();
                  navigate(`/team/${myTeam.id}/fee-detail?month=${currentMonth}`);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <span>이번 달 상세 보기</span>
                <span>▶</span>
              </button>
            </div>
          </div>

          {/* Pro 기능 버튼 */}
          <div className="space-y-3">
            <button
              onClick={() => handleProFeature("payment_link")}
              className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">회비 납부 링크 생성</h3>
                  <p className="text-sm text-gray-500 mt-1">결제 링크를 생성하고 공유하세요</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                  Pro
                </span>
              </div>
            </button>

            <button
              onClick={() => handleProFeature("unpaid_notification")}
              className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">미납자 알림 보내기</h3>
                  <p className="text-sm text-gray-500 mt-1">미납 회비가 있는 팀원에게 알림</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                  Pro
                </span>
              </div>
            </button>
          </div>
        </div>

        <Paywall
          isOpen={paywallOpen}
          onClose={() => setPaywallOpen(false)}
          trigger={paywallTrigger}
          plan="TEAM_PRO"
          price={29000}
        />

        {/* 🔥 Step 15: 토스트 */}
        {showToast && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg z-50">
            {toastMessage}
          </div>
        )}
      </div>
    );
  }

  // 🔥 Step X: 팀 블로그 관리 뷰
  if (viewMode === "blog") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-none md:mx-auto md:max-w-5xl py-6">
          <button
            onClick={() => setViewMode("dashboard")}
            className="text-blue-600 hover:text-blue-700 mb-4"
          >
            ← 뒤로
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">📝 팀 블로그</h1>
          <TeamBlogManagement teamId={myTeam.id} sportType={myTeam.sportType} />
        </div>
      </div>
    );
  }

  // 🔥 Step 11: 출석 체크 MVP
  if (viewMode === "attendance") {
    // 🔥 Step 12: 관리자 전용 기능 가드
    if (!isAdmin) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 mb-2">⚠️ 준비 중인 기능입니다</p>
            <p className="text-sm text-gray-400">관리자만 사용할 수 있습니다.</p>
          </div>
        </div>
      );
    }

    const attendanceData = [
      { name: "홍길동", checked: true },
      { name: "김철수", checked: false },
      { name: "이영희", checked: true },
    ];

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-none md:mx-auto md:max-w-2xl py-6">
          <div className="mb-6">
            <button
              onClick={() => setViewMode("dashboard")}
              className="text-blue-600 hover:text-blue-700 mb-4"
            >
              ← 뒤로
            </button>
            <h1 className="text-2xl font-bold text-gray-900">✅ 출석 체크</h1>
            <p className="text-gray-600 mt-2">7/21 연습</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-3">
              {attendanceData.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <span className="font-medium text-gray-900">{item.name}</span>
                  <span className="text-2xl">{item.checked ? "⭕" : "❌"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 🔥 Step 6: 팀원 관리 화면 → 회원 관리 페이지로 리다이렉트
  if (viewMode === "members") {
    // 🔥 useEffect는 이미 위에서 호출됨 (조건부 return 전)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">회원 관리 페이지로 이동 중...</p>
        </div>
      </div>
    );
  }

  // 🔥 Step 8: 일정 탭 (보기 전용)
  if (viewMode === "schedule") {
    const schedules = [
      { date: "7/21", day: "일", event: "연습" },
      { date: "7/28", day: "일", event: "경기" },
    ];

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-none md:mx-auto md:max-w-2xl py-6">
          <div className="mb-6">
            <button
              onClick={() => setViewMode("dashboard")}
              className="text-blue-600 hover:text-blue-700 mb-4"
            >
              ← 뒤로
            </button>
            <h1 className="text-2xl font-bold text-gray-900">📅 일정</h1>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-3">
              {schedules.map((schedule, index) => (
                <div
                  key={index}
                  className="flex items-center p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {schedule.date} ({schedule.day}) {schedule.event}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 🔥 메인 대시보드
  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`w-full py-6 md:mx-auto ${seniorMode ? "md:max-w-3xl" : "md:max-w-2xl"}`}>
        {/* 🔥 어르신 모드 토글 */}
        <div className="mb-4">
          <SeniorModeToggle />
        </div>
        
        {/* 상단 요약 카드 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className={`${seniorMode ? "text-4xl" : "text-2xl"} font-bold text-gray-900 mb-4`}>FC {myTeam.name}</h1>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">팀원</p>
              <p className="text-xl font-bold text-gray-900">{members.length || 18}명</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">이번 달 회비</p>
              <p className="text-xl font-bold text-gray-900">미납 3명</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">다음 경기</p>
              <p className="text-xl font-bold text-gray-900">7/21 (일)</p>
            </div>
          </div>

          {/* 🔥 Step 10: 팀 관리자 알림 */}
          {isAdmin && joinRequests > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <button
                onClick={() => {
                  if (plan === "free") {
                    handleProFeature("multiple_admins");
                  } else {
                    setToastMessage("승인 기능 준비중");
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 2000);
                  }
                }}
                className="flex items-center justify-between w-full"
              >
                <span className="text-sm font-medium text-yellow-900">
                  📩 팀 참여 요청 {joinRequests}건
                </span>
                <span className="text-xs text-yellow-600">→</span>
              </button>
            </div>
          )}
        </div>

        {/* 관리 액션 */}
        <div className={`space-y-${seniorMode ? "4" : "3"}`}>
          {/* 👥 팀원 관리 */}
          <button
            onClick={() => setViewMode("members")}
            className={`w-full bg-white rounded-lg shadow-md ${seniorMode ? "p-6 border-4 border-gray-400" : "p-4 border border-gray-200"} text-left hover:shadow-lg transition-shadow`}
          >
            <div className="flex items-center">
              <span className={`${seniorMode ? "text-4xl" : "text-2xl"} mr-3`}>👥</span>
              <div className="flex-1">
                <h3 className={`${seniorMode ? "text-3xl" : "text-lg"} font-bold text-gray-900`}>팀원 관리</h3>
                <p className={`${seniorMode ? "text-xl" : "text-sm"} text-gray-500 mt-1`}>팀원 초대 및 관리</p>
              </div>
            </div>
          </button>

          {/* 💰 회비 / 회계 (Pro) */}
          <button
            onClick={() => setViewMode("dues")}
            className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-3">💰</span>
                <div>
                  <h3 className="font-semibold text-gray-900">회비 / 회계</h3>
                  <p className="text-sm text-gray-500 mt-1">회비 수납 및 관리</p>
                  {plan === "free" && (
                    <p className="text-xs text-blue-600 mt-1">팀 운영을 자동화하세요</p>
                  )}
                </div>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                Pro
              </span>
            </div>
          </button>

          {/* 📝 팀 블로그 */}
          <button
            onClick={() => setViewMode("blog")}
            className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow border border-gray-200"
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">📝</span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">팀 블로그</h3>
                <p className="text-sm text-gray-500 mt-1">AI가 자동으로 관리하는 팀 홍보 블로그</p>
              </div>
              <span className="text-gray-400">▶</span>
            </div>
          </button>

          {/* 📅 일정 */}
          <button
            onClick={() => setViewMode("schedule")}
            className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow border border-gray-200"
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">📅</span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">일정</h3>
                <p className="text-sm text-gray-500 mt-1">경기 일정 관리</p>
              </div>
            </div>
          </button>

                  {/* 🔥 Step 11: 출석 체크 (관리자만) → 레벨 2: 출석 페이지로 이동 */}
                  {isAdmin && (
                    <button
                      onClick={() => navigate(`/sports/${type}/team/attendance`)}
                      className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow border border-gray-200"
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">✅</span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">출석 체크</h3>
                          <p className="text-sm text-gray-500 mt-1">팀원 출석 관리</p>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* 🔥 통합 엔진: 회비 정산 (총무용) */}
                  {isTreasurer && (
                    <button
                      onClick={() => navigate(`/sports/${type}/team/ledger`)}
                      className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow border border-gray-200"
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">💰</span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">월간 정산 실행</h3>
                          <p className="text-sm text-gray-500 mt-1">정산 실행 + 미납자 알림 자동 발송</p>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* 🔥 레벨 2: 회계 리포트 (보조) */}
                  {isTreasurer && (
                    <button
                      onClick={() => navigate(`/sports/${type}/team/accounting`)}
                      className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow border border-gray-200"
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">📊</span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">회계 리포트</h3>
                          <p className="text-sm text-gray-500 mt-1">월간 회비 정산 보고서</p>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* 🔥 레벨 2: 감사 로그 */}
                  {isAdmin && (
                    <button
                      onClick={() => navigate(`/sports/${type}/team/audit`)}
                      className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow border border-gray-200"
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">📋</span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">감사 로그</h3>
                          <p className="text-sm text-gray-500 mt-1">임원 변경 이력 및 감사 기록</p>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* 🔥 전자 총회·의결 (운영자용) */}
                  {isAdmin && (
                    <button
                      onClick={() => navigate(`/sports/${type}/team/assembly`)}
                      className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow border border-gray-200"
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">🗳️</span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">전자 총회·의결</h3>
                          <p className="text-sm text-gray-500 mt-1">총회 생성 및 안건 관리</p>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* 🔥 운영 건강도 대시보드 (회장/총무용) */}
                  {(role === "회장" || role === "총무" || role === "admin") && (
                    <button
                      onClick={() => navigate(`/sports/${type}/team/health`)}
                      className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow border border-gray-200"
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">📊</span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">운영 건강도</h3>
                          <p className="text-sm text-gray-500 mt-1">팀 상태 한눈에 보기</p>
                        </div>
                      </div>
                    </button>
                  )}

          {/* 🔥 전자 총회 투표 (회원용) */}
          <button
            onClick={() => navigate(`/sports/${type}/team/vote`)}
            className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow border border-gray-200"
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">🗳️</span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">총회 투표</h3>
                <p className="text-sm text-gray-500 mt-1">진행 중인 총회 안건 투표</p>
              </div>
            </div>
          </button>

          {/* 📢 공지 (Pro) */}
          <button
            onClick={() => handleProFeature("unpaid_notification")}
            className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-3">📢</span>
                <div>
                  <h3 className="font-semibold text-gray-900">공지</h3>
                  <p className="text-sm text-gray-500 mt-1">팀 공지 및 알림</p>
                  {plan === "free" && (
                    <p className="text-xs text-blue-600 mt-1">팀 운영을 자동화하세요</p>
                  )}
                </div>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                Pro
              </span>
            </div>
          </button>

        </div>
      </div>

      {/* Paywall 모달 */}
      <Paywall
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        trigger={paywallTrigger}
        plan="TEAM_PRO"
        price={29000}
      />

      {/* 🔥 Step 15: 토스트 */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
