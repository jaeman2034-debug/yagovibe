/**
 * 🔥 Action Grid - 모바일 퍼스트 최적화 + AB 테스트
 * 
 * 모바일 퍼스트 원칙:
 * - 카드 높이 116px 고정
 * - 아이콘 32px
 * - 하단 텍스트 고정
 * - 그림자 최소
 * - 터치 피드백 (active)
 * 
 * AB 테스트:
 * - A: 마켓/팀/구장/내팀
 * - B: 팀/구장/마켓/내팀 (초기 성장 최적화 가설)
 */

import { useNavigate, useParams } from "react-router-dom";
import { useGridVariant } from "../hooks/useGridVariant";
import { logExperiment } from "../domain/experiment.log";
import type { Variant } from "../domain/experiment.types";

// 기본 액션 정의
const allActions = [
  { label: "축구 마켓", icon: "🛒", key: "market" },
  { label: "팀 찾기", icon: "👥", key: "find-team" },
  { label: "구장 찾기", icon: "📍", key: "facility" },
  { label: "내 팀", icon: "👕", key: "team-manage" },
];

/**
 * variant에 따른 그리드 순서
 */
function gridByVariant(variant: Variant) {
  const A = [
    allActions[0], // 마켓
    allActions[1], // 팀
    allActions[2], // 구장
    allActions[3], // 내 팀
  ];

  const B = [
    allActions[1], // 팀 (우선)
    allActions[2], // 구장
    allActions[0], // 마켓
    allActions[3], // 내 팀
  ];

  return variant === "A" ? A : B;
}

// 라우트 매핑 (실제 프로젝트 경로)
const getActionRoute = (key: string, sportType: string = "football"): string => {
  switch (key) {
    case "market":
      return `/market?type=${sportType}`;
    case "find-team":
      return `/teams/search?type=${sportType}`;
    case "facility":
      return `/ground?type=${sportType}`; // 구장 예약 페이지
    case "team-manage":
      return `/sports/${sportType}/team`;
    default:
      return "/sports-hub";
  }
};

export default function ActionGrid() {
  const navigate = useNavigate();
  const { type } = useParams<{ type?: string }>();
  const sportType = type || "football";

  // AB 테스트 할당
  const exp = useGridVariant(null); // TODO: userId 있으면 넣기
  const actions = gridByVariant(exp.variant);

  const handleClick = (actionKey: string, label: string) => {
    // AB 실험 로그
    logExperiment({
      event: "exp_click",
      experimentKey: exp.key,
      variant: exp.variant,
      at: new Date().toISOString(),
      surface: "ActionGrid",
      meta: {
        actionKey,
        label,
      },
    });

    navigate(getActionRoute(actionKey, sportType));
  };

  return (
    <section
      className="grid grid-cols-2 gap-3 px-4"
      aria-label="주요 기능"
    >
      {actions.map((a) => (
        <button
          key={a.key}
          onClick={() => handleClick(a.key, a.label)}
          aria-label={a.label}
          className="h-[116px] rounded-xl flex flex-col items-center justify-between py-4 bg-white active:bg-gray-50 transition-colors touch-manipulation border border-gray-100 focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2"
        >
          {/* 아이콘: 32px */}
          <div className="text-[32px] leading-none" aria-hidden="true">
            {a.icon}
          </div>
          {/* 텍스트: 하단 고정, 대비 4.5:1 이상 */}
          <div className="text-[14px] font-medium text-gray-800">{a.label}</div>
        </button>
      ))}
    </section>
  );
}
