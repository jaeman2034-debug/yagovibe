/**
 * 🔥 대회 페이지 PersonaSection (STEP 15A)
 * 
 * Persona별 핵심 영역 분기
 * - P1: 개인 체육인 (정보 소비자)
 * - P2: 팀 소속 선수 (미신청)
 * - P3: 팀장 (행동 가능)
 * - P4: 관리자 (운영)
 */

import type { Persona } from "@/components/ui/personas/types";
import type { Tournament } from "@/types/tournament";
import { PersonaP1Tournament } from "./persona/PersonaP1Tournament";
import { PersonaP2Tournament } from "./persona/PersonaP2Tournament";
import { PersonaP3Tournament } from "./persona/PersonaP3Tournament";
import { PersonaP4Tournament } from "./persona/PersonaP4Tournament";

interface PersonaSectionProps {
  persona: Persona;
  tournament: Tournament | null;
  associationId: string | undefined;
  tournamentId: string | undefined;
  hasTeams: boolean;
  isTeamCaptain: boolean;
  hasApplication: boolean;
  navigate: (path: string) => void;
}

export function TournamentPersonaSection({
  persona,
  tournament,
  associationId,
  tournamentId,
  hasTeams,
  isTeamCaptain,
  hasApplication,
  navigate,
}: PersonaSectionProps) {
  const commonProps = {
    tournament,
    associationId,
    tournamentId,
    navigate,
  };

  switch (persona) {
    case "P1":
      return <PersonaP1Tournament {...commonProps} />;
    case "P2":
      return (
        <PersonaP2Tournament
          {...commonProps}
          hasTeams={hasTeams}
          hasApplication={hasApplication}
        />
      );
    case "P3":
      return (
        <PersonaP3Tournament
          {...commonProps}
          isTeamCaptain={isTeamCaptain}
          hasApplication={hasApplication}
        />
      );
    case "P4":
      return <PersonaP4Tournament {...commonProps} />;
    default:
      return <PersonaP1Tournament {...commonProps} />;
  }
}
