/**
 * 공개 팀 허브 — 대표 이미지(Hero) 단일 관리
 * 모바일·데스크톱 공통: 파일 선택 · DnD · 16:9 Crop · Callable 업로드 · 즉시 미리보기
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { callableErrorMessage } from "@/lib/errors/callableErrorMessage";
import { uploadTeamCoverPhotoCallable } from "@/lib/team/uploadTeamCoverPhotoClient";
import { TeamCoverCropPanel } from "@/components/team/TeamCoverCropPanel";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const MAX_BYTES = 8 * 1024 * 1024;
/** 모바일 갤러리·카메라 호환 — mime + 확장자 */
const ACCEPT = "image/*,.jpg,.jpeg,.png,.webp";

export type TeamHeroCoverManageProps = {
  teamId: string;
  coverUrl: string | null;
  onUpdated: () => void | Promise<void>;
  /** Hero 시각(배경·타이틀). displayUrl은 업로드 직후 로컬 미리보기 포함 */
  children: (ctx: { displayUrl: string | null }) => ReactNode;
  className?: string;
};

function hasFilePayload(dt: DataTransfer | null): boolean {
  if (!dt) return false;
  return Array.from(dt.types || []).some((t) => t === "Files" || t === "application/x-moz-file");
}

/**
 * 대표 이미지는 Hero에서만 관리합니다. (별도 섹션 없음)
 */
export function TeamHeroCoverManage({
  teamId,
  coverUrl,
  onUpdated,
  children,
  className,
}: TeamHeroCoverManageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  const displayUrl = localPreview || coverUrl;

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!cropFile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [cropFile]);

  const beginCrop = (file: File) => {
    if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      toast.error("이미지 파일만 올릴 수 있어요.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("파일은 8MB 이하로 올려 주세요.");
      return;
    }
    setCropFile(file);
  };

  const onPick = (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    beginCrop(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const openPicker = () => {
    if (busy) return;
    inputRef.current?.click();
  };

  const resetDrag = () => {
    dragDepthRef.current = 0;
    setDragOver(false);
  };

  const uploadCropped = async (imageDataUrl: string) => {
    if (!teamId.trim()) return;
    setBusy(true);
    const t = toast.loading("대표 이미지를 올리는 중…");
    try {
      const out = await uploadTeamCoverPhotoCallable({
        teamId: teamId.trim(),
        imageDataUrl,
        contentType: "image/jpeg",
      });
      setLocalPreview(out.coverPhotoUrl || imageDataUrl);
      setCropFile(null);
      toast.dismiss(t);
      toast.success("대표 이미지를 반영했어요.");
      await onUpdated();
    } catch (e: unknown) {
      toast.dismiss(t);
      toast.error(callableErrorMessage(e) || "업로드에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!teamId.trim() || busy) return;
    if (!window.confirm("대표 이미지를 삭제할까요?")) return;
    setBusy(true);
    const t = toast.loading("삭제하는 중…");
    try {
      await uploadTeamCoverPhotoCallable({ teamId: teamId.trim(), clear: true });
      setLocalPreview(null);
      toast.dismiss(t);
      toast.success("대표 이미지를 삭제했어요.");
      await onUpdated();
    } catch (e: unknown) {
      toast.dismiss(t);
      toast.error(callableErrorMessage(e) || "삭제에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  const cropModal =
    portalReady && cropFile
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label="대표 이미지 자르기"
          >
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              aria-label="닫기"
              disabled={busy}
              onClick={() => {
                if (!busy) setCropFile(null);
              }}
            />
            <div className="relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
              <TeamCoverCropPanel
                file={cropFile}
                busy={busy}
                onCancel={() => setCropFile(null)}
                onConfirm={uploadCropped}
              />
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div
      className={cn("relative", className)}
      aria-label="대표 이미지 — 탭 또는 드래그로 변경"
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (busy || !hasFilePayload(e.dataTransfer)) return;
        dragDepthRef.current += 1;
        setDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (busy || !hasFilePayload(e.dataTransfer)) return;
        try {
          e.dataTransfer.dropEffect = "copy";
        } catch {
          /* ignore */
        }
        if (!dragOver) setDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepthRef.current -= 1;
        if (dragDepthRef.current <= 0) resetDrag();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        resetDrag();
        if (busy) return;
        onPick(e.dataTransfer.files);
      }}
    >
      {children({ displayUrl })}

      {/* 관리 버튼 — 모바일 터치 영역 확대 */}
      <div className="absolute left-2 top-2 z-30 flex max-w-[calc(100%-1rem)] flex-wrap gap-1.5 sm:left-3 sm:top-3">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          className="h-9 min-h-9 gap-1.5 bg-black/60 px-3 text-xs text-white hover:bg-black/75 sm:h-8 sm:text-xs"
          onClick={openPicker}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" aria-hidden />
          )}
          대표 이미지 변경
        </Button>
        {displayUrl ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            className="h-9 min-h-9 gap-1.5 bg-black/45 px-3 text-xs text-white hover:bg-black/60 sm:h-8"
            onClick={() => void handleRemove()}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            삭제
          </Button>
        ) : null}
      </div>

      {/* 모바일: 커버 탭으로도 변경 (빈 영역 / 하단 힌트) */}
      {!displayUrl && !dragOver ? (
        <button
          type="button"
          disabled={busy}
          onClick={openPicker}
          className="absolute inset-x-0 bottom-12 z-20 flex justify-center px-4 sm:pointer-events-none sm:bottom-16"
        >
          <span className="rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-medium text-white/95 sm:text-xs">
            탭하거나 이미지를 끌어다 놓아 커버를 설정하세요
          </span>
        </button>
      ) : null}

      {dragOver ? (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-xl border-2 border-dashed border-white/90 bg-black/50">
          <p className="px-4 text-center text-sm font-semibold text-white sm:text-base">
            여기에 놓으면 대표 이미지로 올립니다
          </p>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={busy}
        // iOS Safari: 갤러리 선택 허용 (capture 강제하지 않음)
        onChange={(e) => onPick(e.target.files)}
      />

      {cropModal}
    </div>
  );
}

/** @deprecated Hero 전용 TeamHeroCoverManage 사용 — 섹션 UI 제거됨 */
export function TeamCoverPhotoUploader(props: {
  teamId: string;
  coverUrl: string | null;
  dark?: boolean;
  onUpdated: () => void | Promise<void>;
}) {
  return (
    <TeamHeroCoverManage
      teamId={props.teamId}
      coverUrl={props.coverUrl}
      onUpdated={props.onUpdated}
      className="overflow-hidden rounded-xl"
    >
      {({ displayUrl }) => (
        <div className="relative aspect-[16/9] w-full bg-slate-200">
          {displayUrl ? (
            <img src={displayUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
              대표 이미지 없음
            </div>
          )}
        </div>
      )}
    </TeamHeroCoverManage>
  );
}
