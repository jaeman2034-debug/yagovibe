import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { MoreVertical } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { submitActivityFeedback, deleteActivityFeedback } from "@/services/activityFeedbackService";
import type { ActivityFeedbackType } from "@/types/activityFeedback";
import { trackFeedFeedback, trackFeedUndo, type HubFeedSource, type HubFeedUserStatus } from "@/lib/feedAnalytics";

/** 모바일 바텀시트 상단 — 어떤 카드인지 맥락 */
export type HubActivityFeedSheetPreview = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  /** 예: "야구 · 거래", "팀" */
  meta?: string;
  /** 썸네일 없을 때 카드와 동일한 글리프 */
  listGlyph?: string;
};

type HubActivityFeedExposureMenuProps = {
  activityDocId: string;
  userId: string | null | undefined;
  authorId?: string | null | undefined;
  sheetPreview?: HubActivityFeedSheetPreview;
  onRemoveFromFeed: () => void;
  /** 숨김·관심없음 실행 취소 시 피드에 다시 표시 */
  onRestoreFromFeed?: () => void;
  /** GA4 피드 이벤트 (위치·소스) */
  feedAnalytics?: {
    position: number;
    feedSource: HubFeedSource;
    userStatus: HubFeedUserStatus;
  };
};

const MD_UP_QUERY = "(min-width: 768px)";

function useMediaMdUp(): boolean {
  const [mdUp, setMdUp] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MD_UP_QUERY);
    setMdUp(mq.matches);
    const onChange = () => setMdUp(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return mdUp;
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

const triggerClassName =
  "rounded-lg p-2.5 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50 min-h-[44px] min-w-[44px] inline-flex items-center justify-center";

function collectSheetFocusables(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLButtonElement>("button")).filter((el) => !el.disabled);
}

