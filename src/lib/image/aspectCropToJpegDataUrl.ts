/**
 * 히어로 커버용 — 중앙 기준 aspectRatio 크롭 후 JPEG data URL
 */
export async function aspectCropImageToJpegDataUrl(
  file: File,
  opts?: {
    /** width/height — 기본 16/9 */
    aspect?: number;
    maxWidth?: number;
    quality?: number;
  }
): Promise<string> {
  const aspect = opts?.aspect ?? 16 / 9;
  const maxWidth = opts?.maxWidth ?? 1920;
  const quality = opts?.quality ?? 0.85;

  const bitmap = await createImageBitmap(file);
  try {
    const w = bitmap.width;
    const h = bitmap.height;
    let sw: number;
    let sh: number;
    if (w / h > aspect) {
      sh = h;
      sw = Math.round(h * aspect);
    } else {
      sw = w;
      sh = Math.round(w / aspect);
    }
    const sx = (w - sw) / 2;
    const sy = (h - sh) / 2;
    const outW = Math.min(maxWidth, sw);
    const outH = Math.round(outW / aspect);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D를 사용할 수 없습니다.");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    bitmap.close();
  }
}

/** 뷰포트(프레임) 좌표 기준 16:9 크롭 — 확인 버튼용 */
export async function cropImageElementToAspectJpegDataUrl(
  img: HTMLImageElement,
  opts: {
    frameW: number;
    frameH: number;
    offsetX: number;
    offsetY: number;
    zoom: number;
    maxWidth?: number;
    quality?: number;
  }
): Promise<string> {
  const maxWidth = opts.maxWidth ?? 1920;
  const quality = opts.quality ?? 0.85;
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const coverScale = Math.max(opts.frameW / nw, opts.frameH / nh);
  const scale = coverScale * opts.zoom;
  const dispW = nw * scale;
  const dispH = nh * scale;
  const imgLeft = opts.frameW / 2 + opts.offsetX - dispW / 2;
  const imgTop = opts.frameH / 2 + opts.offsetY - dispH / 2;
  const sx = (0 - imgLeft) / scale;
  const sy = (0 - imgTop) / scale;
  const sw = opts.frameW / scale;
  const sh = opts.frameH / scale;

  const outW = Math.min(maxWidth, Math.round(sw));
  const outH = Math.round(outW * (opts.frameH / opts.frameW));
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D를 사용할 수 없습니다.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    img,
    Math.max(0, sx),
    Math.max(0, sy),
    Math.min(sw, nw),
    Math.min(sh, nh),
    0,
    0,
    outW,
    outH
  );
  return canvas.toDataURL("image/jpeg", quality);
}
