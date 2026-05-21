/**
 * 🔥 이미지 압축 및 WebP 변환 유틸리티 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 이미지 압축 (10MB → 1MB 목표)
 * - WebP 변환 (지원 브라우저)
 * - 썸네일 생성
 * - 품질 유지 최적화
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const TARGET_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const THUMBNAIL_SIZE = 400;

/**
 * 이미지 압축 옵션
 */
interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 ~ 1.0
  format?: "webp" | "jpeg" | "png";
  targetSize?: number; // 목표 파일 크기 (bytes)
}

/**
 * 이미지를 Canvas로 로드
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Canvas에서 Blob 생성
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Blob 생성 실패"));
        }
      },
      format === "webp" ? "image/webp" : `image/${format}`,
      quality
    );
  });
}

/**
 * 이미지 크기 조정
 */
function resizeImage(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let { width, height } = img;

  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  return { width, height };
}

/**
 * 이미지 압축 (주요 함수)
 * 
 * @param file - 원본 이미지 파일
 * @param options - 압축 옵션
 * @returns 압축된 Blob
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<Blob> {
  // 🔥 파일 크기 체크
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`파일 크기가 너무 큽니다. (최대 ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
  }

  const {
    maxWidth = MAX_WIDTH,
    maxHeight = MAX_HEIGHT,
    quality: initialQuality = 0.8,
    format = "webp",
    targetSize = TARGET_FILE_SIZE,
  } = options;

  // 🔥 이미지 로드
  const img = await loadImage(file);

  // 🔥 크기 조정
  const { width, height } = resizeImage(img, maxWidth, maxHeight);

  // 🔥 Canvas 생성
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas 컨텍스트를 가져올 수 없습니다.");
  }

  // 🔥 이미지 그리기
  ctx.drawImage(img, 0, 0, width, height);

  // 🔥 WebP 지원 여부 확인
  const supportsWebP =
    format === "webp" &&
    canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;

  const finalFormat = supportsWebP ? "webp" : "jpeg";
  const finalQuality = supportsWebP ? initialQuality : Math.min(initialQuality, 0.9);

  // 🔥 초기 압축
  let blob = await canvasToBlob(canvas, finalFormat, finalQuality);

  // 🔥 목표 크기 달성까지 품질 조정 (이진 탐색)
  if (blob.size > targetSize) {
    let minQuality = 0.1;
    let maxQuality = finalQuality;
    let bestBlob = blob;

    for (let i = 0; i < 10; i++) {
      const testQuality = (minQuality + maxQuality) / 2;
      const testBlob = await canvasToBlob(canvas, finalFormat, testQuality);

      if (testBlob.size <= targetSize) {
        bestBlob = testBlob;
        maxQuality = testQuality;
      } else {
        minQuality = testQuality;
      }

      // 🔥 충분히 가까우면 종료
      if (Math.abs(testBlob.size - targetSize) < targetSize * 0.1) {
        break;
      }
    }

    blob = bestBlob;
  }

  // 🔥 메모리 정리
  URL.revokeObjectURL(img.src);

  return blob;
}

/**
 * 썸네일 생성
 * 
 * @param file - 원본 이미지 파일
 * @returns 썸네일 Blob
 */
export async function generateThumbnail(file: File): Promise<Blob> {
  const img = await loadImage(file);
  const { width, height } = resizeImage(img, THUMBNAIL_SIZE, THUMBNAIL_SIZE);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas 컨텍스트를 가져올 수 없습니다.");
  }

  ctx.drawImage(img, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, "jpeg", 0.7);

  URL.revokeObjectURL(img.src);

  return blob;
}

/**
 * 이미지 메타데이터 추출
 */
export async function getImageMetadata(file: File): Promise<{
  width: number;
  height: number;
  size: number;
  type: string;
  aspectRatio: number;
}> {
  const img = await loadImage(file);

  const metadata = {
    width: img.naturalWidth,
    height: img.naturalHeight,
    size: file.size,
    type: file.type,
    aspectRatio: img.naturalWidth / img.naturalHeight,
  };

  URL.revokeObjectURL(img.src);

  return metadata;
}
