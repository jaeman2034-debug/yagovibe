/**
 * 🔥 TeamPersonaP0NewUser - 완전 신규 유저 (STEP 14)
 * 
 * 가입 직후, 프로필 미완성 상태
 * 팀 개념 노출 ❌
 */

import type { PersonaData } from "@/hooks/useMePersona";

interface TeamPersonaP0NewUserProps {
  personaData: PersonaData;
  navigate: (path: string) => void;
}

/**
 * 🔥 완전 신규 유저 UI
 * 
 * STEP 14 설계:
 * - 팀 개념 노출 ❌
 * - 프로필 완성 유도
 */
export function TeamPersonaP0NewUser({ personaData, navigate }: TeamPersonaP0NewUserProps) {
  return (
    <section className="px-4 mt-6">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="text-center">
          <div className="text-4xl mb-3">👋</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            환영합니다!
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            먼저 프로필을 완성해주세요
          </p>
          <button
            onClick={() => navigate("/me/settings")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            프로필 설정하기
          </button>
        </div>
      </div>
    </section>
  );
}
