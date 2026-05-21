/**
 * 🔥 Persona 판별 로직 (PR 2 최종 고정판)
 * 
 * PR 2 설계 원칙:
 * - 순수 함수 (Pure Function)
 * - Firestore ❌ / React ❌ / useQuery ❌ / try/catch ❌
 * - 계산만 한다
 * - "신규 / 개인 체육인 / 팀 / 관리자" 판단 기준 영구 봉인
 * 
 * 우선순위: P4 > P3 > P2 > P1 > P0 > ANON
 */

export type Persona =
  | "ANON"
  | "P0" // 프로필 미완성
  | "P1" // 개인 체육인
  | "P2" // 팀 소속 선수
  | "P3" // 팀장
  | "P4"; // 협회 관리자

export type PersonaRole = "ADMIN" | "USER";

export interface ResolvePersonaInput {
  isLoggedIn: boolean;
  hasProfile: boolean;
  teamCount: number;
  applicationCount: number;
  role: PersonaRole;
}

/**
 * 🔥 Persona 판별 함수 (PR 2 최종 고정판)
 * 
 * 🔒 이 파일의 규칙:
 * - ❌ Firestore
 * - ❌ React
 * - ❌ useQuery
 * - ❌ try/catch
 * - ✅ 순수 함수 (Pure Function)
 * 
 * 입력값은 모두 정규화된 상태:
 * - isLoggedIn: boolean
 * - hasProfile: boolean
 * - teamCount: number (0 이상)
 * - applicationCount: number (0 이상)
 * - role: "ADMIN" | "USER"
 * 
 * @param input - 정규화된 Persona 판별 데이터
 * @returns Persona 타입
 */
export function resolvePersona({
  isLoggedIn,
  hasProfile,
  teamCount,
  applicationCount,
  role,
}: ResolvePersonaInput): Persona {
  if (!isLoggedIn) return "ANON";

  if (!hasProfile) return "P0";

  if (role === "ADMIN") return "P4";

  if (teamCount === 0 && applicationCount === 0) return "P1";

  if (teamCount > 0 && applicationCount === 0) return "P2";

  if (teamCount > 0 && applicationCount > 0) return "P3";

  // 안전 fallback
  return "P1";
}
