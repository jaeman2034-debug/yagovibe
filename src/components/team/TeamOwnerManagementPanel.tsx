import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Loader2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type OwnerPanelTab = "content" | "members" | "media" | "ai";

export type TeamOwnerManagementPanelProps = {
  dark?: boolean;
  /** 제어 모드: 닫힌 채로 공개 랜딩만 보이게 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  score?: number | null;
  setupChecklist?: { introOk: boolean; oneLineOk: boolean; joinOk: boolean };
  profileEditMode?: boolean;
  saveProfileBusy?: boolean;
  onCancelProfileEdit?: () => void;
  onSaveProfile?: () => void;
  /** 소개·모집·전체 AI — 팀 문서 ownerUid 기준(백엔드와 동일) */
  canUseOwnerAiCopy?: boolean;
  contentTab: ReactNode;
  membersTab: ReactNode;
  mediaTab: ReactNode;
  aiTab: ReactNode;
};

const TABS: { id: OwnerPanelTab; label: string }[] = [
  { id: "content", label: "콘텐츠" },
  { id: "members", label: "멤버" },
  { id: "media", label: "미디어" },
  { id: "ai", label: "AI" },
];

export function TeamOwnerManagementPanel({
  dark = false,
  open: openControlled,
  onOpenChange,
  score,
  setupChecklist,
  profileEditMode = false,
  saveProfileBusy = false,
  onCancelProfileEdit,
  onSaveProfile,
  canUseOwnerAiCopy = false,
  contentTab,
  membersTab,
  mediaTab,
  aiTab,
}: TeamOwnerManagementPanelProps) {
  const [openInternal, setOpenInternal] = useState(false);
  const [tab, setTab] = useState<OwnerPanelTab>("content");
  const isOpen = openControlled !== undefined ? openControlled : openInternal;

  const setOpenSynced = (next: boolean) => {
    if (openControlled === undefined) setOpenInternal(next);
    onOpenChange?.(next);
  };

  const manageHint = "콘텐츠/멤버 관리";

  const shell = cn(
    "w-full rounded-lg border text-xs",
    dark ? "border-slate-600/60 bg-slate-900/25 text-slate-400" : "border-slate-200 bg-slate-50/90 text-slate-600"
  );

  return (
    <section className={shell} aria-label="팀 운영 모드">
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between gap-2 px-3 py-2 text-left sm:px-3.5",
          dark ? "hover:bg-slate-800/40" : "hover:bg-slate-100/80"
        )}
        onClick={() => setOpenSynced(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
            <Settings2 className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            팀 운영 모드
          </span>
          <span className="mt-0.5 block text-[10px] font-normal text-slate-500 dark:text-slate-500">{manageHint}</span>
        </span>
        <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-slate-500">
          {isOpen ? "접기" : "열기"}
          {isOpen ? <ChevronUp className="h-3 w-3" aria-hidden /> : <ChevronDown className="h-3 w-3" aria-hidden />}
        </span>
      </button>

      {isOpen ? (
        <div className={cn("border-t px-3 pb-3 pt-2 sm:px-4 sm:pb-4", dark ? "border-slate-600/60" : "border-slate-200")}>
          {score != null && setupChecklist ? (
            <div
              className={cn(
                "mb-3 rounded-md border px-3 py-2 text-xs",
                dark ? "border-slate-600/60 bg-slate-900/50" : "border-slate-200 bg-white"
              )}
            >
              <p className="font-medium">페이지 완성도 {score}%</p>
              <div className={cn("mt-1 h-1 overflow-hidden rounded-full", dark ? "bg-slate-800" : "bg-slate-200")}>
                <div
                  className="h-full rounded-full bg-slate-500"
                  style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                />
              </div>
            </div>
          ) : null}

          <div
            className={cn(
              "mb-3 flex gap-1 rounded-md p-0.5",
              dark ? "bg-slate-800/80" : "bg-slate-200/80"
            )}
            role="tablist"
            aria-label="운영 메뉴"
          >
            {TABS.map((t) => {
              const hideAi = t.id === "ai" && !canUseOwnerAiCopy;
              if (hideAi) return null;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={cn(
                    "flex-1 rounded px-2 py-1.5 text-[11px] font-semibold sm:text-xs",
                    tab === t.id
                      ? dark
                        ? "bg-slate-700 text-slate-100 shadow-sm"
                        : "bg-white text-slate-800 shadow-sm"
                      : dark
                        ? "text-slate-400 hover:text-slate-200"
                        : "text-slate-600 hover:text-slate-900"
                  )}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="min-h-0 space-y-3" role="tabpanel">
            {tab === "content" ? contentTab : null}
            {tab === "members" ? membersTab : null}
            {tab === "media" ? mediaTab : null}
            {tab === "ai" && canUseOwnerAiCopy ? aiTab : null}
          </div>

          {profileEditMode && tab === "content" ? (
            <div className="mt-3 flex flex-wrap justify-end gap-2 border-t pt-3 dark:border-slate-600">
              <Button type="button" size="sm" variant="ghost" disabled={saveProfileBusy} onClick={onCancelProfileEdit}>
                취소
              </Button>
              <Button type="button" size="sm" disabled={saveProfileBusy} onClick={onSaveProfile}>
                {saveProfileBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                저장
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
