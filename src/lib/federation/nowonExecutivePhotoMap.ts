/**
 * 노원구축구협회 임원 정적 사진 맵
 * 파일: public/images/executives/ (한글 직책_이름 · 실제 디스크 파일명 그대로)
 *
 * 우선순위 (resolveExecutivePhotoSources):
 * 1) Firestore remote photo (CMS Storage URL)
 * 2) 이 PHOTO_MAP (이름 → 실제 파일)
 * 3) Avatar (카드 onError / 소스 없음)
 */

export const EXECUTIVE_PHOTOS_BASE = "/images/executives";

/** 공백·한글 파일명을 URL-safe 경로로 */
export function executivePhotoUrl(fileName: string): string {
  const name = String(fileName || "").trim();
  if (!name) return "";
  // encodeURI: 공백→%20, 한글·괄호는 유지 (브라우저 정적 서빙 호환)
  return `${EXECUTIVE_PHOTOS_BASE}/${encodeURI(name)}`;
}

/**
 * 이름 → 실제 파일명 (public/images/executives 기준, README·zip 제외)
 * ※ 디스크上的 이중 확장자(.jpg.jpg / .jpg.png)를 그대로 사용한다.
 */
export const NOWON_EXECUTIVE_PHOTO_MAP: Record<string, string> = {
  박병구: executivePhotoUrl("노원구 축구협회장 박병구.jpg"),
  고영호: executivePhotoUrl("수석부회장_고영호.jpg.png"),
  전순규: executivePhotoUrl("사무국장(전순규).jpg.png"),
  문주연: executivePhotoUrl("사무부장(문주연).jpg.jpg"),
  허재남: executivePhotoUrl("경기부회장_허재남.jpg.jpg"),
  이현기: executivePhotoUrl("경기위원장_이현기.jpg.jpg"),
  박종훈: executivePhotoUrl("기획부회장_박종훈.jpg.png"),
  황승환: executivePhotoUrl("기획위원장_황승환.jpg.jpg"),
  이석범: executivePhotoUrl("운영부회장_이석범.jpg.png"),
  강병훈: executivePhotoUrl("운영위원장_강병훈.jpg.jpg"),
  신양희: executivePhotoUrl("조직부회장_신양희.jpg.png"),
  신수호: executivePhotoUrl("조직위원장_신수호.jpg.jpg"),
  이효근: executivePhotoUrl("홍보부회장_이효근.jpg.jpg"),
  윤성렬: executivePhotoUrl("홍보위원장_윤성렬.jpg.jpg"),
  임성혁: executivePhotoUrl("의전부회장_임성혁.jpg.jpg"),
  조민우: executivePhotoUrl("의전위원장_조민우.jpg.png"),
  문정배: executivePhotoUrl("유소년부회장_문정배.jpg.jpg"),
  김영민: executivePhotoUrl("유소년위원장_김영민.jpg.jpg"),
  박남백: executivePhotoUrl("심판부회장_박남백.jpg.jpg"),
  김민주: executivePhotoUrl("심판위원장_김민주.jpg.png"),
  김정기: executivePhotoUrl("대외협력부회장_김정기.jpg.png"),
  김영국: executivePhotoUrl("섭외부회장_김영국.jpg.png"),
  박종수: executivePhotoUrl("총무부회장_박종수.jpg.jpg"),
  이현상: executivePhotoUrl("상비군부회장_이현상.jpg.jpg"),
};

/**
 * 지시문·현장 표기 흔들림 → 카탈로그/맵 키로 정규화
 */
const NAME_ALIASES: Record<string, string> = {
  박병규: "박병구",
  황송환: "황승환",
  이호근: "이효근",
  문장배: "문정배",
};

/** name → 정적 photo URL (없으면 undefined) */
export function resolveNowonExecutivePhotoByName(name: string | null | undefined): string | undefined {
  const n = String(name || "").trim();
  if (!n) return undefined;
  const mapped = NOWON_EXECUTIVE_PHOTO_MAP[n];
  if (mapped) return mapped;
  const aliasKey = NAME_ALIASES[n];
  if (aliasKey && NOWON_EXECUTIVE_PHOTO_MAP[aliasKey]) {
    return NOWON_EXECUTIVE_PHOTO_MAP[aliasKey];
  }
  return undefined;
}
