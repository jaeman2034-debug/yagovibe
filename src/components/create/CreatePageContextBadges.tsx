import {
  getSportIcon,
  getSportLabel,
  normalizeSportId,
  type SportId,
} from "@/constants/sports";

export type CreatePageContextKind = "recruit" | "team" | "match";

const KIND_LABEL: Record<CreatePageContextKind, string> = {
  recruit: "모집",
  team: "팀",
  match: "매칭",
};

const KIND_RING: Record<CreatePageContextKind, string> = {
  recruit: "bg-blue-50 text-blue-800 ring-blue-200/80",
  team: "bg-emerald-50 text-emerald-900 ring-emerald-200/80",
  match: "bg-purple-50 text-purple-900 ring-purple-200/80",
};

/**
 * create 계열 페이지 공통 — 큰 제목 대신 URL 종목 + 작성 타입 뱃지만 표시
 * (MainLayout 셸 헤더와 중복 문구 방지)
 */
export function CreatePageContextBadges({
  sportSlug,
  kind,
  className = "",
}: {
  sportSlug: string;
  kind: CreatePageContextKind;
  className?: string;
}) {
  const id = (normalizeSportId(sportSlug) ?? "soccer") as SportId;
  const ring = KIND_RING[kind];

  return (
    <div
      className={`mb-5 flex flex-wrap items-center gap-2 ${className}`.trim()}
      aria-label="작성 컨텍스트"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-gray-800 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
        <span aria-hidden className="text-base leading-none">
          {getSportIcon(id)}
        </span>
        {getSportLabel(id)}
      </span>
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${ring}`}
      >
        {KIND_LABEL[kind]}
      </span>
    </div>
  );
}
