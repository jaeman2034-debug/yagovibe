// src/components/home/OpsActionSection.tsx
// 🔥 홈 블록2: 운영 액션 섹션 (미납 / 출석 / 일정 / 할 일 1개)

import { useTeam } from "@/context/TeamContext";
import { useOpsActions } from "@/hooks/useOpsActions";
import ActionCard from "./ActionCard";

export default function OpsActionSection() {
  // ✅ 규칙 1: 모든 Hooks는 최상단, 항상 같은 순서로 호출
  const { myTeam } = useTeam();
  const teamId = myTeam?.id;
  const { actions, loading, error } = useOpsActions(teamId, myTeam?.sportType);

  // ✅ 규칙 2: early return은 JSX 분기로 처리 (Hooks 호출 이후)
  // ✅ 3단 UX 분리: loading → NO_PERMISSION → error → empty → content
  if (!teamId) {
    return (
      <section className="w-full max-w-5xl space-y-3">
        <div className="w-full rounded-2xl bg-gray-50 p-4 text-sm text-gray-500 text-center">
          팀을 생성하면 리포트를 확인할 수 있어요.
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="w-full max-w-5xl space-y-3">
        <div className="w-full rounded-2xl bg-gray-50 p-4 text-sm text-gray-500 text-center">
          불러오는 중...
        </div>
      </section>
    );
  }

  if (error === "NO_PERMISSION") {
    return (
      <section className="w-full max-w-5xl space-y-3">
        <div className="w-full rounded-2xl bg-gray-50 p-4 text-sm text-gray-500 text-center">
          권한이 없어요. 팀 관리자에게 요청하세요.
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="w-full max-w-5xl space-y-3">
        <div className="w-full rounded-2xl bg-red-50 border border-red-200 p-4">
          <div className="flex items-center gap-2 text-red-600">
            <span className="text-lg">⚠️</span>
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-5xl space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            ✅ 운영 액션
          </h2>
          <p className="text-sm text-gray-600">
            오늘 처리하면 좋은 일들을 한 눈에 모았습니다.
          </p>
        </div>
      </div>

      {actions.length === 0 ? (
        <div className="w-full rounded-2xl bg-green-50 p-4 text-sm text-green-800 text-center">
          오늘은 처리할 운영 업무가 없어요 👌
        </div>
      ) : (
        <div className="space-y-2">
          {actions.map((action) => (
            <ActionCard key={action.id} action={action} />
          ))}
        </div>
      )}
    </section>
  );
}


