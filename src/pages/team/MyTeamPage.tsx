/**
 * 🔥 내 팀 페이지 (YAGO v2)
 * 
 * 탭 구조:
 * - 일정 (기본)
 * - 멤버
 * - 기록
 * - 공지
 * 
 * 라우트:
 * - /sports/{type}/team → 기본: 일정 탭
 * - /sports/{type}/team/schedule → 일정 목록
 * - /sports/{type}/team/schedule/new → 일정 생성
 * - /sports/{type}/team/schedule/{id} → 일정 상세
 */

import { useParams, useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import { Calendar, Users, Trophy, Bell, Activity } from "lucide-react";
import { ScheduleTab } from "@/components/team/schedule/ScheduleTab";
import { TeamMembersTab } from "@/components/team/TeamMembersTab";
import { TeamRecordsTab } from "@/components/team/TeamRecordsTab";
import { TeamNoticesTab } from "@/components/team/TeamNoticesTab";
import { ActivityFeedTab } from "@/components/team/ActivityFeedTab";

export default function MyTeamPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { teamMembers, loading: teamsLoading } = useMyTeams();
  const [currentTeam, setCurrentTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 현재 종목의 팀 찾기 및 팀 정보 조회
  useEffect(() => {
    if (teamsLoading || !type) return;

    const findTeam = async () => {
      try {
        // 현재 종목의 팀 멤버 찾기
        const teamMember = teamMembers.find((tm) => {
          // teamId로 teams 컬렉션에서 팀 정보 조회
          return tm.teamId;
        });

        if (!teamMember) {
          setCurrentTeam(null);
          setLoading(false);
          return;
        }

        // 팀 정보 조회
        const teamRef = doc(db, "teams", teamMember.teamId);
        const teamSnap = await getDoc(teamRef);
        
        if (teamSnap.exists()) {
          const teamData = teamSnap.data();
          // 종목 일치 확인
          if (teamData.sportType === type) {
            setCurrentTeam({
              teamId: teamSnap.id,
              ...teamData,
            });
          } else {
            setCurrentTeam(null);
          }
        } else {
          setCurrentTeam(null);
        }
      } catch (error) {
        console.error("팀 정보 조회 실패:", error);
        setCurrentTeam(null);
      } finally {
        setLoading(false);
      }
    };

    findTeam();
  }, [teamMembers, type, teamsLoading]);

  // 로딩 중
  if (loading || teamsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 로그인 체크
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900 mb-2">로그인이 필요합니다</p>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  // 팀이 없으면 팀 생성/찾기로 유도
  if (!currentTeam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-none text-center md:mx-auto md:max-w-3xl">
          <p className="text-lg font-semibold text-gray-900 mb-2">소속된 팀이 없습니다</p>
          <p className="text-gray-600 mb-6">팀을 만들거나 팀에 가입해주세요</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(`/sports/${type}/team/create`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              팀 만들기
            </button>
            <button
              onClick={() => navigate(`/teams/search?type=${type}`)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              팀 찾기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 현재 활성 탭 결정
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes("/activity")) return "activity";
    if (path.includes("/schedule")) return "schedule";
    if (path.includes("/members")) return "members";
    if (path.includes("/records")) return "records";
    if (path.includes("/notices")) return "notices";
    return "activity"; // 기본: 활동 피드
  };

  const activeTab = getActiveTab();

  const tabs = [
    { id: "activity", label: "활동", icon: Activity, path: `/sports/${type}/team/activity` },
    { id: "schedule", label: "일정", icon: Calendar, path: `/sports/${type}/team/schedule` },
    { id: "members", label: "멤버", icon: Users, path: `/sports/${type}/team/members` },
    { id: "records", label: "기록", icon: Trophy, path: `/sports/${type}/team/records` },
    { id: "notices", label: "공지", icon: Bell, path: `/sports/${type}/team/notices` },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="w-full max-w-none md:mx-auto md:max-w-3xl py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{currentTeam.name}</h1>
              <p className="text-sm text-gray-500">{currentTeam.region || ""}</p>
            </div>
            <button
              onClick={() => navigate(`/sports/${type}`)}
              className="text-gray-600 hover:text-gray-900"
            >
              ← 뒤로
            </button>
          </div>

          {/* 탭 네비게이션 */}
          <div className="flex gap-1 border-b border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="w-full max-w-none md:mx-auto md:max-w-3xl py-6">
        <Routes>
          <Route index element={<Navigate to={`/sports/${type}/team/activity`} replace />} />
          <Route path="activity" element={<ActivityFeedTab teamId={currentTeam.teamId} sportType={type} />} />
          <Route path="schedule/*" element={<ScheduleTab teamId={currentTeam.teamId} />} />
          <Route path="members" element={<TeamMembersTab teamId={currentTeam.teamId} />} />
          <Route path="records" element={<TeamRecordsTab teamId={currentTeam.teamId} />} />
          <Route path="notices" element={<TeamNoticesTab teamId={currentTeam.teamId} />} />
        </Routes>
      </div>
    </div>
  );
}
