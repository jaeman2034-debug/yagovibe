/**
 * 원형 1:1 크롭 패널 — 줌·드래그 후 확인 시 600×600 JPEG Blob 반환
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { processSquareJpegBlob } from "@/lib/image/processFederationOrgPhoto";

type Props = {
  file: File;
  onConfirm: (blob: Blob) => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
};

const FRAME = 240;

export function OrganizationPhotoCropPanel({ file, onConfirm, onCancel, busy }: Props) {
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

  /** cover: 짧은 변이 프레임을 채움 */
  const coverScale = Math.max(FRAME / natural.w, FRAME / natural.h);
  const scale = coverScale * zoom;
  const dispW = natural.w * scale;
  const dispH = natural.h * scale;

  const onPointerDown = (e: React.PointerEvent) => {
    if (busy) return;
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
    if (!img || !img.naturalWidth) return;

    const imgLeft = FRAME / 2 + offset.x - dispW / 2;
    const imgTop = FRAME / 2 + offset.y - dispH / 2;
    const sx = (0 - imgLeft) / scale;
    const sy = (0 - imgTop) / scale;
    const side = FRAME / scale;

    const blob = await processSquareJpegBlob(img, {
      sx: Math.max(0, Math.min(natural.w - 1, sx)),
      sy: Math.max(0, Math.min(natural.h - 1, sy)),
      side: Math.max(1, Math.min(side, natural.w, natural.h)),
      edge: 600,
      maxBytes: 100 * 1024,
    });
    await onConfirm(blob);
  };

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-slate-50 p-4">
      <p className="text-center text-sm font-medium text-gray-800">동그랗게 자르기</p>
      <div
        className="relative mx-auto cursor-grab overflow-hidden rounded-full bg-black active:cursor-grabbing touch-none"
        style={{ width: FRAME, height: FRAME }}
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
              left: FRAME / 2 + offset.x - dispW / 2,
              top: FRAME / 2 + offset.y - dispH / 2,
            }}
            onLoad={(e) => {
              const el = e.currentTarget;
              setNatural({ w: el.naturalWidth, h: el.naturalHeight });
            }}
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/80" />
      </div>
      <div className="flex items-center gap-3">
        <span className="w-10 text-xs text-gray-500">축소</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          disabled={busy}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1"
        />
        <span className="w-10 text-right text-xs text-gray-500">확대</span>
      </div>
      <p className="text-center text-xs text-gray-500">드래그로 위치 조정 · 확인 시 600×600 JPEG (약 100KB 이하)</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy}>
          취소
        </Button>
        <Button type="button" size="sm" onClick={() => void confirm()} disabled={busy || !previewUrl}>
          {busy ? "처리 중…" : "확인"}
        </Button>
      </div>
    </div>
  );
}
