/**
 * 공개 팀 홈 — 대표 인사말
 * Desktop: 좌측 대표 사진(~30%) + 우측 이름·직책·인사말(~70%)
 * Mobile: 사진 상단 → 텍스트
 */
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

/** 디자인 토큰 — 원형/사각형 전환 시 이 클래스만 교체 */
const CAPTAIN_PHOTO_SHAPE = "rounded-2xl";

export type TeamCaptainMessageCardManageProps = {
  teamId: string;
  aiBusy: boolean;
  siblingBusy?: boolean;
  onAiCaptainMessage: () => void | Promise<void>;
  onDirectEdit: () => void;
  onAfterPhotoChange: () => void | Promise<void>;
};

export type TeamCaptainMessageCardProps = {
  view: TeamCaptainPublicView;
  dark?: boolean;
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

export function TeamCaptainMessageCard({ view, dark = false, manage }: TeamCaptainMessageCardProps) {
  const message = typeof view.message === "string" ? view.message : String(view.message ?? "");
  const nickname = typeof view.nickname === "string" ? view.nickname : String(view.nickname ?? "");
  const roleLabel = typeof view.roleLabel === "string" ? view.roleLabel : String(view.roleLabel ?? "");
  const photoUrl = typeof view.photoUrl === "string" && view.photoUrl.trim() ? view.photoUrl.trim() : null;
  const sectionTitle = captainTrustSectionTitle(roleLabel);
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
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
      await manage.onAfterPhotoChange();
    } catch (e: unknown) {
      toast.dismiss(t);
      toast.error(callableErrorMessage(e) || "업로드에 실패했어요.");
    } finally {
      setPhotoBusy(false);
      setDragOver(false);
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
        "overflow-hidden rounded-2xl border shadow-sm",
        dark ? "border-slate-600/80 bg-slate-900/40 text-slate-100" : "border-gray-200 bg-white text-gray-900"
      )}
      aria-label={sectionTitle}
    >
      <div
        className={cn(
          "flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5",
          dark ? "border-slate-700" : "border-gray-100"
        )}
      >
        <h2
          className={cn(
            "text-sm font-semibold tracking-tight",
            dark ? "text-slate-100" : "text-gray-900"
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
              className={cn("h-8 gap-1 text-[11px]", dark ? "border-slate-500 text-slate-100 hover:bg-slate-700" : "")}
              onClick={pickPhoto}
            >
              {photoBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" aria-hidden />
              )}
              사진 변경
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || !photoUrl}
              className={cn("h-8 gap-1 text-[11px]", dark ? "border-slate-500 text-slate-100 hover:bg-slate-700" : "")}
              onClick={() => void handleRemovePhoto()}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              사진 삭제
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              className="h-8 gap-1 text-[11px]"
              onClick={() => void manage.onAiCaptainMessage()}
            >
              {manage.aiBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
              )}
              AI 인사말
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              className={cn("h-8 gap-1 text-[11px]", dark ? "text-slate-200 hover:bg-white/10" : "")}
              onClick={manage.onDirectEdit}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              직접 수정
            </Button>
          </div>
        ) : null}
      </div>

      {/* Mobile·Desktop 동일: 좌측 고정 사진 + 우측 텍스트 */}
      <div className="flex flex-row items-start gap-3 p-4 sm:gap-5 sm:p-5 md:gap-6 md:p-6">
        {manage ? (
          <div
            role="button"
            tabIndex={busy ? -1 : 0}
            aria-label="대표 사진 변경 — 클릭 또는 이미지 드래그"
            aria-disabled={busy}
            onClick={() => {
              if (!busy) pickPhoto();
            }}
            onKeyDown={(e) => {
              if (busy) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                pickPhoto();
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!busy) setDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!busy) setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOver(false);
              if (busy) return;
              void handlePhotoFile(e.dataTransfer.files);
            }}
            className={cn(
              "relative h-[88px] w-[88px] shrink-0 cursor-pointer overflow-hidden sm:h-[120px] sm:w-[120px] md:h-[144px] md:w-[144px]",
              CAPTAIN_PHOTO_SHAPE,
              dark ? "bg-slate-800 hover:ring-2 hover:ring-slate-500" : "bg-slate-100 hover:ring-2 hover:ring-indigo-300",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
              dragOver && (dark ? "ring-2 ring-violet-400" : "ring-2 ring-indigo-400"),
              busy && "pointer-events-none opacity-70"
            )}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={`${nickname} ${roleLabel}`.trim() || "대표 사진"}
                className="pointer-events-none h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div
                className={cn(
                  "flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-center text-[10px] font-medium sm:text-xs",
                  dark ? "text-slate-400" : "text-slate-500"
                )}
              >
                <ImagePlus className="h-4 w-4 opacity-80" aria-hidden />
                {dragOver ? "여기에 놓기" : "클릭·드래그"}
              </div>
            )}
            {dragOver ? (
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-semibold text-white sm:text-xs"
                aria-hidden
              >
                놓으면 업로드
              </div>
            ) : null}
          </div>
        ) : (
          <div
            className={cn(
              "relative h-[88px] w-[88px] shrink-0 overflow-hidden sm:h-[120px] sm:w-[120px] md:h-[144px] md:w-[144px]",
              CAPTAIN_PHOTO_SHAPE,
              dark ? "bg-slate-800" : "bg-slate-100"
            )}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={`${nickname} ${roleLabel}`.trim() || "대표 사진"}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div
                className={cn(
                  "flex h-full w-full items-center justify-center text-[10px] font-medium sm:text-xs",
                  dark ? "text-slate-500" : "text-slate-400"
                )}
                aria-hidden
              >
                사진
              </div>
            )}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="space-y-1">
            <p className={cn("text-lg font-bold tracking-tight sm:text-xl md:text-2xl", dark ? "text-white" : "text-gray-900")}>
              {nickname || "대표"}
            </p>
            {roleLabel ? (
              <p className={cn("text-xs font-medium sm:text-sm", dark ? "text-slate-300" : "text-gray-500")}>
                {roleLabel}
              </p>
            ) : null}
          </div>

          {message.trim() ? (
            <p
              className={cn(
                "mt-2 whitespace-pre-line text-sm leading-[1.65] sm:mt-3 sm:text-[15px] sm:leading-[1.7] md:text-base",
                dark ? "text-slate-200" : "text-gray-700"
              )}
            >
              {message}
            </p>
          ) : (
            <p className={cn("mt-2 text-sm italic leading-relaxed sm:mt-3", dark ? "text-slate-400" : "text-gray-500")}>
              {manage
                ? "인사말이 비어 있어요. AI 인사말 또는 직접 수정으로 작성해 주세요."
                : "인사말을 준비 중입니다."}
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
      <p className="font-semibold">대표 인사말을 추가해 보세요</p>
      <p className={cn("mt-1.5 leading-relaxed", dark ? "text-slate-300" : "text-gray-600")}>
        {variant === "edit"
          ? "소개 문구를 저장한 뒤 대표 사진·인사말을 반영하면 이 영역에 표시됩니다."
          : "대표 사진과 인사말이 있으면 방문자가 팀을 더 신뢰하기 쉬워요."}
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
