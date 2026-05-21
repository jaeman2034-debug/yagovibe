import { useNavigate } from "react-router-dom";
import { Users, GraduationCap, Building2, ChevronRight } from "lucide-react";

export interface FederationFabCreateContentProps {
  onClose: () => void;
}

const FEDERATION_OPTIONS = [
  {
    id: "team",
    label: "팀 만들기",
    description: "새로운 팀을 생성합니다",
    icon: Users,
    path: "/team/create",
  },
  {
    id: "academy",
    label: "아카데미 생성",
    description: "아카데미를 생성하고 운영을 시작합니다",
    icon: GraduationCap,
    path: "/academy/create",
  },
  {
    id: "association",
    label: "협회 생성",
    description: "협회 페이지를 새로 개설합니다",
    icon: Building2,
    path: "/platform/federations/create",
  },
] as const;

export function FederationFabCreateContent({ onClose }: FederationFabCreateContentProps) {
  const navigate = useNavigate();

  const handleSelect = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="menu-list grid gap-3 mt-2">
      {FEDERATION_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => handleSelect(option.path)}
          className="
            bg-white border border-gray-200 rounded-[14px] px-5 py-[18px] text-left
            transition-all duration-150 flex items-center justify-between
            hover:bg-gray-50 hover:-translate-y-[1px] active:scale-[0.98] group
          "
        >
          <div className="flex items-center gap-3 min-w-0">
            <option.icon size={20} className="text-gray-700 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 mb-1">{option.label}</h3>
              <p className="text-sm text-gray-500">{option.description}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0 ml-4" />
        </button>
      ))}
    </div>
  );
}
