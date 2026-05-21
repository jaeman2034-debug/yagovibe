/**
 * 🔥 팀 탐색 페이지 IdentityHeader (STEP: 팀원 가입 플로우)
 * 
 * 공용 IdentityHeader를 팀 탐색 컨텍스트에 맞게 래핑
 */

import { IdentityHeader } from "@/components/ui/layout/IdentityHeader";
import { Users } from "lucide-react";

export function TeamSearchIdentityHeader() {
  return (
    <IdentityHeader
      title="팀 찾기"
      subtitle="원하는 팀에 참여할 수 있어요"
      meta={
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span>활동 중인 팀을 검색하고 참여 요청을 보낼 수 있습니다</span>
        </div>
      }
    />
  );
}
