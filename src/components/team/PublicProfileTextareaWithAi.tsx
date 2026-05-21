import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Sparkles, Undo2 } from "lucide-react";
import { Textarea, type TextareaProps } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import {
  improveTeamPublicTextSelectionCallable,
  type TeamPublicImprovementStyle,
  type TeamPublicSelectionField,
} from "@/lib/team/improveTeamPublicTextSelectionClient";
import { callableErrorMessage } from "@/lib/errors/callableErrorMessage";
import {
  TEAM_PROFILE_AI_IMPROVE,
  requestTeamProfileAiImprove,
  type TeamProfileAiImproveRequestDetail,
} from "@/lib/team/teamProfileEditEvents";
import type { TeamProfileSuggestion } from "@/lib/team/profileScore";

const MAX_SELECTION = 400;

const STYLE_PRESETS: { id: TeamPublicImprovementStyle; label: string }[] = [
  { id: "natural", label: "✨ 자연스럽게" },
  { id: "recruiting", label: "🔥 더 모집되게" },
  { id: "short", label: "⚡ 짧고 강하게" },
  { id: "serious", label: "🎯 진지한 톤" },
];

export type PublicProfileTextareaWithAiProps = Omit<TextareaProps, "onChange"> & {
  field: TeamPublicSelectionField;
  teamId: string;
  /** 소유자 편집 모드에서만 true */
  aiImproveEnabled: boolean;
  value: string;
  onChange: (next: string) => void;
  /** 팀 온보딩 vibe 등 톤 힌트 (선택) */
  toneHint?: string;
  /** 완성도 엔진 제안 — textarea 아래 인라인 코칭 */
  inlineHints?: TeamProfileSuggestion[];
  /** 인라인 힌트 카드 다크 테마 */
  hintsDark?: boolean;
};

function clampFabPosition(clientX: number, clientY: number) {
  const margin = 10;
  const fabW = 168;
  const fabH = 40;
  const left = Math.min(Math.max(margin, clientX - fabW / 2), window.innerWidth - fabW - margin);
  const top = Math.min(Math.max(margin, clientY + 14), window.innerHeight - fabH - margin);
  return { left, top };
}

