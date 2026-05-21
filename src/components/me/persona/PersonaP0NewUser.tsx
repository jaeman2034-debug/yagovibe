/**
 * 🔥 PersonaP0NewUser - 완전 신규 유저
 * 
 * 가입 직후, 프로필 미완성 상태
 */

import { useNavigate } from "react-router-dom";
import { User, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PersonaData } from "@/hooks/useMePersona";

interface PersonaP0NewUserProps {
  personaData: PersonaData;
  navigate: (path: string) => void;
}

export function PersonaP0NewUser({ personaData, navigate }: PersonaP0NewUserProps) {
  return (
    <section className="px-4 mt-6">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        {/* 환영 메시지 */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">👋</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            환영합니다!
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            당신은 어떤 체육인인가요?
          </p>
        </div>

        {/* Persona 선택 카드 */}
        <div className="space-y-3">
          {/* 개인 체육인 */}
          <button
            onClick={() => {
              // TODO: 프로필에 "개인 체육인" 선택 저장
              navigate("/me");
            }}
            className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">개인 체육인</h3>
                <p className="text-xs text-gray-600">팀 없이 혼자 활동하고 싶어요</p>
              </div>
            </div>
          </button>

          {/* 팀 참여 */}
          <button
            onClick={() => navigate("/profile/setup?intent=join-team")}
            className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-green-300 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">팀 참여</h3>
                <p className="text-xs text-gray-600">팀에 참여하려면 기본 프로필이 필요해요</p>
              </div>
            </div>
          </button>

          {/* 관리자 */}
          <button
            onClick={() => navigate("/admin/apply")}
            className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-orange-300 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">관리자</h3>
                <p className="text-xs text-gray-600">협회 관리자 신청</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}
