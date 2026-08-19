/**
 * 협회 임원 사진 — 1:1 크롭 후 600×600 JPEG (목표 ≤100KB)
 */
export async function processSquareJpegBlob(
  source: CanvasImageSource,
  opts: {
    /** 원본에서 자를 정사각 영역 (natural/pixel 좌표) */
    sx: number;
    sy: number;
    side: number;
    edge?: number;
    maxBytes?: number;
    initialQuality?: number;
  }
): Promise<Blob> {
  const edge = opts.edge ?? 600;
  const maxBytes = opts.maxBytes ?? 100 * 1024;
  const side = Math.max(1, opts.side);

  const canvas = document.createElement("canvas");
  canvas.width = edge;
  canvas.height = edge;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D를 사용할 수 없습니다.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, opts.sx, opts.sy, side, side, 0, 0, edge, edge);

  let quality = opts.initialQuality ?? 0.82;
  let blob = await canvasToJpegBlob(canvas, quality);
  while (blob.size > maxBytes && quality > 0.45) {
    quality -= 0.07;
    blob = await canvasToJpegBlob(canvas, quality);
  }
  return blob;
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("이미지 변환에 실패했습니다."))),
      "image/jpeg",
      quality
    );
  });
}

/** 파일 중앙 1:1 크롭 → 600×600 ≤100KB */
export async function fileToFederationOrgPhotoBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    return processSquareJpegBlob(bitmap, { sx, sy, side, edge: 600, maxBytes: 100 * 1024 });
  } finally {
    bitmap.close();
  }
}