export function PublicProfileTextareaWithAi({
  field,
  teamId,
  aiImproveEnabled,
  value,
  onChange,
  toneHint,
  inlineHints,
  hintsDark,
  className,
  disabled,
  ...rest
}: PublicProfileTextareaWithAiProps) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const [fabPos, setFabPos] = useState<{ left: number; top: number } | null>(null);
  const [savedSel, setSavedSel] = useState<{ start: number; end: number } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewOriginal, setPreviewOriginal] = useState("");
  const [previewImproved, setPreviewImproved] = useState("");
  const [previewSource, setPreviewSource] = useState<"openai" | "template" | null>(null);
  const [busy, setBusy] = useState(false);
  const [regenerateBusy, setRegenerateBusy] = useState(false);
  const [improvementStyle, setImprovementStyle] = useState<TeamPublicImprovementStyle>("natural");
  const [lastUndoValue, setLastUndoValue] = useState<string | null>(null);

  const hideFab = useCallback(() => setFabPos(null), []);
  const clearSelectionContext = useCallback(() => {
    setFabPos(null);
    setSavedSel(null);
  }, []);

  useEffect(() => {
    if (!aiImproveEnabled) clearSelectionContext();
  }, [aiImproveEnabled, clearSelectionContext]);

  useEffect(() => {
    if (!fabPos) return;
    const onScroll = () => hideFab();
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [fabPos, hideFab]);

  const runImprove = useCallback(
    async (opts: {
      isRegenerate?: boolean;
      selection?: { start: number; end: number };
      style?: TeamPublicImprovementStyle;
    }) => {
      const sel = opts.selection ?? savedSel;
      if (!teamId || !sel) return;
      const full = valueRef.current;
      const selected = full.slice(sel.start, sel.end);
      if (!selected.trim()) return;

      const styleUsed: TeamPublicImprovementStyle =
        opts.style ?? (opts.isRegenerate ? improvementStyle : "natural");
      setImprovementStyle(styleUsed);

      if (opts.isRegenerate) setRegenerateBusy(true);
      else setBusy(true);

      try {
        const out = await improveTeamPublicTextSelectionCallable({
          teamId,
          field,
          fullText: full,
          selectionStart: sel.start,
          selectionEnd: sel.end,
          tone: toneHint,
          style: styleUsed,
        });
        const improved = (out.improvedText ?? "").trim();
        if (!improved) {
          toast.error("개선 결과가 비어 있어요. 다시 시도해 주세요.");
          return;
        }
        setPreviewOriginal(selected);
        setPreviewImproved(improved);
        setPreviewSource(out.source === "openai" ? "openai" : "template");
        setPreviewOpen(true);
        void track("team_public_selection_ai_improved", {
          team_id: teamId,
          field,
          selection_length: selected.length,
          accepted: false,
          regenerated: Boolean(opts.isRegenerate),
          source: out.source ?? "unknown",
          style: styleUsed,
        });
      } catch (err: unknown) {
        const code = err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code) : "";
        const detail = callableErrorMessage(err);
        const shortDetail = detail.length > 220 ? `${detail.slice(0, 220)}…` : detail;
        if (code === "functions/permission-denied") {
          toast.error("팀 소유자만 AI 개선을 쓸 수 있어요.");
        } else if (code === "functions/invalid-argument") {
          toast.error(shortDetail || "선택이나 본문을 확인해 주세요.");
        } else if (code === "functions/unauthenticated") {
          toast.error("로그인이 필요하거나 세션이 만료됐어요. 다시 로그인 후 시도해 주세요.");
        } else if (code === "functions/not-found") {
          toast.error(
            shortDetail ||
              "팀을 찾을 수 없거나 Cloud Functions가 아직 배포되지 않았을 수 있어요."
          );
        } else if (code === "functions/internal") {
          toast.error(
            shortDetail ||
              "서버에서 처리하지 못했어요. Functions 로그·배포 상태를 확인해 주세요."
          );
        } else {
          toast.error(shortDetail || "AI 개선 요청에 실패했어요. 잠시 후 다시 시도해 주세요.");
        }
        console.error("[PublicProfileTextareaWithAi] improve", err);
      } finally {
        setBusy(false);
        setRegenerateBusy(false);
        hideFab();
      }
    },
    [teamId, field, savedSel, improvementStyle, toneHint, hideFab]
  );

  useEffect(() => {
    if (!aiImproveEnabled || disabled || !teamId) return;
    const handler = (e: Event) => {
      const ce = e as CustomEvent<TeamProfileAiImproveRequestDetail>;
      if (!ce.detail || ce.detail.field !== field) return;
      if (busy || regenerateBusy || previewOpen) return;

      const el = taRef.current;
      if (!el) return;

      const full = valueRef.current;
      const selectAll = ce.detail.selectAll === true;

      let s = el.selectionStart ?? 0;
      let ed = el.selectionEnd ?? 0;

      if (selectAll || s === ed) {
        s = 0;
        ed = Math.min(full.length, MAX_SELECTION);
      } else {
        ed = Math.min(ed, s + MAX_SELECTION);
      }

      if (ed <= s) {
        toast.info("개선할 텍스트를 먼저 적어 주세요.");
        return;
      }

      const slice = full.slice(s, ed);
      if (!slice.trim()) {
        toast.info("개선할 텍스트를 먼저 적어 주세요.");
        return;
      }

      if (selectAll && full.length > MAX_SELECTION) {
        toast.info(`글이 길어서 처음 ${MAX_SELECTION}자만 AI로 다듬을게요.`);
      }

      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
      el.setSelectionRange(s, ed);
      setSavedSel({ start: s, end: ed });
      void runImprove({ selection: { start: s, end: ed } });
    };

    window.addEventListener(TEAM_PROFILE_AI_IMPROVE, handler as EventListener);
    return () => window.removeEventListener(TEAM_PROFILE_AI_IMPROVE, handler as EventListener);
  }, [field, aiImproveEnabled, disabled, teamId, busy, regenerateBusy, previewOpen, runImprove]);

  useEffect(() => {
    if (!aiImproveEnabled || disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (busy || regenerateBusy) return;
      const meta = e.metaKey || e.ctrlKey;
      if (!meta || e.key.toLowerCase() !== "j") return;
      const el = taRef.current;
      if (!el || document.activeElement !== el) return;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      if (start >= end || end - start > MAX_SELECTION) return;
      const full = valueRef.current;
      if (!full.slice(start, end).trim()) return;
      e.preventDefault();
      const sel = { start, end };
      setSavedSel(sel);
      void runImprove({ selection: sel });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aiImproveEnabled, disabled, busy, regenerateBusy, runImprove]);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      if (!aiImproveEnabled || disabled) return;
      const el = e.currentTarget;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      if (start === end) {
        hideFab();
        return;
      }
      if (end - start > MAX_SELECTION) {
        hideFab();
        toast.info(`선택은 ${MAX_SELECTION}자 이내에서 AI 개선을 쓸 수 있어요.`);
        return;
      }
      const slice = value.slice(start, end);
      if (!slice.trim()) {
        hideFab();
        return;
      }
      setSavedSel({ start, end });
      setFabPos(clampFabPosition(e.clientX, e.clientY));
    },
    [aiImproveEnabled, disabled, value, hideFab]
  );

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    setSavedSel(null);
    setPreviewOriginal("");
    setPreviewImproved("");
    setPreviewSource(null);
    setImprovementStyle("natural");
  }, []);

  const applyPreview = useCallback(() => {
    if (!savedSel) return;
    const { start, end } = savedSel;
    const full = valueRef.current;
    setLastUndoValue(full);
    const next = full.slice(0, start) + previewImproved + full.slice(end);
    onChange(next);
    const src = previewSource;
    const styleForTrack = improvementStyle;
    closePreview();
    void track("team_public_selection_ai_improved", {
      team_id: teamId,
      field,
      selection_length: end - start,
      accepted: true,
      regenerated: false,
      source: src ?? "unknown",
      style: styleForTrack,
    });
    requestAnimationFrame(() => {
      const el = taRef.current;
      if (!el) return;
      el.focus();
      const newEnd = start + previewImproved.length;
      el.setSelectionRange(start, newEnd);
    });
  }, [savedSel, previewImproved, onChange, teamId, field, previewSource, improvementStyle, closePreview]);

  const undoLastAiApply = useCallback(() => {
    if (lastUndoValue === null) return;
    onChange(lastUndoValue);
    setLastUndoValue(null);
    void track("team_public_selection_ai_improved", {
      team_id: teamId,
      field,
      accepted: false,
      undone: true,
      source: "client_undo",
    });
  }, [lastUndoValue, onChange, teamId, field]);

  const fab =
    fabPos && savedSel && aiImproveEnabled && !disabled ? (
      <div
        className="pointer-events-auto fixed z-[80] flex items-center gap-1 rounded-lg border bg-background/95 p-1 shadow-lg backdrop-blur-sm"
        style={{ left: fabPos.left, top: fabPos.top, width: 168 }}
        role="presentation"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 flex-1 gap-1 text-xs"
          disabled={busy}
          onClick={() => void runImprove({})}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden /> : <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />}
          AI로 개선
        </Button>
      </div>
    ) : null;

  return (
    <div className="relative">
      <Textarea
        ref={taRef}
        {...rest}
        disabled={disabled}
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onMouseUp={handleMouseUp}
      />
      {aiImproveEnabled && !disabled ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          텍스트 선택 후 <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">Ctrl</kbd>+
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">J</kbd>{" "}
          <span className="hidden sm:inline">(Mac: ⌘J)</span> — 빠르게 AI 개선
        </p>
      ) : null}
      {aiImproveEnabled && !disabled && inlineHints && inlineHints.length > 0 ? (
        <div className="mt-2 space-y-2" role="status" aria-live="polite">
          {inlineHints.map((h) => (
            <div
              key={h.id}
              className={cn(
                "rounded-lg border px-2.5 py-2 text-xs leading-snug",
                hintsDark
                  ? "border-indigo-500/35 bg-indigo-950/30 text-slate-100"
                  : "border-indigo-200/90 bg-indigo-50/70 text-gray-900"
              )}
            >
              <div className="font-semibold">{h.title}</div>
              <p className={cn("mt-1 text-[11px] leading-relaxed", hintsDark ? "text-slate-300" : "text-muted-foreground")}>
                {h.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {h.actionType === "ai_improve" || h.actionType === "ai_generate" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className={cn(
                      "h-7 gap-1 px-2.5 text-[11px]",
                      hintsDark ? "border-violet-400/40 bg-violet-600 text-white hover:bg-violet-500" : ""
                    )}
                    disabled={busy || regenerateBusy || previewOpen}
                    onClick={() => requestTeamProfileAiImprove({ field, selectAll: true })}
                  >
                    <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                    AI로 보강
                  </Button>
                ) : null}
                {h.actionType === "focus" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={cn("h-7 px-2.5 text-[11px]", hintsDark ? "border-slate-500 text-slate-100 hover:bg-slate-800" : "")}
                    onClick={() => {
                      const el = taRef.current;
                      if (!el) return;
                      el.scrollIntoView({ behavior: "smooth", block: "center" });
                      el.focus();
                    }}
                  >
                    입력란으로
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {lastUndoValue !== null && aiImproveEnabled && !disabled ? (
        <div className="mt-1">
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto gap-1.5 p-0 text-xs text-muted-foreground underline-offset-4 hover:text-foreground"
            onClick={undoLastAiApply}
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden />
            마지막 AI 적용 취소
          </Button>
        </div>
      ) : null}
      {typeof document !== "undefined" && fab ? createPortal(fab, document.body) : null}

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          if (!open) closePreview();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>AI 개선 미리보기</DialogTitle>
            <DialogDescription>
              선택한 구간만 다듬은 결과예요. 적용하면 편집 중인 글에 반영되며, 저장 버튼을 눌러야 서버에 반영됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-muted-foreground">개선 스타일</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {STYLE_PRESETS.map((p) => (
                  <Button
                    key={p.id}
                    type="button"
                    size="sm"
                    variant={improvementStyle === p.id ? "default" : "outline"}
                    className={cn("h-8 rounded-full px-2.5 text-xs", improvementStyle === p.id ? "" : "font-normal")}
                    disabled={regenerateBusy || !savedSel}
                    onClick={() => void runImprove({ isRegenerate: true, style: p.id })}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-xs font-semibold text-muted-foreground">기존 선택</div>
                <p className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/40 p-2 leading-relaxed">{previewOriginal || "—"}</p>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground">AI 제안</div>
                <p className="mt-1 whitespace-pre-wrap rounded-md border border-violet-200/80 bg-violet-50/80 p-2 leading-relaxed dark:border-violet-800 dark:bg-violet-950/40">
                  {regenerateBusy ? (
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                      다시 생성 중…
                    </span>
                  ) : (
                    previewImproved || "—"
                  )}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closePreview}>
              취소
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={regenerateBusy || !savedSel}
              onClick={() => void runImprove({ isRegenerate: true })}
            >
              {regenerateBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              다시 생성
            </Button>
            <Button type="button" disabled={regenerateBusy} onClick={applyPreview}>
              적용
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
