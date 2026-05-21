import { useRef, useState } from "react";
import { ImagePlus, Loader2, Pencil, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { captainTrustSectionTitle } from "@/lib/team/resolveTeamPublicProfile";
import type { TeamCaptainPublicView } from "@/types/teamCaptainMessage";
import { uploadTeamCaptainPhotoCallable } from "@/lib/team/uploadTeamCaptainPhotoClient";
import { callableErrorMessage } from "@/lib/errors/callableErrorMessage";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export type TeamCaptainMessageCardManageProps = {
  teamId: string;
  /** AI 인사 재생성 중(부모 `regenerateFieldBusy === "captainMessage"` 등) */
  aiBusy: boolean;
  /** 사진·AI·직접 수정 외 전역 바쁨(되돌리기 등) */
  siblingBusy?: boolean;
  onAiCaptainMessage: () => void | Promise<void>;
  onDirectEdit: () => void;
  onAfterPhotoChange: () => void | Promise<void>;
};

export type TeamCaptainMessageCardProps = {
  view: TeamCaptainPublicView;
  dark?: boolean;
  /** 회장·운영진 — 카드 헤더에 사진·AI·편집 */
  manage?: TeamCaptainMessageCardManageProps;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      if (typeof fr.result === "string") resolve(fr.result);
      else reject(new Error("FileReader 결과 형식이 올바르지 않습니다."));
    };
    fr.onerror = () => reject(fr.error ?? new Error("파일을 읽지 못했습니다."));
    fr.readAsDataURL(file);
  });
}

/**
 * 공개 팀 홈 — 회장 신뢰 카드(단일 인물). 운영진 목록과 역할 분리.
 * 사진·AI 인사·직접 수정은 `manage`가 있을 때 카드 헤더에만 노출.
 */
