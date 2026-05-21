/**
 * 🔥 Persona 타입 정의 (STEP 15B: 단일 진실 소스)
 * 
 * 모든 페이지에서 동일한 Persona 타입 사용
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
