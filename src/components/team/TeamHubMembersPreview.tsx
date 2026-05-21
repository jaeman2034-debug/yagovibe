import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TeamHubMemberPreviewRow = {
  id: string;
  name: string;
  photoURL?: string;
};

export type TeamHubMembersPreviewProps = {
  members: TeamHubMemberPreviewRow[];
  dark?: boolean;
  previewCount?: number;
  onViewAll?: () => void;
  /** 선수 탭 등 상세 화면 — 전체 보기 버튼 숨김 */
  hideViewAll?: boolean;
  title?: string;
};

export function TeamHubMembersPreview({
  members,
  dark = false,
  previewCount = 6,
  onViewAll,
  hideViewAll = false,
  title = "등록 멤버 미리보기",
}: TeamHubMembersPreviewProps) {
  const total = members.length;
  if (total === 0) return null;

  const slice = members.slice(0, previewCount);
  const rest = Math.max(0, total - slice.length);

  return (
    <section
      className={cn(
        "rounded-xl border p-4 shadow-sm",
        dark ? "border-slate-600/80 bg-slate-800/35 text-slate-100" : "border-gray-200 bg-white/95 text-gray-900"
      )}
      aria-label="등록 멤버 미리보기"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className={cn("h-4 w-4 shrink-0", dark ? "text-slate-300" : "text-gray-600")} aria-hidden />
          <h2 className={cn("text-sm font-semibold tracking-tight", dark ? "text-slate-100" : "text-gray-900")}>
            {title}
          </h2>
        </div>
        {!hideViewAll && onViewAll ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 text-xs font-medium",
              dark ? "text-slate-300 hover:bg-white/10" : "text-indigo-700 hover:bg-indigo-50"
            )}
            onClick={onViewAll}
          >
            전체 보기
          </Button>
        ) : null}
      </div>
      <p className={cn("mt-1 text-xs", dark ? "text-slate-400" : "text-gray-500")}>
        가입된 팀원 목록입니다. 위쪽 「운영진 소개」와는 별도예요.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center pl-1">
          {slice.map((m, i) => (
            <div
              key={m.id}
              className={cn(
                "-ml-2 h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 shadow-sm first:ml-0 sm:h-14 sm:w-14",
                dark ? "border-slate-800 bg-slate-700" : "border-white bg-gray-100"
              )}
              style={{ zIndex: slice.length - i }}
              title={m.name}
            >
              {m.photoURL ? (
                <img src={m.photoURL} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div
                  className={cn(
                    "flex h-full w-full items-center justify-center text-sm font-bold sm:text-base",
                    dark ? "text-slate-200" : "text-indigo-800"
                  )}
                  aria-hidden
                >
                  {m.name.slice(0, 1)}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn("text-sm font-semibold", dark ? "text-slate-100" : "text-gray-900")}>
            {slice.map((m) => m.name).join(" · ")}
          </div>
          <div className={cn("mt-0.5 text-xs", dark ? "text-slate-400" : "text-gray-500")}>
            총 {total}명
            {rest > 0 ? (
              <span className="font-semibold text-violet-600 dark:text-violet-300"> · 외 {rest}명</span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
