import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  federationSlug: string;
  open: boolean;
  onClose: () => void;
  onCompleted?: () => void | Promise<void>;
  onGenerated?: (data: {
    introMessage?: string;
    history?: string;
    vision?: string;
    activities?: string[];
    organization?: { summary?: string };
    executives?: Array<{ name: string; role: string }>;
    dryRun?: boolean;
  }) => void;
}

export default function FederationAutoGeneratePanel({
  federationSlug,
  open,
  onClose,
  onCompleted,
  onGenerated,
}: Props) {
  const [text, setText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!open) return null;

  const uploadImagesAndGetUrls = async (files: FileList): Promise<string[]> => {
    if (!files || files.length === 0) return [];
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const path = `federations/${federationSlug}/uploads/${Date.now()}_${file.name}`;
      const r = ref(storage, path);
      await uploadBytes(r, file, { contentType: file.type });
      const url = await getDownloadURL(r);
      urls.push(url);
    }
    return urls;
  };

  const readPdfAsBase64 = async (): Promise<string | undefined> => {
    if (!pdfFile) return undefined;
    const isPdfType = (pdfFile.type || "").toLowerCase().includes("pdf");
    const isPdfExt = pdfFile.name.toLowerCase().endsWith(".pdf");
    if (!isPdfType && !isPdfExt) {
      throw new Error("PDF 파일만 업로드 가능합니다.");
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(pdfFile);
    });
    return dataUrl;
  };

  const handleImageUploadAndOcr = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setOcrLoading(true);
    try {
      const urls = await uploadImagesAndGetUrls(files);
      setImageUrls(urls);
      const extract = httpsCallable<{ imageUrls: string[] }, { text?: string; error?: string }>(
        functions,
        "extractTextFromImages"
      );
      const res = await extract({ imageUrls: urls });
      console.log("[FederationAutoGeneratePanel] OCR request urls:", urls);
      console.log("[FederationAutoGeneratePanel] OCR response data:", res.data);
      const extracted = String(res.data?.text || "").trim();
      if (extracted) {
        setText((prev) => (prev ? `${prev}\n${extracted}` : extracted));
        toast.success("이미지 텍스트 추출이 완료되어 입력창에 반영했습니다.");
      } else {
        const backendError = String(res.data?.error || "").trim();
        const message = backendError
          ? `OCR 실패: ${backendError}`
          : "이미지에서 텍스트를 찾지 못했습니다.";
        setErrorMessage(message);
        toast.error(message);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("이미지 텍스트 추출 실패");
      toast.error("이미지 텍스트 추출 실패");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleRun = async () => {
    if (!federationSlug) return;
    setErrorMessage(null);

    let finalText = text.trim();
    // 이미지는 올렸는데 OCR 반영이 비어있는 경우, 생성 버튼에서 한 번 더 OCR 시도
    if (!finalText && imageUrls.length > 0) {
      try {
        const extract = httpsCallable<{ imageUrls: string[] }, { text?: string }>(functions, "extractTextFromImages");
        const res = await extract({ imageUrls });
        const extracted = String(res.data?.text || "").trim();
        if (extracted) {
          finalText = extracted;
          setText((prev) => (prev ? `${prev}\n${extracted}` : extracted));
        }
      } catch (e) {
        console.error(e);
      }
    }

    // OCR 분리 구조: 최종 생성은 text/PDF 기반으로만 실행
    if (!finalText && !pdfFile) {
      const msg = imageUrls.length > 0
        ? "이미지는 업로드되었지만 OCR 텍스트 추출이 되지 않았습니다. 텍스트를 직접 입력하거나 다른 이미지를 시도하세요."
        : "텍스트 또는 PDF 내용을 입력해주세요.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }
    setLoading(true);
    try {
      const pdfBase64 = await readPdfAsBase64();

      const run = httpsCallable(functions, "generateFederationFromSources");
      const res = await run({
        federationSlug,
        text: finalText || undefined,
        pdfBase64,
        imageUrls,
        dryRun: true,
      });
      const raw = (res.data || {}) as any;
      const payload = (raw?.data && typeof raw.data === "object") ? raw.data : raw;
      const resolvedIntro =
        String(
          payload?.introMessage ||
          payload?.introGreeting ||
          payload?.greeting ||
          payload?.intro ||
          payload?.president?.message ||
          ""
        ).trim() || undefined;
      const normalized = {
        ...payload,
        introMessage: resolvedIntro,
        // 일부 화면/구버전 필드 호환
        introGreeting: resolvedIntro,
        history: String(payload?.history || "").trim() || undefined,
        vision: String(payload?.vision || "").trim() || undefined,
        activities: Array.isArray(payload?.activities) ? payload.activities : undefined,
        organization:
          payload?.organization && !Array.isArray(payload.organization)
            ? payload.organization
            : undefined,
        executives: Array.isArray(payload?.executives) ? payload.executives : undefined,
      };
      console.log("[FederationAutoGeneratePanel] generate response:", raw);
      console.log("[FederationAutoGeneratePanel] normalized patch:", normalized);
      onGenerated?.(normalized);
      toast.success("AI 생성 결과를 미리보기로 준비했습니다. 적용을 누르면 저장됩니다.");
      onClose();
      // Draft 모드에서는 자동 저장/리프레시 금지 (Apply에서만 저장)
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || e?.code || "자동 생성에 실패했습니다.";
      setErrorMessage(String(msg));
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="닫기" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold mb-4">협회 자동 생성 (MVP)</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">텍스트 입력</label>
            <textarea
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[140px]"
              placeholder="원문 텍스트를 붙여넣으세요"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PDF 파일만 업로드 (.pdf)</label>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (!file) {
                    setPdfFile(null);
                    return;
                  }
                  const isPdfType = (file.type || "").toLowerCase().includes("pdf");
                  const isPdfExt = file.name.toLowerCase().endsWith(".pdf");
                  if (!isPdfType && !isPdfExt) {
                    toast.error("PDF 업로드 칸에는 PDF 파일만 넣어주세요.");
                    e.currentTarget.value = "";
                    setPdfFile(null);
                    return;
                  }
                  setPdfFile(file);
                }}
              />
              <p className="text-xs text-gray-500 mt-1">이미지(PNG/JPG)는 아래 이미지 업로드 칸을 사용하세요.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이미지 업로드 (PNG/JPG, 여러 장)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  void handleImageUploadAndOcr(e.target.files);
                }}
              />
              {ocrLoading ? <p className="text-xs text-blue-600 mt-1">OCR 처리 중...</p> : null}
              {!ocrLoading && imageUrls.length > 0 ? (
                <p className="text-xs text-gray-600 mt-1">이미지 {imageUrls.length}장 업로드/반영 완료</p>
              ) : null}
            </div>
          </div>
        </div>
        {errorMessage ? (
          <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading || ocrLoading}>
            취소
          </Button>
          <Button type="button" onClick={handleRun} disabled={loading || ocrLoading}>
            {loading ? "생성 중…" : "협회 자동 생성"}
          </Button>
        </div>
      </div>
    </div>
  );
}

