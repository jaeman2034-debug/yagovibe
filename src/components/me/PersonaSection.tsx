/**
 * 🔥 PersonaSection - Persona별 핵심 영역
 * 
 * Persona에 따라 다른 컴포넌트를 렌더링
 * - P0: 완전 신규
 * - P1: 개인 체육인 (🔥 핵심)
 * - P2: 팀 소속 선수
 * - P3: 팀장
 * - P4: 협회 관리자
 */

import type { Persona } from "@/components/ui/personas/types";
import type { PersonaData } from "@/hooks/useMePersona";
import { PersonaP0NewUser } from "./persona/PersonaP0NewUser";
import { PersonaP1Individual } from "./persona/PersonaP1Individual";
import { PersonaP2TeamMember } from "./persona/PersonaP2TeamMember";
import { PersonaP3TeamCaptain } from "./persona/PersonaP3TeamCaptain";
import { PersonaP4AssociationAdmin } from "./persona/PersonaP4AssociationAdmin";

interface PersonaSectionProps {
  persona: Persona;
  personaData: PersonaData;
  navigate: (path: string) => void;
}

/**
 * 🔥 PersonaSection 컴포넌트
 * 
 * Persona에 따라 적절한 컴포넌트를 렌더링
 * 📌 여기엔 조건문이 더 이상 늘어나면 안 된다
 */
export function PersonaSection({ persona, personaData, navigate }: PersonaSectionProps) {
  const commonProps = {
    personaData,
    navigate,
  };

  switch (persona) {
    case "P0":
      return <PersonaP0NewUser {...commonProps} />;
    case "P1":
      // PR 4: PersonaP1Individual는 props 없이도 작동
      return <PersonaP1Individual />;
    case "P2":
      return <PersonaP2TeamMember {...commonProps} />;
    case "P3":
      return <PersonaP3TeamCaptain {...commonProps} />;
    case "P4":
      return <PersonaP4AssociationAdmin {...commonProps} />;
    default:
      return null;
  }
}
