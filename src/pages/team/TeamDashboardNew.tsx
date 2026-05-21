// src/pages/team/TeamDashboardNew.tsx
// 🔥 Step 2: 팀 관리 MVP 화면 (1차 완성 목표)
// 📍 URL: /football/team/dashboard

import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Paywall from "@/components/Paywall";

interface Team {
  id: string;
  name: string;
  sportType: string;
  ownerUid: string;
  plan: "free" | "pro";
}

interface TeamMember {
  id: string;
  uid: string;
  role: "admin" | "member";
}

export default function TeamDashboardNew() {
  const { type } = useParams<{ type: string }>();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState<
    "unpaid_notification" | "payment_link" | "attendance_stats" | "multiple_admins" | undefined
  >(undefined);

  // 🔥 팀 정보 조회
  useEffect(() => {
    if (!user?.uid || !type) return;

    const fetchTeam = async () => {
      try {
        // 🔥 teams 컬렉션에서 직접 ownerUid + sportType으로 필터링
        const teamsQuery = query(
          collection(db, "teams"),
          where("ownerUid", "==", user.uid),
          where("sportType", "==", type)
        );
        const teamsSnapshot = await getDocs(teamsQuery);

        if (!teamsSnapshot.empty) {
          // 첫 번째 팀 선택
          const teamDoc = teamsSnapshot.docs[0];
          const teamData = teamDoc.data();
          const teamId = teamDoc.id;

          setTeam({
            id: teamId,
            name: teamData.name || "",
            sportType: teamData.sportType || type,
            ownerUid: teamData.ownerUid || "",
            plan: (teamData.plan as "free" | "pro") || "free",
          });

          // 🔥 팀원 목록 조회
          const teamMembersQuery = query(
            collection(db, "team_members"),
            where("teamId", "==", teamId)
          );
          const teamMembersSnapshot = await getDocs(teamMembersQuery);
          const membersList: TeamMember[] = [];
          teamMembersSnapshot.forEach((doc) => {
            const data = doc.data();
            membersList.push({
              id: doc.id,
              uid: data.uid || "",
              role: (data.role as "admin" | "member") || "member",
            });
          });
          setMembers(membersList);
        } else {
          // 해당 sportType의 팀이 없음
          setTeam(null);
          setMembers([]);
        }
      } catch (error) {
        console.error("팀 정보 조회 실패:", error);
        setTeam(null);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [user?.uid, type]);

  // 🔥 Step 3: 요금제 강제 포인트
  const handleProFeature = (trigger: typeof paywallTrigger) => {
    if (team?.plan === "free") {
      setPaywallTrigger(trigger);
      setPaywallOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">팀 정보를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none md:mx-auto md:max-w-3xl py-6">
        {/* 🔥 Step 2: 화면 구성 (최소·강력) */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FC {team.name} 팀 관리</h1>
              {team.plan === "free" && (
                <p className="text-sm text-gray-500 mt-1">무료 플랜</p>
              )}
            </div>
            {/* 🔥 Step 3: Pro 배지 노출 조건 */}
            {team.plan === "free" && (
              <button
                onClick={() => {
                  setPaywallTrigger("multiple_admins");
                  setPaywallOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                ⭐ Pro 업그레이드
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* 👥 팀원 관리 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">👥</span>
              팀원 관리
            </h2>
            <div className="space-y-2">
              {members.length === 0 ? (
                <p className="text-gray-500">팀원이 없습니다.</p>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{member.uid}</p>
                      <p className="text-sm text-gray-500">{member.role === "admin" ? "관리자" : "팀원"}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 💰 회비 / 회계 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">💰</span>
              회비 / 회계
            </h2>
            {team.plan === "free" ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">🔒 Pro 전용 기능입니다</p>
                <button
                  onClick={() => handleProFeature("unpaid_notification")}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Pro로 업그레이드
                </button>
              </div>
            ) : (
              <p className="text-gray-500">회비 관리 기능 (준비중)</p>
            )}
          </div>

          {/* 📅 일정 관리 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">📅</span>
              일정 관리
            </h2>
            <p className="text-gray-500">일정 관리 기능 (준비중)</p>
          </div>

          {/* 📢 공지 / 알림 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">📢</span>
              공지 / 알림
            </h2>
            {team.plan === "free" ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">🔒 Pro 전용 기능입니다</p>
                <button
                  onClick={() => handleProFeature("unpaid_notification")}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Pro로 업그레이드
                </button>
              </div>
            ) : (
              <p className="text-gray-500">공지 / 알림 기능 (준비중)</p>
            )}
          </div>

          {/* 📊 출석 리포트 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">📊</span>
              출석 리포트
            </h2>
            {team.plan === "free" ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">🔒 Pro 전용 기능입니다</p>
                <button
                  onClick={() => handleProFeature("attendance_stats")}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Pro로 업그레이드
                </button>
              </div>
            ) : (
              <p className="text-gray-500">출석 리포트 기능 (준비중)</p>
            )}
          </div>

          {/* ⚙ 팀 설정 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">⚙</span>
              팀 설정
            </h2>
            <p className="text-gray-500">팀 설정 기능 (준비중)</p>
          </div>
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
    </div>
  );
}

