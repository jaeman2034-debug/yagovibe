/**
 * CV-1 I4 — ROI picker (Internal Pilot · Coach staff only)
 * @see docs/YAGO_CV_LAYER_V1_IMPLEMENTATION_BRIEF.md §4
 */
import { Crop, Loader2, ScanSearch } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  callStartAcademyCvAnalysis,
  parseAcademyCvAnalysisError,
} from "@/lib/academy/academyCvCallables";
import { loadAcademyCvActiveRun } from "@/lib/academy/academyCvRead";
import {
  type AcademyCvAnalyzeCallableResult,
  type CvRoiV1,
  CV_ROI_MAX_AREA,
  CV_ROI_MIN_AREA,
  isCvRoiAreaValid,
  isCvRoiInBounds,
} from "@/lib/academy/academyCvTypes";
import { isPrivacyEngineV1Enabled } from "@/lib/privacy/privacyEngineV1";

const DEFAULT_ROI: CvRoiV1 = {
  x: 0.3,
  y: 0.28,
  w: 0.4,
  h: 0.36,
  frameIndex: 0,
  coordinateSpace: "normalized_0_1",
};

type DragMode = "move" | "nw" | "ne" | "sw" | "se" | null;

type Props = {
  teamId: string;
  mediaId: string;
  videoFile: File;
  playerId?: string;
  privacyStatus: string | null;
  disabled?: boolean;
  onCvRunUpdated?: () => void;
};

function roiEqual(a: CvRoiV1, b: CvRoiV1): boolean {
  return (
    Math.abs(a.x - b.x) < 0.001 &&
    Math.abs(a.y - b.y) < 0.001 &&
    Math.abs(a.w - b.w) < 0.001 &&
    Math.abs(a.h - b.h) < 0.001
  );
}

function clampRoi(raw: CvRoiV1): CvRoiV1 {
  let { x, y, w, h } = raw;
  w = Math.max(0.05, Math.min(1, w));
  h = Math.max(0.05, Math.min(1, h));
  x = Math.max(0, Math.min(1 - w, x));
  y = Math.max(0, Math.min(1 - h, y));
  return { ...raw, x, y, w, h };
}

function formatMetric(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(2);
}

