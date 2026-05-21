/**
 * 🔥 FAB (Floating Action Button) - Create Center
 * 
 * 역할:
 * - 우측 하단 고정 플로팅 버튼
 * - 협회 생성, 팀 생성, 대회 생성, 이벤트 생성 등 빠른 생성 액션
 * - 클릭 시 메뉴 확장
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Building2,
  Users,
  Trophy,
  Calendar,
  UserPlus,
  X,
} from "lucide-react";

interface FabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

const fabItems: FabItem[] = [
  {
    id: "federation",
    label: "협회 생성",
    icon: <Building2 className="w-5 h-5" />,
    href: "/platform/federations/create",
    color: "bg-blue-600 hover:bg-blue-700",
  },
  {
    id: "team",
    label: "팀 생성",
    icon: <Users className="w-5 h-5" />,
    href: "/sports/teams/create",
    color: "bg-green-600 hover:bg-green-700",
  },
  {
    id: "tournament",
    label: "대회 생성",
    icon: <Trophy className="w-5 h-5" />,
    href: "/sports/tournaments/create",
    color: "bg-purple-600 hover:bg-purple-700",
  },
  {
    id: "event",
    label: "이벤트 생성",
    icon: <Calendar className="w-5 h-5" />,
    href: "/sports/events/create",
    color: "bg-orange-600 hover:bg-orange-700",
  },
  {
    id: "player",
    label: "선수 등록",
    icon: <UserPlus className="w-5 h-5" />,
    href: "/sports/players/register",
    color: "bg-indigo-600 hover:bg-indigo-700",
  },
];

export default function FabMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const items = [
    { label: "협회 생성", link: "/platform/federations/create" },
    { label: "팀 생성", link: "/sports/teams/create" },
    { label: "대회 생성", link: "/sports/tournaments/create" },
    { label: "이벤트 생성", link: "/sports/events/create" },
    { label: "선수 등록", link: "/sports/players/register" },
  ];

  const handleItemClick = (link: string) => {
    navigate(link);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {isOpen && (
        <div className="flex flex-col gap-3 mb-3 items-end">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => handleItemClick(item.link)}
              className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg hover:bg-gray-800 transition-colors whitespace-nowrap"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-blue-600 text-white text-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center"
        aria-label={isOpen ? "메뉴 닫기" : "생성 메뉴 열기"}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Plus className="w-6 h-6" />
        )}
      </button>
    </div>
  );
}
