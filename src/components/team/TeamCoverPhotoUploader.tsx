import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { callableErrorMessage } from "@/lib/errors/callableErrorMessage";
import { uploadTeamCoverPhotoCallable } from "@/lib/team/uploadTeamCoverPhotoClient";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

const MAX_BYTES = 8 * 1024 * 1024;

export type TeamCoverPhotoUploaderProps = {
  teamId: string;
  coverUrl: string | null;
  dark?: boolean;
  onUpdated: () => void | Promise<void>;
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
 * 공개 팀 허브 — 히어로 커버 이미지 (Callable + Admin Storage 업로드, 클라이언트 Storage 쓰기 없음)
 */
export function TeamCoverPhotoUploader({ teamId, coverUrl, dark = false, onUpdated }: TeamCoverPhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pickFile = () => inputRef.current?.click();

  const handleFile = async (list: FileList | null) => {
    const file = list?.[0];
    if (!file || !teamId.trim()) return;
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 올릴 수 있어요.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("파일은 8MB 이하로 올려 주세요.");
      return;
    }

    setBusy(true);
    const t = toast.loading("커버 이미지를 올리는 중…");
    try {
      const tid = teamId.trim();
      const imageDataUrl = await readFileAsDataUrl(file);
      await uploadTeamCoverPhotoCallable({
        teamId: tid,
        imageDataUrl,
        contentType: file.type || "image/jpeg",
      });
      toast.dismiss(t);
      toast.success("커버 이미지를 반영했어요.");
      await onUpdated();
    } catch (e: unknown) {
      toast.dismiss(t);
      toast.error(callableErrorMessage(e) || "업로드에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!teamId.trim() || busy) return;
    setBusy(true);
    const t = toast.loading("커버를 제거하는 중…");
    try {
      await uploadTeamCoverPhotoCallable({ teamId: teamId.trim(), clear: true });
      toast.dismiss(t);
      toast.success("커버를 제거했어요.");
      await onUpdated();
    } catch (e: unknown) {
      toast.dismiss(t);
      toast.error(callableErrorMessage(e) || "제거에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className={cn(
        "rounded-xl border p-3 sm:p-4",
        dark ? "border-slate-600/80 bg-slate-800/30" : "border-gray-200 bg-white/95"
      )}
      aria-label="팀 커버 이미지"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <ImageIcon className={cn("h-4 w-4 shrink-0", dark ? "text-slate-400" : "text-gray-500")} aria-hidden />
          <div>
            <h3 className={cn("text-sm font-semibold", dark ? "text-slate-100" : "text-gray-900")}>히어로 커버</h3>
            <p className={cn("text-[11px] leading-snug", dark ? "text-slate-400" : "text-gray-500")}>
              단체 사진·경기 장면 등 — 팀장·운영진만 변경
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => void handleFile(e.target.files)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            className={cn("gap-1.5 text-xs", dark ? "border-slate-500 text-slate-100 hover:bg-slate-700" : "")}
            onClick={pickFile}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Upload className="h-3.5 w-3.5" aria-hidden />}
            {coverUrl ? "바꾸기" : "올리기"}
          </Button>
          {coverUrl ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              className={cn("gap-1.5 text-xs text-red-600", dark ? "hover:bg-slate-700" : "")}
              onClick={() => void handleRemove()}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              제거
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