export function CvRoiPickerPanel({
  teamId,
  mediaId,
  videoFile,
  playerId,
  privacyStatus,
  disabled,
  onCvRunUpdated,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameImageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    origin: CvRoiV1;
  } | null>(null);

  const [frameReady, setFrameReady] = useState(false);
  const [frameError, setFrameError] = useState<string | null>(null);
  const [cvLoading, setCvLoading] = useState(true);
  const [roi, setRoi] = useState<CvRoiV1>(DEFAULT_ROI);
  const [savedRoi, setSavedRoi] = useState<CvRoiV1 | null>(null);
  const [roiVersion, setRoiVersion] = useState<number | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [isEditingRoi, setIsEditingRoi] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [displayConfidence, setDisplayConfidence] = useState<number | undefined>();
  const [displayVisibility, setDisplayVisibility] = useState<number | undefined>();
  const [hasCvHistory, setHasCvHistory] = useState(false);

  const privacyReady = privacyStatus === "anonymized";
  const privacyEngineOn = isPrivacyEngineV1Enabled();
  const roiValid = isCvRoiAreaValid(roi) && isCvRoiInBounds(roi);
  const canReprocess =
    Boolean(teamId && mediaId && frameReady && roiValid && privacyReady && !analyzing && !disabled);

  useEffect(() => {
    if (!import.meta.env.DEV || canReprocess || analyzing) return;
    const blockers: string[] = [];
    if (!teamId) blockers.push("teamId");
    if (!mediaId) blockers.push("mediaId");
    if (!frameReady) blockers.push("frameReady");
    if (!roiValid) blockers.push("roiValid");
    if (!privacyReady) {
      blockers.push(
        privacyEngineOn
          ? `privacyStatus!==anonymized (현재: ${privacyStatus ?? "null"} — Whisper 「분석 시작」 후 anonymized 필요)`
          : "VITE_PRIVACY_ENGINE_V1=false"
      );
    }
    if (disabled) blockers.push("disabled");
    console.info("[ACADEMY-CV] CV 분석 시작 disabled", { blockers, privacyStatus, privacyReady });
  }, [
    analyzing,
    canReprocess,
    disabled,
    frameReady,
    mediaId,
    privacyEngineOn,
    privacyReady,
    privacyStatus,
    roiValid,
    teamId,
  ]);

  const applyCvFirestoreState = useCallback(
    (params: {
      cvRoi?: CvRoiV1;
      cvRoiVersion?: number;
      activeRunId?: string;
      sessionConfidence?: number;
      visibilityRatio?: number;
      hasHistory: boolean;
    }) => {
      if (params.cvRoi) {
        setRoi(params.cvRoi);
        setSavedRoi(params.cvRoi);
      }
      setRoiVersion(params.cvRoiVersion ?? null);
      setActiveRunId(params.activeRunId ?? null);
      setDisplayConfidence(params.sessionConfidence);
      setDisplayVisibility(params.visibilityRatio);
      setHasCvHistory(params.hasHistory);
      if (params.hasHistory && params.cvRoi) {
        setIsEditingRoi(false);
      }
    },
    []
  );

  const refreshCvState = useCallback(async () => {
    setCvLoading(true);
    try {
      const { media, activeRun } = await loadAcademyCvActiveRun(teamId, mediaId);
      const cvRoi = media?.cvRoi ?? activeRun?.roiSnapshot;
      applyCvFirestoreState({
        cvRoi,
        cvRoiVersion: media?.cvRoiVersion ?? activeRun?.roiVersion,
        activeRunId: activeRun?.runId ?? media?.cvActiveRunId,
        sessionConfidence: activeRun?.sessionConfidence,
        visibilityRatio: activeRun?.visibilityRatio,
        hasHistory: Boolean(activeRun || media?.cvActiveRunId),
      });
    } catch (e) {
      console.warn("[ACADEMY-CV] load active run failed", e);
    } finally {
      setCvLoading(false);
    }
  }, [applyCvFirestoreState, mediaId, teamId]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = frameImageRef.current;
    const container = containerRef.current;
    if (!canvas || !img || !container) return;

    const maxWidth = container.clientWidth || 640;
    const scale = maxWidth / img.naturalWidth;
    const displayW = Math.round(img.naturalWidth * scale);
    const displayH = Math.round(img.naturalHeight * scale);

    canvas.width = displayW;
    canvas.height = displayH;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, displayW, displayH);
    ctx.drawImage(img, 0, 0, displayW, displayH);

    const rx = roi.x * displayW;
    const ry = roi.y * displayH;
    const rw = roi.w * displayW;
    const rh = roi.h * displayH;

    ctx.fillStyle = "rgba(16, 185, 129, 0.12)";
    ctx.strokeStyle = isEditingRoi ? "#059669" : "#6b7280";
    ctx.lineWidth = 2;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeRect(rx, ry, rw, rh);

    if (isEditingRoi) {
      const handle = 7;
      ctx.fillStyle = "#059669";
      for (const [hx, hy] of [
        [rx, ry],
        [rx + rw, ry],
        [rx, ry + rh],
        [rx + rw, ry + rh],
      ]) {
        ctx.fillRect(hx - handle / 2, hy - handle / 2, handle, handle);
      }
    }
  }, [isEditingRoi, roi]);

  useEffect(() => {
    setRoi(DEFAULT_ROI);
    setSavedRoi(null);
    setRoiVersion(null);
    setActiveRunId(null);
    setIsEditingRoi(true);
    setAnalysisError(null);
    setDisplayConfidence(undefined);
    setDisplayVisibility(undefined);
    setHasCvHistory(false);
    void refreshCvState();
  }, [mediaId, refreshCvState]);

  useEffect(() => {
    setFrameReady(false);
    setFrameError(null);
    frameImageRef.current = null;

    const url = URL.createObjectURL(videoFile);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    let cancelled = false;

    const captureFrame = () => {
      if (cancelled) return;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) {
        setFrameError("영상 프레임을 읽을 수 없습니다.");
        return;
      }
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const ctx = off.getContext("2d");
      if (!ctx) {
        setFrameError("캔버스를 초기화할 수 없습니다.");
        return;
      }
      ctx.drawImage(video, 0, 0, w, h);
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        frameImageRef.current = img;
        setFrameReady(true);
      };
      img.onerror = () => {
        if (!cancelled) setFrameError("첫 프레임을 표시할 수 없습니다.");
      };
      img.src = off.toDataURL("image/jpeg", 0.92);
    };

    video.addEventListener(
      "loadeddata",
      () => {
        video.currentTime = 0;
      },
      { once: true }
    );
    video.addEventListener("seeked", captureFrame, { once: true });
    video.addEventListener("error", () => {
      if (!cancelled) setFrameError("영상을 불러올 수 없습니다.");
    });

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };
  }, [videoFile]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, frameReady]);

  useEffect(() => {
    const onResize = () => drawCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [drawCanvas]);

  function normFromPointer(clientX: number, clientY: number): { nx: number; ny: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;
    return { nx: Math.max(0, Math.min(1, nx)), ny: Math.max(0, Math.min(1, ny)) };
  }

  function hitTest(nx: number, ny: number): DragMode {
    const handle = 0.04;
    const { x, y, w, h } = roi;
    const corners: Array<[DragMode, number, number]> = [
      ["nw", x, y],
      ["ne", x + w, y],
      ["sw", x, y + h],
      ["se", x + w, y + h],
    ];
    for (const [mode, cx, cy] of corners) {
      if (Math.abs(nx - cx) <= handle && Math.abs(ny - cy) <= handle) return mode;
    }
    if (nx >= x && nx <= x + w && ny >= y && ny <= y + h) return "move";
    return null;
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isEditingRoi || analyzing) return;
    const pt = normFromPointer(e.clientX, e.clientY);
    if (!pt) return;
    const mode = hitTest(pt.nx, pt.ny);
    if (!mode) return;
    dragRef.current = { mode, startX: pt.nx, startY: pt.ny, origin: { ...roi } };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const pt = normFromPointer(e.clientX, e.clientY);
    if (!pt) return;
    const dx = pt.nx - drag.startX;
    const dy = pt.ny - drag.startY;
    const o = drag.origin;
    let next: CvRoiV1 = { ...o };

    switch (drag.mode) {
      case "move":
        next = clampRoi({ ...o, x: o.x + dx, y: o.y + dy });
        break;
      case "nw":
        next = clampRoi({ ...o, x: o.x + dx, y: o.y + dy, w: o.w - dx, h: o.h - dy });
        break;
      case "ne":
        next = clampRoi({ ...o, y: o.y + dy, w: o.w + dx, h: o.h - dy });
        break;
      case "sw":
        next = clampRoi({ ...o, x: o.x + dx, w: o.w - dx, h: o.h + dy });
        break;
      case "se":
        next = clampRoi({ ...o, w: o.w + dx, h: o.h + dy });
        break;
      default:
        break;
    }
    setRoi(next);
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (dragRef.current) {
      dragRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function applyCallableResult(result: AcademyCvAnalyzeCallableResult) {
    if (result.sessionConfidence != null) setDisplayConfidence(result.sessionConfidence);
    if (result.confidenceBreakdown?.visibilityRatio != null) {
      setDisplayVisibility(result.confidenceBreakdown.visibilityRatio);
    }
    if (result.roiVersion != null) setRoiVersion(result.roiVersion);
    if (result.runId) setActiveRunId(result.runId);
    setSavedRoi({ ...roi });
    setHasCvHistory(true);
    setIsEditingRoi(false);
    if (result.status === "failed") {
      setAnalysisError(result.message ?? result.errorCode ?? "CV 분석 실패");
    }
  }

  async function runAnalysis() {
    if (!canReprocess) return;
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await callStartAcademyCvAnalysis({
        teamId,
        mediaId,
        playerId,
        roi,
      });
      applyCallableResult(result);
      await refreshCvState();
      if (result.status === "ok" || result.status === "warning") {
        onCvRunUpdated?.();
      }
    } catch (e) {
      const parsed = parseAcademyCvAnalysisError(e);
      setAnalysisError(parsed.message);
    } finally {
      setAnalyzing(false);
    }
  }

  function startRoiEdit() {
    setIsEditingRoi(true);
    setAnalysisError(null);
  }

  function cancelRoiEdit() {
    if (savedRoi) setRoi(savedRoi);
    setIsEditingRoi(false);
  }

  const areaPct = Math.round(roi.w * roi.h * 100);
  const showMetrics =
    displayConfidence != null ||
    displayVisibility != null ||
    roiVersion != null ||
    hasCvHistory;

  return (
    <div className="space-y-3 rounded-xl border-2 border-violet-300 bg-violet-50/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <Crop className="h-5 w-5 text-violet-700" />
            CV 분석 · ROI
          </h4>
          <p className="mt-1 text-xs text-gray-700">
            cvActiveRunId 기준 active run 조회 · ROI 편집 · 재분석 (I4 Internal Pilot).
          </p>
        </div>
        {cvLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-violet-700" />
        ) : roiVersion != null ? (
          <span className="shrink-0 rounded-full border border-violet-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-violet-900">
            ROI Version: {roiVersion}
          </span>
        ) : null}
      </div>

      {!privacyEngineOn ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Privacy Engine이 비활성입니다. CV 분석은 anonymized 영상이 필요합니다 (
          <code className="text-[10px]">VITE_PRIVACY_ENGINE_V1=true</code>).
        </p>
      ) : !privacyReady ? (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          Whisper 「분석 시작」 후 anonymized 영상이 준비되면 CV 분석을 실행할 수 있습니다.
          {privacyStatus ? ` (현재: ${privacyStatus})` : null}
        </p>
      ) : null}

      {frameError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {frameError}
        </p>
      ) : (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-800">
            First Frame Preview
          </p>
          <div ref={containerRef} className="overflow-hidden rounded-lg border border-violet-200 bg-black/90">
            <canvas
              ref={canvasRef}
              className={cn(
                "mx-auto block max-w-full touch-none",
                isEditingRoi && !analyzing ? "cursor-crosshair" : "cursor-default opacity-95"
              )}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            />
            {!frameReady ? (
              <p className="px-3 py-6 text-center text-xs text-violet-100">첫 프레임 로딩…</p>
            ) : null}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-700">
        <span>
          ROI 면적: <strong>{areaPct}%</strong> (허용 {Math.round(CV_ROI_MIN_AREA * 100)}–
          {Math.round(CV_ROI_MAX_AREA * 100)}%)
        </span>
        {!roiValid ? (
          <span className="font-semibold text-red-700">범위를 조정해 주세요.</span>
        ) : null}
        {!isEditingRoi ? (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">ROI 잠금</span>
        ) : null}
        {activeRunId ? (
          <span className="text-gray-500">active run · {activeRunId.slice(0, 8)}…</span>
        ) : null}
      </div>

      {showMetrics ? (
        <div className="rounded-lg border border-violet-200 bg-white/90 px-3 py-2 text-xs text-gray-900">
          <div className="grid gap-1 sm:grid-cols-2">
            <p>
              Visibility Ratio: <strong>{formatMetric(displayVisibility)}</strong>
            </p>
            <p>
              Session Confidence: <strong>{formatMetric(displayConfidence)}</strong>
            </p>
          </div>
          <p className="mt-1 text-[10px] text-gray-500">읽기 전용 · 수정/Override 금지</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!hasCvHistory ? (
          <Button type="button" size="sm" disabled={!canReprocess} onClick={() => void runAnalysis()}>
            {analyzing ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                CV 분석 중…
              </>
            ) : (
              <>
                <ScanSearch className="mr-1 h-4 w-4" />
                CV 분석 시작
              </>
            )}
          </Button>
        ) : null}

        {hasCvHistory && !isEditingRoi ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={analyzing || disabled}
            onClick={startRoiEdit}
          >
            ROI 수정
          </Button>
        ) : null}

        {hasCvHistory && isEditingRoi ? (
          <Button type="button" size="sm" variant="ghost" disabled={analyzing} onClick={cancelRoiEdit}>
            수정 취소
          </Button>
        ) : null}

        {hasCvHistory ? (
          <Button type="button" size="sm" disabled={!canReprocess} onClick={() => void runAnalysis()}>
            {analyzing ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                재분석 중…
              </>
            ) : (
              "재분석"
            )}
          </Button>
        ) : null}
      </div>

      {savedRoi && isEditingRoi && !roiEqual(roi, savedRoi) ? (
        <p className="text-[11px] text-violet-800">
          ROI 변경됨 → 재분석 시 cvRoi · roiVersion +1 · 새 cvRuns 문서 생성 (기존 run 보존).
        </p>
      ) : null}

      {analysisError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {analysisError}
        </p>
      ) : null}

      <p className="text-[10px] text-gray-500">
        Coach Review(I5) · Guardian/Parent · FII/OVR/Avatar 표시는 본 단계 범위 밖입니다.
      </p>
    </div>
  );
}
