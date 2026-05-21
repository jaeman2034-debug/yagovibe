import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export type OrganizationCardProps = {
  /** 카드 상단 제목 (예: 📢 [공식] 노원구 축구협회) — `[공식]` 구간은 강조 색 적용 */
  title: string;
  description: string;
  /**
   * 협회 상세 — `App.tsx`의 `/federations/:federationSlug` 와 동일한 slug
   * (우선 사용, `encodeURIComponent` 적용)
   */
  federationSlug?: string;
  /** 레거시: federationSlug가 없을 때만 사용 (예: /organization/...) */
  link?: string;
  className?: string;
};

function TitleWithOfficialBadge({ text }: { text: string }) {
  const token = "[공식]";
  const i = text.indexOf(token);
  if (i === -1) {
    return <span className="text-base font-semibold text-gray-900">{text}</span>;
  }
  return (
    <span className="text-base font-semibold text-gray-900">
      {text.slice(0, i)}
      <span className="text-blue-600">{token}</span>
      {text.slice(i + token.length)}
    </span>
  );
}

/**
 * 종목 허브 활동 탭 상단 등 — 공식 협회·기관 강조 카드 (Activity 피드 데이터와 분리)
 * - 카드 전체(버튼) 클릭 시 이동 · slug 없으면 비활성화
 */
export function OrganizationCard({
  title,
  description,
  federationSlug,
  link,
  className,
}: OrganizationCardProps) {
  const navigate = useNavigate();

  const targetPath =
    federationSlug != null && String(federationSlug).trim() !== ""
      ? `/federations/${encodeURIComponent(String(federationSlug).trim())}`
      : link != null && String(link).trim() !== ""
        ? String(link).trim()
        : null;

  const canNavigate = Boolean(targetPath);

  const go = () => {
    if (!targetPath) return;
    navigate(targetPath);
  };

  return (
    <button
      type="button"
      onClick={go}
      disabled={!canNavigate}
      className={cn(
        "w-full rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/90 to-indigo-50/80 p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md",
        canNavigate ? "cursor-pointer" : "cursor-not-allowed opacity-60",
        className
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <TitleWithOfficialBadge text={title} />
          <p className="mt-1.5 text-sm text-gray-600">{description}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-blue-700">
          협회 보기
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </button>
  );
}
