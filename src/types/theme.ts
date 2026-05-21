/**
 * 협회별 브랜딩 Theme Token
 * 
 * Sprint 7: 권한·역할·브랜딩
 * 
 * 원칙:
 * - 콘텐츠(기록)는 절대 변형 없음
 * - 껍데기만 다름
 */

export interface AssociationTheme {
  associationId: string;
  primaryColor: string; // 예: "#1e40af" (blue-800)
  secondaryColor: string; // 예: "#3b82f6" (blue-500)
  logoUrl?: string;
  name: string;
}

/**
 * 기본 테마 (fallback)
 */
export const DEFAULT_THEME: AssociationTheme = {
  associationId: "default",
  primaryColor: "#1e40af",
  secondaryColor: "#3b82f6",
  name: "기본",
};

