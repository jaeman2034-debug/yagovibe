/**
 * 🔥 CreateTeamIntro - 팀 생성 소개 페이지
 * 
 * 역할:
 * - 신규 유저 (팀 0개)에게 표시
 * - 팀 생성 CTA 제공
 * - 부담 없는 온보딩 UX
 */

import { useNavigate } from "react-router-dom";
import { Plus, Users, Trophy } from "lucide-react";

export function CreateTeamIntro() {
  const navigate = useNavigate();

  const handleCreateTeam = () => {
    navigate("/sports/soccer/team/create");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="w-full max-w-none md:max-w-3xl text-center space-y-8">
        {/* 로고/아이콘 */}
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
            <Users className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* 제목 */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            첫 팀을 만들어보세요
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            팀과 함께 스포츠 활동을 시작하고<br />
            일정과 기록을 관리하세요
          </p>
        </div>

        {/* 기능 소개 */}
        <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
          <div className="flex items-start gap-4 text-left">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                팀원 관리
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                멤버 초대 및 역할 관리
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 text-left">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                일정 관리
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                경기 일정 및 출석 기록
              </p>
            </div>
          </div>
        </div>

        {/* CTA 버튼 */}
        <button
          onClick={handleCreateTeam}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg shadow-lg transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          팀 만들기
        </button>

        {/* 부가 안내 */}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          무료로 시작할 수 있습니다
        </p>
      </div>
    </div>
  );
}