export function TeamCaptainMessageCard({ view, dark = false, manage }: TeamCaptainMessageCardProps) {
  const message = typeof view.message === "string" ? view.message : String(view.message ?? "");
  const nickname = typeof view.nickname === "string" ? view.nickname : String(view.nickname ?? "");
  const roleLabel = typeof view.roleLabel === "string" ? view.roleLabel : String(view.roleLabel ?? "");
  const photoUrl = view.photoUrl ?? null;
  const sectionTitle = captainTrustSectionTitle(roleLabel);
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const busy = Boolean(manage?.aiBusy || manage?.siblingBusy || photoBusy);

  const pickPhoto = () => inputRef.current?.click();

  const handlePhotoFile = async (list: FileList | null) => {
    const file = list?.[0];
    const tid = manage?.teamId?.trim();
    if (!file || !tid || !manage) return;
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 올릴 수 있어요.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("파일은 8MB 이하로 올려 주세요.");
      return;
    }
    setPhotoBusy(true);
    const t = toast.loading("사진을 올리는 중…");
    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      await uploadTeamCaptainPhotoCallable({
        teamId: tid,
        imageDataUrl,
        contentType: file.type || "image/jpeg",
      });
      toast.dismiss(t);
      toast.success("대표 사진을 반영했어요.");
      if (manage) await manage.onAfterPhotoChange();
    } catch (e: unknown) {
      toast.dismiss(t);
      toast.error(callableErrorMessage(e) || "업로드에 실패했어요.");
    } finally {
      setPhotoBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    const tid = manage?.teamId?.trim();
    if (!manage || !tid || photoBusy) return;
    setPhotoBusy(true);
    const t = toast.loading("사진을 제거하는 중…");
    try {
      await uploadTeamCaptainPhotoCallable({ teamId: tid, clear: true });
      toast.dismiss(t);
      toast.success("사진을 제거했어요.");
      await manage.onAfterPhotoChange();
    } catch (e: unknown) {
      toast.dismiss(t);
      toast.error(callableErrorMessage(e) || "제거에 실패했어요.");
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <section
      className={cn(
        "rounded-2xl border p-6 shadow-lg sm:p-8",
        dark
          ? "border-slate-500/80 bg-gradient-to-br from-slate-800/95 via-slate-900/90 to-slate-950/90 text-slate-100"
          : "border-gray-200/80 bg-gradient-to-br from-white via-white to-indigo-50/50 text-gray-900"
      )}
      aria-label={sectionTitle}
    >
      <div
        className={cn(
          "flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between",
          dark ? "border-slate-600/90" : "border-gray-200"
        )}
      >
        <h2
          className={cn(
            "text-[11px] font-bold uppercase tracking-[0.12em]",
            dark ? "text-slate-400" : "text-gray-500"
          )}
        >
          {sectionTitle}
        </h2>
        {manage ? (
          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => void handlePhotoFile(e.target.files)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              className={cn(
                "h-8 gap-1 text-[11px] font-medium",
                dark ? "border-slate-500 text-slate-100 hover:bg-slate-700" : ""
              )}
              onClick={pickPhoto}
            >
              {photoBusy ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
              ) : (
                <ImagePlus className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              )}
              사진 변경
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || !photoUrl}
              className={cn(
                "h-8 gap-1 text-[11px] font-medium",
                dark ? "border-slate-500 text-slate-100 hover:bg-slate-700" : ""
              )}
              onClick={() => void handleRemovePhoto()}
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              사진 제거
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              className={cn(
                "h-8 gap-1 text-[11px] font-medium",
                dark ? "border-violet-400/50 bg-violet-950/50 text-violet-100 hover:bg-violet-900/50" : ""
              )}
              onClick={() => void manage.onAiCaptainMessage()}
            >
              {manage.aiBusy ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              )}
              AI 회장 인사말
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              className={cn(
                "h-8 gap-1 text-[11px] font-medium",
                dark ? "text-slate-200 hover:bg-white/10" : "text-indigo-800 hover:bg-indigo-50"
              )}
              onClick={manage.onDirectEdit}
            >
              <Pencil className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              직접 수정
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        <div className="shrink-0 sm:pt-1">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className={cn(
                "h-28 w-28 rounded-full object-cover shadow-xl ring-offset-2 sm:h-32 sm:w-32",
                dark ? "ring-4 ring-violet-500/40 ring-offset-slate-900" : "ring-4 ring-indigo-200/90 ring-offset-white"
              )}
            />
          ) : (
            <div
              className={cn(
                "flex h-28 w-28 items-center justify-center rounded-full text-3xl font-bold shadow-inner ring-2 ring-offset-2 sm:h-32 sm:w-32 sm:text-4xl",
                dark
                  ? "bg-slate-700 text-slate-100 ring-slate-500/50 ring-offset-slate-900"
                  : "bg-indigo-100 text-indigo-800 ring-indigo-200/80 ring-offset-white"
              )}
              aria-hidden
            >
              {nickname.slice(0, 1)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3 sm:space-y-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <span className="text-xl font-bold leading-tight tracking-tight sm:text-2xl">{nickname}</span>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
                dark ? "bg-violet-900/55 text-violet-100" : "bg-indigo-100 text-indigo-900"
              )}
            >
              {roleLabel}
            </span>
          </div>

          {message.trim() ? (
            <p
              className={cn(
                "whitespace-pre-line text-[15px] leading-[1.65] sm:text-base sm:leading-relaxed",
                dark ? "text-slate-200" : "text-gray-700"
              )}
            >
              {message}
            </p>
          ) : (
            <p className={cn("text-sm italic leading-relaxed", dark ? "text-slate-400" : "text-gray-500")}>
              {manage
                ? "인사말이 비어 있어요. 「AI 회장 인사말」으로 초안을 만들거나 「직접 수정」에서 문구를 입력해 주세요."
                : "클럽을 함께 이끌고 있어요. 인사말을 추가하면 방문자에게 더 잘 전해져요."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export type TeamCaptainMessageOwnerHintProps = {
  dark?: boolean;
  onOpenProfileEdit?: () => void;
  /** 편집 모드일 때 문구만 달리함 */
  variant?: "preview" | "edit";
};

/** 소유자 — 운영진 데이터 없을 때 (방문자에게는 미표시) */
export function TeamCaptainMessageOwnerHint({
  dark = false,
  onOpenProfileEdit,
  variant = "preview",
}: TeamCaptainMessageOwnerHintProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-dashed p-4 text-sm sm:p-5",
        dark ? "border-slate-500 bg-slate-800/25 text-slate-200" : "border-indigo-200/80 bg-indigo-50/40 text-gray-800"
      )}
      aria-label="회장 소개 안내"
    >
      <p className="font-semibold">회장 인사말을 추가해 보세요</p>
      <p className={cn("mt-1.5 leading-relaxed", dark ? "text-slate-300" : "text-gray-600")}>
        {variant === "edit"
          ? "클럽 소개·추천·참여 문구를 저장한 뒤, 회장 인사말과 사진을 프로필에 반영하면 이 카드가 채워져요."
          : "회장 인사말과 사진이 있으면 신뢰와 가입 문의가 늘기 쉬워요. 준비되면 이 자리에 자동으로 표시됩니다."}
      </p>
      {onOpenProfileEdit ? (
        <button
          type="button"
          onClick={onOpenProfileEdit}
          className={cn(
            "mt-3 text-sm font-semibold underline underline-offset-2",
            dark ? "text-violet-300 hover:text-violet-200" : "text-indigo-700 hover:text-indigo-900"
          )}
        >
          프로필 편집으로 이동
        </button>
      ) : null}
    </section>
  );
}
