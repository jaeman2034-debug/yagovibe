import { useNavigate } from "react-router-dom";
import Header from "@/layout/Header";
import { Building2, MapPin, Users, Trophy } from "lucide-react";

export default function FederationListPage() {
  const navigate = useNavigate();

  // 예시 협회 데이터 (실제로는 Firestore에서 가져옴)
  const federations = [
    {
      id: "nowon-football",
      name: "노원구 축구협회",
      region: "서울 노원구",
      leagueCount: 4,
      teamCount: 24,
      description: "노원구 지역 축구 리그 및 팀 운영",
    },
    {
      id: "seoul-futsal",
      name: "서울시 풋살협회",
      region: "서울 전체",
      leagueCount: 2,
      teamCount: 16,
      description: "서울시 풋살 리그 운영",
    },
    {
    id: "korea-sports",
      name: "한국 생활체육연맹",
      region: "전국",
      leagueCount: 8,
      teamCount: 120,
      description: "전국 생활체육 리그 운영",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            협회 플랫폼
          </h1>
          <p className="text-gray-500 text-lg">
            리그 및 협회 운영 플랫폼
          </p>
        </div>

        {/* 협회 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {federations.map((federation) => (
            <div
              key={federation.id}
              onClick={() => navigate(`/activity/federations/${federation.id}`)}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {federation.name}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <MapPin className="w-4 h-4" />
                      {federation.region}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                {federation.description}
              </p>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <Trophy className="w-4 h-4" />
                  <span>{federation.leagueCount}개 리그</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{federation.teamCount}개 팀</span>
                </div>
              </div>

              <button className="mt-4 w-full px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors">
                협회 보기
              </button>
            </div>
          ))}
        </div>

        {/* 빈 상태 (협회가 없을 때) */}
        {federations.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">등록된 협회가 없습니다</p>
          </div>
        )}
      </main>
    </div>
  );
}
