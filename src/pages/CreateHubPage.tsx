/**
 * 🔥 CreateHubPage - 글로벌 글쓰기 허브
 * 
 * 역할:
 * - 모든 FAB 클릭 시 진입 (단일 진입점)
 * - 작성 타입 선택 (일정/팀/거래)
 * - 각 타입별 작성 페이지로 이동
 * 
 * 설계 원칙:
 * - FAB는 항상 /create로 이동
 * - 글쓰기 선택은 여기서만 처리
 * - 기능 라우트는 각 도메인에 유지
 * - Back navigation 정상화
 */

import { useNavigate } from "react-router-dom";
import { Calendar, Users, ShoppingBag } from "lucide-react";

export default function CreateHubPage() {
  const navigate = useNavigate();

  const createOptions = [
    {
      id: "schedule",
      label: "일정 만들기",
      description: "팀 일정, 대회 등록",
      icon: Calendar,
      path: "/activity/schedule/create",
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      id: "team",
      label: "팀 만들기",
      description: "새로운 팀 생성",
      icon: Users,
      path: "/sports/soccer/team/create",
      color: "bg-green-600 hover:bg-green-700",
    },
    {
      id: "trade",
      label: "거래 글쓰기",
      description: "중고 장비, 용품 판매",
      icon: ShoppingBag,
      path: "/trade/create",
      color: "bg-blue-600 hover:bg-blue-700",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">작성하기</h1>
          <p className="text-gray-600">작성할 내용을 선택해주세요</p>
        </div>

        {/* 작성 옵션 그리드 */}
        <div className="grid gap-4">
          {createOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => navigate(option.path)}
                className={`
                  ${option.color}
                  text-white
                  rounded-lg
                  p-6
                  text-left
                  transition-colors
                  shadow-md
                  hover:shadow-lg
                  flex
                  items-center
                  gap-4
                `}
              >
                <div className="flex-shrink-0">
                  <Icon size={32} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{option.label}</h3>
                  <p className="text-sm opacity-90">{option.description}</p>
                </div>
                <div className="flex-shrink-0">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        {/* 취소 버튼 */}
        <div className="mt-8">
          <button
            onClick={() => navigate(-1)}
            className="w-full py-3 px-4 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
