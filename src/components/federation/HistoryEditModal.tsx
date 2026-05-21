/**
 * 협회 연혁 수정 — 파일 업로드(PDF/TXT/DOCX) → 텍스트 추출 → AI 정리 → Storage 동기화
 */

import { useEffect, useRef, useState } from "react";
import { FileUp, FolderOpen, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { extractDocumentText } from "@/lib/extractDocumentText";
import {
  refineFederationHistoryText,
  tryLoadFederationHistorySourceBlob,
  uploadFederationHistorySourceFile,
} from "@/services/federationService";

function OverlayModal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="닫기" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {children}
        <div className="mt-6 flex justify-end gap-2 flex-wrap">{footer}</div>
      </div>
    </div>
  );
}

type ImportPhase = "idle" | "extract" | "refine";

export function HistoryEditModal({
  open,
  onClose,
  initial,
  saving,
  federationSlug,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial: string;
  saving: boolean;
  federationSlug: string;
  onSave: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState(initial);
  const [rawBackup, setRawBackup] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setText(initial);
      setRawBackup(null);
      setShowRaw(false);
      setPhase("idle");
    }
  }, [open, initial]);

  const busy = saving || phase !== "idle";

  const statusLabel =
    phase === "extract"
      ? "문서에서 텍스트 추출 중…"
      : phase === "refine"
        ? "AI로 연혁 문체 정리 중…"
        : null;

  const runExtractThenRefine = async (blob: Blob, logicalName: string) => {
    setPhase("extract");
    try {
      const raw = await extractDocumentText(blob, logicalName);
      if (!raw.trim()) {
        toast.error("추출된 텍스트가 없습니다.");
        return;
      }
      setRawBackup(raw);
      setShowRaw(false);
      setPhase("refine");
      const refined = await refineFederationHistoryText(raw);
      setText(refined);
      toast.success("추출·정리가 완료되었습니다. 필요하면 직접 수정 후 저장하세요.");
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "문서 처리에 실패했습니다.";
      toast.error(msg);
    } finally {
      setPhase("idle");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await uploadFederationHistorySourceFile(federationSlug, file);
    } catch (err) {
      console.warn("Storage 업로드 실패(무시 가능):", err);
    }
    await runExtractThenRefine(file, file.name);
  };

  const handleLoadExisting = async () => {
    setPhase("extract");
    try {
      const got = await tryLoadFederationHistorySourceBlob(federationSlug);
      if (!got) {
        toast.error("저장된 연혁 파일이 없습니다. 먼저 파일에서 가져오기로 업로드해 주세요.");
        setPhase("idle");
        return;
      }
      await runExtractThenRefine(got.blob, got.fileName);
    } catch (e) {
      console.error(e);
      toast.error("파일을 불러오지 못했습니다.");
      setPhase("idle");
    }
  };

  const handleRefineAgain = async () => {
    if (!text.trim()) {
      toast.error("정리할 내용이 없습니다.");
      return;
    }
    setPhase("refine");
    try {
      const refined = await refineFederationHistoryText(text);
      setText(refined);
      toast.success("다시 정리했습니다.");
    } catch (e) {
      console.error(e);
      toast.error("AI 정리에 실패했습니다.");
    } finally {
      setPhase("idle");
    }
  };

  const restoreRaw = () => {
    if (rawBackup != null) {
      setText(rawBackup);
      setShowRaw(false);
      toast.message("추출 원문으로 되돌렸습니다.");
    }
  };

  return (
    <OverlayModal
      open={open}
      onClose={onClose}
      title="협회 연혁 수정"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            취소
          </Button>
          <Button type="button" onClick={() => onSave(text.trim())} disabled={busy}>
            {saving ? "저장 중…" : "저장"}
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-500 mb-3">
        PDF·TXT·DOCX에서 텍스트를 추출한 뒤 AI가 연혁 형식으로 정리합니다. 파일은{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">federations/…/files/history.*</code> 에도 저장되어 다음에
        불러올 수 있습니다.
      </p>

      {statusLabel && (
        <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-3 py-2 mb-3">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
          {statusLabel}
        </div>
      )}

      {rawBackup != null && (
        <div className="flex flex-wrap gap-2 mb-2">
          <Button
            type="button"
            size="sm"
            variant={showRaw ? "default" : "outline"}
            onClick={() => setShowRaw(false)}
          >
            편집본
          </Button>
          <Button
            type="button"
            size="sm"
            variant={showRaw ? "outline" : "default"}
            onClick={() => setShowRaw(true)}
          >
            추출 원문
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={restoreRaw}>
            원문으로 되돌리기
          </Button>
        </div>
      )}

      <label className="block text-sm font-medium text-gray-700 mb-1">연혁·설립 배경·활동 방향</label>
      <textarea
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[200px]"
        value={showRaw && rawBackup != null ? rawBackup : text}
        onChange={(e) => {
          if (!showRaw) setText(e.target.value);
        }}
        readOnly={showRaw}
        disabled={busy}
      />

      <div className="flex flex-wrap gap-2 mt-3">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-1.5"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <FileUp className="w-4 h-4" />
          파일에서 가져오기
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-1.5"
          disabled={busy}
          onClick={handleLoadExisting}
        >
          <FolderOpen className="w-4 h-4" />
          기존 파일 불러오기
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={busy || !text.trim()}
          onClick={handleRefineAgain}
        >
          <Sparkles className="w-4 h-4" />
          AI로 다시 정리
        </Button>
      </div>
    </OverlayModal>
  );
}
