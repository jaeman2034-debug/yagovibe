import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

type Props = {
  onOpenGuardianTab: () => void;
  label?: string;
};

/** 보호자 팀 홈 상단 — 자녀 회비는 guardian 탭에서만 조회 */
export default function GuardianTeamHomeFeeCard({
  onOpenGuardianTab,
  label = "연결 자녀 회비",
}: Props) {
  return (
    <div className="mt-3 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-violet-800">{label}</p>
          <p className="mt-1 text-sm text-gray-700">
            연결된 자녀의 회비·납부 상태만 볼 수 있어요. 직접 납부·운영 기능은 제공하지 않습니다.
          </p>
          <Button className="mt-3 h-10 w-full sm:w-auto" type="button" onClick={onOpenGuardianTab}>
            자녀 회비 보기
          </Button>
        </div>
      </div>
    </div>
  );
}
