/**
 * 팀 히어로 커버 — 16:9 크롭 패널 (모바일·데스크톱 공통)
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cropImageElementToAspectJpegDataUrl } from "@/lib/image/aspectCropToJpegDataUrl";

type Props = {
  file: File;
  busy?: boolean;
  onConfirm: (dataUrl: string) => void | Promise<void>;
  onCancel: () => void;
};

function useFrameSize() {
  const [frameW, setFrameW] = useState(320);
  useEffect(() => {
    const update = () => {
      const vw = typeof window !== "undefined" ? window.innerWidth : 360;
      // 좌우 패딩·모달 여백 반영
      setFrameW(Math.max(240, Math.min(360, Math.floor(vw - 48))));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const frameH = useMemo(() => Math.round((frameW * 9) / 16), [frameW]);
  return { frameW, frameH };
}

export function TeamCoverCropPanel({ file, busy, onConfirm, onCancel }: Props) {
  const { frameW, frameH } = useFrameSize();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState({ w: 1, h: 1 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const coverScale = Math.max(frameW / natural.w, frameH / natural.h);
  const scale = coverScale * zoom;
  const dispW = natural.w * scale;
  const dispH = natural.h * scale;

  const onPointerDown = (e: React.PointerEvent) => {
    if (busy) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    dragOrigin.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragOrigin.current) return;
    setOffset({
      x: dragOrigin.current.ox + (e.clientX - dragOrigin.current.x),
      y: dragOrigin.current.oy + (e.clientY - dragOrigin.current.y),
    });
  };
  const onPointerUp = () => {
    setDragging(false);
    dragOrigin.current = null;
  };

  const confirm = async () => {
    const img = imgRef.current;
    if (!img?.naturalWidth) return;
    const dataUrl = await cropImageElementToAspectJpegDataUrl(img, {
      frameW,
      frameH,
      offsetX: offset.x,
      offsetY: offset.y,
      zoom,
      maxWidth: 1920,
      quality: 0.85,
    });
    await onConfirm(dataUrl);
  };

  return (
    <div className="space-y-3 p-3 sm:p-4">
      <p className="text-center text-sm font-semibold text-gray-900">16:9로 자르기</p>
      <p className="text-center text-[11px] text-gray-500 sm:text-xs">손가락으로 위치를 옮기고, 아래에서 확대·축소하세요</p>
      <div
        className="relative mx-auto cursor-grab overflow-hidden rounded-lg bg-black touch-none active:cursor-grabbing"
        style={{ width: frameW, height: frameH }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {previewUrl ? (
          <img
            ref={imgRef}
            src={previewUrl}
            alt=""
            draggable={false}
            className="absolute max-w-none select-none"
            style={{
              width: dispW,
              height: dispH,
              left: frameW / 2 + offset.x - dispW / 2,
              top: frameH / 2 + offset.y - dispH / 2,
            }}
            onLoad={(e) => {
              const el = e.currentTarget;
              setNatural({ w: el.naturalWidth, h: el.naturalHeight });
            }}
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 ring-2 ring-white/70" />
      </div>
      <div className="flex items-center gap-3 px-1">
        <span className="w-8 shrink-0 text-xs text-gray-500">축소</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          disabled={busy}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-8 flex-1 accent-indigo-600"
        />
        <span className="w-8 shrink-0 text-right text-xs text-gray-500">확대</span>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" className="min-h-10 px-4" onClick={onCancel} disabled={busy}>
          취소
        </Button>
        <Button
          type="button"
          size="sm"
          className="min-h-10 px-4"
          onClick={() => void confirm()}
          disabled={busy || !previewUrl}
        >
          {busy ? "업로드 중…" : "확인"}
        </Button>
      </div>
    </div>
  );
}
