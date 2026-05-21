// src/pages/team/CreateTeamCTA.tsx
// 🔥 Step 4: CreateTeamCTA (팀 없는 유저)
// 목표: 1분 안에 팀 생성

import { useNavigate, useParams } from "react-router-dom";
import { normalizeSportId } from "@/constants/sports";

export default function CreateTeamCTA() {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();

  const handleCreateTeam = () => {
    const slug = normalizeSportId(type) ?? "soccer";
    navigate(`/sports/${encodeURIComponent(slug)}/team/create`);
  };

  return (
    <div className="min-h-[70vh] bg-gray-50 flex flex-col items-center justify-center px-4 py-24">
      <div className="w-full max-w-none text-center md:max-w-md">
        <div className="text-6xl mb-6">⚽</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">아직 팀이 없어요</h1>
        <p className="text-gray-600 mb-8">새로운 팀을 만들고 관리하세요.</p>
        <button
          onClick={handleCreateTeam}
          className="w-full max-w-[280px] mx-auto py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg shadow-lg transition-all hover:shadow-xl"
        >
          팀 만들기
        </button>
      </div>
    </div>
  );
}

