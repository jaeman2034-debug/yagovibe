/**
 * 🔥 TeamPersonaP4AssociationAdmin - 협회 관리자 (STEP 14)
 * 
 * 협회 관리자 UI:
 * - 팀 목록
 * - 승인/관리 도구
 */

import { Users, Shield } from "lucide-react";
import { MeCard } from "@/components/me/MeCard";
import type { PersonaData } from "@/hooks/useMePersona";

interface TeamPersonaP4AssociationAdminProps {
  personaData: PersonaData;
  navigate: (path: string) => void;
}

/**
 * 🔥 협회 관리자 UI
 * 
 * STEP 14 설계:
 * - 팀 목록
 * - 승인/관리 도구
 */
export function TeamPersonaP4AssociationAdmin({ personaData, navigate }: TeamPersonaP4AssociationAdminProps) {
  return (
    <section className="px-4 mt-6 space-y-6">
      {/* 팀 목록 */}
      <MeCard
        variant="info"
        icon={<Users className="w-5 h-5" />}
        title="팀 목록"
      >
        <p className="text-sm text-gray-600">
          곧 팀 목록이 표시됩니다
        </p>
      </MeCard>

      {/* 승인/관리 도구 */}
      <MeCard
        variant="info"
        icon={<Shield className="w-5 h-5" />}
        title="승인/관리 도구"
      >
        <p className="text-sm text-gray-600">
          곧 승인/관리 도구가 표시됩니다
        </p>
      </MeCard>
    </section>
  );
}