function SheetContextPreview({ preview }: { preview: HubActivityFeedSheetPreview }) {
  return (
    <div className="flex gap-3 border-b border-gray-100 px-4 pb-3 pt-1">
      {preview.imageUrl ? (
        <img
          src={preview.imageUrl}
          alt=""
          className="h-11 w-11 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-lg text-gray-400"
          aria-hidden
        >
          {preview.listGlyph ?? "📌"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        {preview.meta ? (
          <p className="text-[11px] font-semibold text-gray-500">{preview.meta}</p>
        ) : null}
        <p className="mt-0.5 text-sm font-semibold leading-snug text-gray-900 line-clamp-2">{preview.title}</p>
        {preview.subtitle ? (
          <p className="mt-0.5 text-xs leading-snug text-gray-500 line-clamp-2">{preview.subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function DropdownPreviewHeader({ preview }: { preview: HubActivityFeedSheetPreview }) {
  return (
    <div className="pointer-events-none border-b border-gray-100 px-2 py-2">
      {preview.meta ? (
        <p className="text-[10px] font-semibold text-gray-500">{preview.meta}</p>
      ) : null}
      <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-gray-900">{preview.title}</p>
    </div>
  );
}

/**
 * 허브 피드 카드 — 노출 제어 (모바일: 바텀시트 / 데스크톱: 드롭다운)
 */
export function HubActivityFeedExposureMenu({
  activityDocId,
  userId,
  authorId,
  sheetPreview,
  onRemoveFromFeed,
  onRestoreFromFeed,
  feedAnalytics,
}: HubActivityFeedExposureMenuProps) {
  const navigate = useNavigate();
  const mdUp = useMediaMdUp();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetPanelRef = useRef<HTMLDivElement>(null);
  const wasReportOpen = useRef(false);

  const loggedIn = Boolean(userId);
  const isOwnPost = Boolean(userId && authorId && userId === authorId);

  useBodyScrollLock(sheetOpen || reportOpen);

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  useEffect(() => {
    if (mdUp) setSheetOpen(false);
  }, [mdUp]);

  /** 시트 닫힐 때 더보기 버튼으로 포커스 복귀 */
  useEffect(() => {
    if (!sheetOpen || mdUp) return;
    return () => {
      triggerRef.current?.focus();
    };
  }, [sheetOpen, mdUp]);

  /** 신고 모달 닫힐 때 더보기로 포커스 복귀 */
  useEffect(() => {
    if (wasReportOpen.current && !reportOpen) {
      triggerRef.current?.focus();
    }
    wasReportOpen.current = reportOpen;
  }, [reportOpen]);

  /** 모바일 시트: ESC, Tab 루프, 초기 포커스 */
  useEffect(() => {
    if (!sheetOpen || mdUp) return;
    const panel = sheetPanelRef.current;
    if (!panel) return;

    const focusables = collectSheetFocusables(panel);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    queueMicrotask(() => first?.focus());

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSheetOpen(false);
        return;
      }
      if (e.key !== "Tab" || focusables.length === 0) return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sheetOpen, mdUp, loggedIn, isOwnPost]);

  const showSuccessToast = (type: ActivityFeedbackType) => {
    const canUndo =
      Boolean(userId && onRestoreFromFeed) && (type === "hide" || type === "not_interested");

    if (type === "not_interested") {
      if (canUndo && userId) {
        const tid = toast.success("이와 비슷한 활동을 덜 보여드릴게요", {
          duration: 8000,
          action: {
            label: "되돌리기",
            onClick: async () => {
              try {
                await deleteActivityFeedback({ userId, activityId: activityDocId, type: "not_interested" });
                onRestoreFromFeed?.();
                if (feedAnalytics) {
                  trackFeedUndo({
                    activityId: activityDocId,
                    feedbackType: "not_interested",
                    userStatus: feedAnalytics.userStatus,
                  });
                }
                toast.dismiss(tid);
                toast.success("되돌렸어요");
              } catch (err) {
                console.warn("[HubActivityFeedExposureMenu] undo", err);
                toast.error("되돌리기에 실패했습니다.");
              }
            },
          },
        });
      } else {
        toast.success("이와 비슷한 활동을 덜 보여드릴게요");
      }
      return;
    }

    if (type === "hide") {
      if (canUndo && userId) {
        const tid = toast.success("이 활동을 숨겼어요", {
          duration: 8000,
          action: {
            label: "되돌리기",
            onClick: async () => {
              try {
                await deleteActivityFeedback({ userId, activityId: activityDocId, type: "hide" });
                onRestoreFromFeed?.();
                if (feedAnalytics) {
                  trackFeedUndo({
                    activityId: activityDocId,
                    feedbackType: "hide",
                    userStatus: feedAnalytics.userStatus,
                  });
                }
                toast.dismiss(tid);
                toast.success("되돌렸어요");
              } catch (err) {
                console.warn("[HubActivityFeedExposureMenu] undo", err);
                toast.error("되돌리기에 실패했습니다.");
              }
            },
          },
        });
      } else {
        toast.success("이 활동을 숨겼어요");
      }
      return;
    }

    toast.success("신고가 접수되었어요");
  };

  const runFeedback = async (type: ActivityFeedbackType) => {
    if (!userId) return;
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await submitActivityFeedback({ userId, activityId: activityDocId, type });
      if (feedAnalytics) {
        trackFeedFeedback({
          activityId: activityDocId,
          position: feedAnalytics.position,
          feedSource: feedAnalytics.feedSource,
          feedbackType: type,
          userStatus: feedAnalytics.userStatus,
        });
      }
      onRemoveFromFeed();
      closeSheet();
      showSuccessToast(type);
      if (type === "report") {
        setReportOpen(false);
      }
    } catch (e) {
      console.warn("[HubActivityFeedExposureMenu]", e);
      toast.error("처리에 실패했습니다. 다시 시도해주세요.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  /** BottomNav/FAB(z-[99999]) 위 — 전역 dim·시트가 + 버튼에 가리지 않게 */
  const sheetZ = "z-[100002]";

  const itemDesktopClass = "min-h-[44px] flex items-center";

  const openMobileSheet = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSheetOpen(true);
  };

  return (
    <>
      {mdUp ? (
        <DropdownMenu portal>
          <DropdownMenuTrigger asChild>
            <button
              ref={triggerRef}
              type="button"
              disabled={busy}
              className={triggerClassName}
              aria-label="더보기"
            >
              <MoreVertical className="h-5 w-5" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {sheetPreview ? <DropdownPreviewHeader preview={sheetPreview} /> : null}
            {!loggedIn ? (
              <>
                <div className="px-2 py-2 text-xs leading-snug text-gray-600">
                  로그인 후 관심 없음·숨기기·신고를 사용할 수 있어요.
                </div>
                <DropdownMenuItem
                  className={itemDesktopClass}
                  onClick={() => navigate("/login", { state: { from: "/hub" } })}
                >
                  로그인하기
                </DropdownMenuItem>
                <DropdownMenuItem className={`${itemDesktopClass} text-gray-500`} onClick={() => {}}>
                  닫기
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem
                  className={itemDesktopClass}
                  disabled={busy}
                  onClick={() => void runFeedback("not_interested")}
                >
                  관심 없음
                </DropdownMenuItem>
                <DropdownMenuItem className={itemDesktopClass} disabled={busy} onClick={() => void runFeedback("hide")}>
                  숨기기
                </DropdownMenuItem>
                {isOwnPost ? (
                  <div className="px-2 py-1.5">
                    <div className={`${itemDesktopClass} cursor-not-allowed text-gray-400`}>신고하기</div>
                    <p className="mt-0.5 text-[11px] leading-snug text-gray-500">본인이 올린 활동은 신고할 수 없어요.</p>
                  </div>
                ) : (
                  <DropdownMenuItem
                    className={`${itemDesktopClass} text-red-600 hover:bg-red-50`}
                    disabled={busy}
                    onClick={() => setReportOpen(true)}
                  >
                    신고하기
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <>
          <button
            ref={triggerRef}
            type="button"
            onClick={openMobileSheet}
            disabled={busy}
            className={triggerClassName}
            aria-label="더보기"
          >
            <MoreVertical className="h-5 w-5" aria-hidden />
          </button>

          {sheetOpen && typeof document !== "undefined"
            ? createPortal(
                <div
                  className={`fixed inset-0 ${sheetZ}`}
                  role="dialog"
                  aria-modal="true"
                  aria-label="활동 메뉴"
                >
                  <button
                    type="button"
                    className="absolute inset-0 cursor-default border-0 bg-black/40"
                    aria-label="닫기"
                    onClick={closeSheet}
                  />
                  <div
                    ref={sheetPanelRef}
                    className="absolute bottom-0 left-0 right-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl"
                  >
                    <div className="flex justify-center pb-1 pt-2">
                      <span className="h-1 w-10 rounded-full bg-gray-300" />
                    </div>
                    {sheetPreview ? <SheetContextPreview preview={sheetPreview} /> : null}
                    {!loggedIn ? (
                      <div className="px-4 pb-4 pt-2">
                        <p className="mb-4 text-center text-sm text-gray-600">
                          로그인 후 관심 없음·숨기기·신고를 사용할 수 있어요.
                        </p>
                        <button
                          type="button"
                          className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-gray-900 px-4 text-base font-medium text-white"
                          onClick={() => {
                            closeSheet();
                            navigate("/login", { state: { from: "/hub" } });
                          }}
                        >
                          로그인하기
                        </button>
                        <button
                          type="button"
                          className="mt-2 flex min-h-[48px] w-full items-center justify-center rounded-xl border border-gray-200 px-4 text-base text-gray-700"
                          onClick={closeSheet}
                        >
                          닫기
                        </button>
                      </div>
                    ) : (
                      <div className="pb-1">
                        <button
                          type="button"
                          disabled={busy}
                          className="flex min-h-[48px] w-full items-center px-4 text-left text-base font-medium text-gray-900 active:bg-gray-100 disabled:opacity-50"
                          onClick={() => void runFeedback("not_interested")}
                        >
                          관심 없음
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className="flex min-h-[48px] w-full items-center px-4 text-left text-base font-medium text-gray-900 active:bg-gray-100 disabled:opacity-50"
                          onClick={() => void runFeedback("hide")}
                        >
                          숨기기
                        </button>
                        <div className="my-1 border-t border-gray-100" role="presentation" />
                        {isOwnPost ? (
                          <div className="px-4 pb-1 pt-0.5">
                            <p className="flex min-h-[44px] items-center text-base font-medium text-gray-400">
                              신고하기
                            </p>
                            <p className="-mt-1 pb-2 text-xs leading-snug text-gray-500">
                              본인이 올린 활동은 신고할 수 없어요.
                            </p>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            className="flex min-h-[48px] w-full items-center px-4 text-left text-base font-semibold text-red-600 active:bg-red-50 disabled:opacity-50"
                            onClick={() => {
                              closeSheet();
                              setReportOpen(true);
                            }}
                          >
                            신고하기
                          </button>
                        )}
                        <button
                          type="button"
                          className="mt-1 flex min-h-[48px] w-full items-center justify-center px-4 text-base text-gray-500"
                          onClick={closeSheet}
                        >
                          취소
                        </button>
                      </div>
                    )}
                  </div>
                </div>,
                document.body
              )
            : null}
        </>
      )}

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="mx-4 max-w-md">
          <DialogHeader>
            <DialogTitle>이 활동을 신고할까요?</DialogTitle>
            <DialogDescription>
              허위·스팸·욕설 등 정책에 맞지 않는 경우에만 신고해 주세요. 접수된 내용은 검토됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setReportOpen(false)} disabled={busy}>
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy || !userId}
              onClick={() => void runFeedback("report")}
            >
              신고하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
