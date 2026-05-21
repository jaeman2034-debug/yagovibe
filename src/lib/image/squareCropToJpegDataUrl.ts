/**
 * 운영진·프로필 원형 썸네일용 — 업로드 전 1:1 중앙 크롭 후 JPEG data URL.
 * 브라우저 Canvas API만 사용 (추가 패키지 없음).
 */
export async function squareCropImageToJpegDataUrl(
  file: File,
  opts?: { maxEdge?: number; quality?: number }
): Promise<string> {
  const maxEdge = opts?.maxEdge ?? 1024;
  const quality = opts?.quality ?? 0.88;

  const bitmap = await createImageBitmap(file);
  try {
    const w = bitmap.width;
    const h = bitmap.height;
    const side = Math.min(w, h);
    const sx = (w - side) / 2;
    const sy = (h - side) / 2;
    const out = Math.min(maxEdge, side);
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D를 사용할 수 없습니다.");
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, out, out);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    bitmap.close();
  }
}
