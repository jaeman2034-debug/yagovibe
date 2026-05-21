/**
 * 🔥 Share Integration - SNS 공유 유틸리티
 * 
 * 스토리/팀/경기 공유, 미리보기(OG), 초대 코드
 */

import type { ShareTarget, ShareMetadata, Region } from "../domain/superapp.types";

/**
 * 공유 링크 생성
 */
export function generateShareLink(
  target: ShareTarget,
  id: string,
  region: Region,
  baseUrl: string = "https://hub.com"
): string {
  return `${baseUrl}/r/${region}/${target}/${id}`;
}

/**
 * 공유 메타데이터 생성
 */
export function generateShareMetadata(
  target: ShareTarget,
  id: string,
  region: Region,
  data: {
    title: string;
    description: string;
    imageUrl?: string;
  }
): ShareMetadata {
  const url = generateShareLink(target, id, region);

  return {
    title: data.title,
    description: data.description,
    imageUrl: data.imageUrl,
    url,
    type: target,
  };
}

/**
 * Web Share API 사용 (모바일)
 */
export async function shareNative(metadata: ShareMetadata): Promise<boolean> {
  if (!navigator.share) {
    return false;
  }

  try {
    await navigator.share({
      title: metadata.title,
      text: metadata.description,
      url: metadata.url,
    });
    return true;
  } catch (error) {
    // 사용자가 취소한 경우
    if ((error as Error).name !== "AbortError") {
      console.warn("[Share] 공유 실패:", error);
    }
    return false;
  }
}

/**
 * 카카오톡 공유
 */
export function shareKakao(metadata: ShareMetadata): void {
  // Kakao SDK 사용 (실제 구현 시)
  // Kakao.Share.sendDefault({
  //   objectType: 'feed',
  //   content: {
  //     title: metadata.title,
  //     description: metadata.description,
  //     imageUrl: metadata.imageUrl,
  //     link: { mobileWebUrl: metadata.url, webUrl: metadata.url }
  //   }
  // });

  // 임시: 링크 복사
  navigator.clipboard.writeText(metadata.url);
  alert("링크가 복사되었습니다");
}

/**
 * 페이스북 공유
 */
export function shareFacebook(metadata: ShareMetadata): void {
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(metadata.url)}`;
  window.open(url, "_blank", "width=600,height=400");
}

/**
 * 트위터 공유
 */
export function shareTwitter(metadata: ShareMetadata): void {
  const text = `${metadata.title} - ${metadata.description}`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(metadata.url)}`;
  window.open(url, "_blank", "width=600,height=400");
}

/**
 * 링크 복사
 */
export async function copyShareLink(metadata: ShareMetadata): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(metadata.url);
    return true;
  } catch (error) {
    console.warn("[Share] 링크 복사 실패:", error);
    return false;
  }
}

/**
 * 공유 함수 (통합)
 */
export async function share(
  target: ShareTarget,
  id: string,
  region: Region,
  metadata: {
    title: string;
    description: string;
    imageUrl?: string;
  },
  method: "native" | "kakao" | "facebook" | "twitter" | "copy" = "native"
): Promise<boolean> {
  const shareMeta = generateShareMetadata(target, id, region, metadata);

  switch (method) {
    case "native":
      return await shareNative(shareMeta);
    case "kakao":
      shareKakao(shareMeta);
      return true;
    case "facebook":
      shareFacebook(shareMeta);
      return true;
    case "twitter":
      shareTwitter(shareMeta);
      return true;
    case "copy":
      return await copyShareLink(shareMeta);
    default:
      return false;
  }
}
