// src/pages/team/TeamHealthDashboard.tsx
// 🔥 운영 건강도 대시보드 (회장용): 한 화면에 딱 6개 지표

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTeam } from "@/context/TeamContext";
import { useAuth } from "@/context/AuthProvider";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { type TeamMember } from "@/utils/teamRules";
import { scanTeamMemberHealth, type MemberHealthStatus } from "@/utils/memberHealthMonitor";
import { executeYearTransition, checkYearTransitionNeeded } from "@/utils/yearTransition";

export default function TeamHealthDashboard() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { myTeam, role } = useTeam();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<{
    totalMembers: number;
    activeMembers: number;
    executiveCount: number;
    collectionRate: number; // 이번 달 수납률 %
    unpaidCount: number;
    pausedCount: number;
    attentionNeeded: MemberHealthStatus[];
  } | null>(null);
  const [yearTransitionNeeded, setYearTransitionNeeded] = useState(false);

  // 🔥 회장/총무/관리자만 접근 가능
  useEffect(() => {
    if (role !== "회장" && role !== "총무" && role !== "admin") {
      navigate(`/sports/${type}/team`);
    }
  }, [role, navigate, type]);

  // 🔥 건강도 데이터 로드
  useEffect(() => {
    if (!myTeam?.id) return;

    const loadHealthData = async () => {
      setLoading(true);
      try {
        // 1. 전체 회원 조회
        const membersRef = collection(db, "teams", myTeam.id, "members");
        const membersSnapshot = await getDocs(membersRef);
        const members: TeamMember[] = [];
        membersSnapshot.forEach((doc) => {
          members.push({
            id: doc.id,
            ...doc.data(),
          } as TeamMember);
        });

        // 2. 기본 지표 계산
        const totalMembers = members.length;
        const activeMembers = members.filter((m) => m.status === "active").length;
        const executiveCount = members.filter((m) =>
          ["회장", "부회장", "총무", "감독", "코치", "상벌위원장"].includes(m.role)
        ).length;
        const unpaidCount = members.filter((m) => (m.unpaidMonths || 0) > 0).length;
        const pausedCount = members.filter((m) => m.status === "paused").length;

        // 3. 이번 달 수납률 계산
        const now = new Date();
        const yyyymm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const ledgerRef = collection(db, "teams", myTeam.id, "ledger", yyyymm, "items");
        const ledgerSnapshot = await getDocs(ledgerRef);

        let totalDue = 0;
        let totalPaid = 0;

        ledgerSnapshot.forEach((doc) => {
          const data = doc.data();
          totalDue += data.dueAmount || 0;
          totalPaid += data.paidAmount || 0;
        });

        const collectionRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 100;

        // 4. 주의 필요 회원 스캔
        const attentionNeeded = await scanTeamMemberHealth(myTeam.id);
        const needsAttention = attentionNeeded.filter((s) => s.needsAttention);

        setHealthData({
          totalMembers,
          activeMembers,
          executiveCount,
          collectionRate,
          unpaidCount,
          pausedCount,
          attentionNeeded: needsAttention,
        });

        // 5. 연도 전환 필요 여부 체크
        const transitionCheck = await checkYearTransitionNeeded(myTeam.id);
        setYearTransitionNeeded(transitionCheck.needed);
      } catch (error) {
        console.error("건강도 데이터 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadHealthData();
  }, [myTeam?.id]);

  // 🔥 연도 전환 실행
  const handleYearTransition = async () => {
    if (!myTeam?.id || !window.confirm("연도 전환을 실행하시겠습니까? (연회비 연도 리셋)")) return;

    try {
      const currentYear = new Date().getFullYear();
      await executeYearTransition(myTeam.id, currentYear, false); // 미납 개월은 리셋 안 함 (정관 기준)
      alert("연도 전환이 완료되었습니다.");
      setYearTransitionNeeded(false);
      // 데이터 새로고침
      window.location.reload();
    } catch (error) {
      console.error("연도 전환 실패:", error);
      alert("연도 전환에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">건강도 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">데이터를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none md:mx-auto md:max-w-4xl py-6">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/sports/${type}/team`)}
            className="text-blue-600 hover:text-blue-700 mb-4"
          >
            ← 뒤로
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">운영 건강도 대시보드</h1>
            {yearTransitionNeeded && (
              <button
                onClick={handleYearTransition}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                연도 전환 실행
              </button>
            )}
          </div>
        </div>

        {/* 🔥 6개 핵심 지표 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {/* 전체 회원 수 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500 mb-2">전체 회원 수</p>
            <p className="text-3xl font-bold text-gray-900">{healthData.totalMembers}명</p>
          </div>

          {/* 활성 회원 수 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500 mb-2">활성 회원 수</p>
            <p className="text-3xl font-bold text-green-600">{healthData.activeMembers}명</p>
            <p className="text-xs text-gray-400 mt-1">
              {healthData.totalMembers > 0
                ? Math.round((healthData.activeMembers / healthData.totalMembers) * 100)
                : 0}
              % 활성률
            </p>
          </div>

          {/* 임원 수 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500 mb-2">임원 수</p>
            <p className="text-3xl font-bold text-blue-600">{healthData.executiveCount}명</p>
          </div>

          {/* 이번 달 수납률 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500 mb-2">이번 달 수납률</p>
            <p className={`text-3xl font-bold ${healthData.collectionRate >= 80 ? "text-green-600" : healthData.collectionRate >= 60 ? "text-yellow-600" : "text-red-600"}`}>
              {healthData.collectionRate}%
            </p>
          </div>

          {/* 미납자 수 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500 mb-2">미납자 수</p>
            <p className={`text-3xl font-bold ${healthData.unpaidCount === 0 ? "text-green-600" : "text-red-600"}`}>
              {healthData.unpaidCount}명
            </p>
          </div>

          {/* 휴원자 수 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500 mb-2">휴원자 수</p>
            <p className={`text-3xl font-bold ${healthData.pausedCount === 0 ? "text-green-600" : "text-orange-600"}`}>
              {healthData.pausedCount}명
            </p>
          </div>
        </div>

        {/* 주의 필요 회원 목록 */}
        {healthData.attentionNeeded.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              ⚠️ 주의 필요 회원 ({healthData.attentionNeeded.length}명)
            </h2>
            <div className="space-y-3">
              {healthData.attentionNeeded.map((status) => (
                <div
                  key={status.memberId}
                  className="border border-orange-200 rounded-lg p-4 bg-orange-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{status.memberName}</h3>
                    <span className="px-3 py-1 bg-orange-200 text-orange-800 rounded-full text-xs font-medium">
                      위험도 {status.inactiveScore}점
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {status.flags.map((flag, idx) => (
                      <span key={idx} className="mr-2">
                        • {flag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 연도 전환 알림 */}
        {yearTransitionNeeded && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-yellow-900">연도 전환 필요</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  새해가 되었습니다. 연회비 연도를 리셋하시겠습니까?
                </p>
              </div>
              <button
                onClick={handleYearTransition}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                실행
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


