/**
 * 🔥 Sports Module Card Component
 * 
 * 역할:
 * - 스포츠 활동 허브의 모듈 카드
 * - 아이콘, 제목, 설명, 빠른 링크 제공
 */

import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

export interface ModuleLink {
  label: string;
  path: string;
}

interface SportsModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  links: ModuleLink[];
  iconColor?: string;
  /** `/sports?tab=…` 등에서 스크롤·강조용 앵커 id (`sports-hub-${hubAnchor}`) */
  hubAnchor?: string;
  /** 허브에서 tab 쿼리와 일치할 때 시각적 강조 */
  hubHighlight?: boolean;
}

export default function SportsModuleCard({
  title,
  description,
  icon: Icon,
  links,
  iconColor = "text-blue-600",
  hubAnchor,
  hubHighlight,
}: SportsModuleCardProps) {
  const navigate = useNavigate();
  const anchorId = hubAnchor ? `sports-hub-${hubAnchor}` : undefined;

  return (
    <div
      id={anchorId}
      className={`flex flex-col rounded-xl border p-6 transition-all cursor-pointer ${
        hubHighlight
          ? "border-blue-400 bg-blue-50/60 shadow-md ring-2 ring-blue-400/40"
          : "border-gray-200 bg-white hover:shadow-lg hover:border-gray-300"
      }`}
    >
      {/* 아이콘 및 제목 */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`flex-shrink-0 ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {title}
          </h3>
          <p className="text-sm text-gray-500">
            {description}
          </p>
        </div>
      </div>

      {/* 빠른 링크 */}
      <div className="flex flex-col gap-2 mt-auto">
        {links.map((link, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              navigate(link.path);
            }}
            className="text-left text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            {link.label} →
          </button>
        ))}
      </div>
    </div>
  );
}
