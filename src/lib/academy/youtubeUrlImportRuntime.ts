/** Sprint 10E — YouTube URL import (Beta). Main path = Academy MP4 Upload (RC). */

export const YOUTUBE_URL_IMPORT_BETA_TITLE = "유튜브 링크 분석 (Beta)";

export const YOUTUBE_URL_IMPORT_BETA_HINT =
  "일부 YouTube 영상은 정책상 가져오기에 실패할 수 있습니다. 실패 시 MP4 업로드를 사용해 주세요.";

export const YOUTUBE_URL_IMPORT_FAIL_PARENT_MSG =
  "유튜브 영상을 자동으로 가져오지 못했습니다.\nMP4 업로드로 계속 진행해 주세요.";

export function isYoutubeUrlImportBetaEnabled(): boolean {
  return import.meta.env.VITE_YOUTUBE_URL_IMPORT_BETA !== "false";
}
