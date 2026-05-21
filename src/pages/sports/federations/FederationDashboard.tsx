import { useParams } from "react-router-dom";
import Header from "@/layout/Header";

export default function FederationDashboard() {
  const { federationSlug } = useParams<{ federationSlug: string }>();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            노원구 축구협회
          </h1>
          <p className="mt-2 text-gray-600">
            협회 운영 대시보드
          </p>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">4</div>
            <div className="text-sm text-gray-500 mt-1">진행중 리그</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">24</div>
            <div className="text-sm text-gray-500 mt-1">참가 팀</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">66</div>
            <div className="text-sm text-gray-500 mt-1">총 경기</div>
          </div>
        </div>

        {/* 빠른 액션 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">빠른 액션</h2>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              리그 생성
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              시즌 생성
            </button>
            <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
              공지 작성
            </button>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              팀 승인
            </button>
          </div>
        </div>

        {/* 진행중 리그 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">진행중 리그</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-semibold">노원구 K7 리그</div>
                <div className="text-sm text-gray-500">
                  2025 전반기 · 12팀 · 36경기
                </div>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                관리하기
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-semibold">노원구 주말리그</div>
                <div className="text-sm text-gray-500">
                  2025 하반기 · 8팀 · 0경기
                </div>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                관리하기
              </button>
            </div>
          </div>
        </div>

        {/* 승인 대기 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">승인 대기</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">3</div>
              <div className="text-sm text-gray-500">팀 신청</div>
            </div>
            <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
              승인하기
            </button>
          </div>
        </div>

        {/* 오늘 경기 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">오늘 경기</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-semibold">Tigers vs Lions</div>
                <div className="text-sm text-gray-500">
                  15:00 · 마들스타디움
                </div>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                경기 관리
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-semibold">Eagles vs Hawks</div>
                <div className="text-sm text-gray-500">
                  17:00 · 마들스타디움
                </div>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                경기 관리
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
