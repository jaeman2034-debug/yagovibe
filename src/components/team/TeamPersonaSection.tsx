/**
 * 🔥 TeamPersonaSection - 팀 페이지 Persona별 핵심 영역 (STEP 14)
 * 
 * Persona에 따라 다른 컴포넌트를 렌더링
 * - P0: 완전 신규 (팀 개념 노출 ❌)
 * - P1: 팀 없는 개인 체육인 (🔥 핵심)
 * - P2: 팀 소속 선수
 * - P3: 팀장
 * - P4: 협회 관리자
 */

import type { Persona } from "@/pages/me/resolvePersona";
import type { PersonaData } from "@/hooks/useMePersona";
import { TeamPersonaP0NewUser } from "./persona/TeamPersonaP0NewUser";
import { TeamPersonaP1Individual } from "./persona/TeamPersonaP1Individual";
import { TeamPersonaP2TeamMember } from "./persona/TeamPersonaP2TeamMember";
import { TeamPersonaP3TeamCaptain } from "./persona/TeamPersonaP3TeamCaptain";
import { TeamPersonaP4AssociationAdmin } from "./persona/TeamPersonaP4AssociationAdmin";

interface TeamPersonaSectionProps {
  persona: Persona;
  personaData: PersonaData;
  navigate: (path: string) => void;
}

/**
 * 🔥 TeamPersonaSection 컴포넌트
 * 
 * Persona에 따라 적절한 컴포넌트를 렌더링
 * 📌 여기엔 조건문이 더 이상 늘어나면 안 된다
 */
export function TeamPersonaSection({ persona, personaData, navigate }: TeamPersonaSectionProps) {
  const commonProps = {
    personaData,
    navigate,
  };

  switch (persona) {
    case "P0":
      return <TeamPersonaP0NewUser {...commonProps} />;
    case "P1":
      return <TeamPersonaP1Individual {...commonProps} />;
    case "P2":
      return <TeamPersonaP2TeamMember {...commonProps} />;
    case "P3":
      return <TeamPersonaP3TeamCaptain {...commonProps} />;
    case "P4":
      return <TeamPersonaP4AssociationAdmin {...commonProps} />;
    default:
      return null;
  }
}
