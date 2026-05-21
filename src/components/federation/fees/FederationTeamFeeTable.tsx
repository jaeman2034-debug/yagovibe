import { Button } from "@/components/ui/button";
import type { FederationOperatingTeam, TeamFeeAccount } from "@/types/federationOperating";

const AGE_LABEL: Record<string, string> = {
  "20_30": "20·30대",
  "40": "40대",
  "50": "50대",
  "60": "60대+",
  other: "기타",
};

const STATUS_LABEL: Record<string, string> = {
  unpaid: "미납",
  partial: "부분",
  paid: "완납",
};

const PLAN_LABEL: Record<string, string> = {
  lump_sum: "일시불",
  monthly: "월납",
};

function formatWon(n: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.max(0, Math.floor(n))) + "원";
}

export type TeamFeeRow = {
  team: FederationOperatingTeam;
  account: TeamFeeAccount | null;
};

type Props = {
  rows: TeamFeeRow[];
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string | null) => void;
  onPay: (team: FederationOperatingTeam) => void;
  loading?: boolean;
};

export default function FederationTeamFeeTable({
  rows,
  selectedTeamId,
  onSelectTeam,
  onPay,
  loading,
}: Props) {
  if (loading) {
    return <p className="text-sm text-gray-500 py-8 text-center">불러오는 중…</p>;
  }
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500 py-8 text-center">등록된 팀이 없습니다. 팀을 먼저 추가하세요.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs font-medium text-gray-600">
          <tr>
            <th className="px-3 py-2">팀명</th>
            <th className="px-3 py-2">연령대</th>
            <th className="px-3 py-2">회비 방식</th>
            <th className="px-3 py-2 text-right">납부 / 청구</th>
            <th className="px-3 py-2">상태</th>
            <th className="px-3 py-2">계정</th>
            <th className="px-3 py-2 text-right">액션</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(({ team, account }) => {
            const sel = selectedTeamId === team.id;
            const paid = account?.paidAmount ?? 0;
            const billed = account?.billedAmount ?? 0;
            const status = account?.status ?? "—";
            return (
              <tr
                key={team.id}
                className={`cursor-pointer hover:bg-gray-50/80 ${sel ? "bg-primary-50/50" : ""}`}
                onClick={() => onSelectTeam(sel ? null : team.id)}
              >
                <td className="px-3 py-2 font-medium text-gray-900">{team.name}</td>
                <td className="px-3 py-2 text-gray-600">{AGE_LABEL[team.ageGroup] ?? team.ageGroup}</td>
                <td className="px-3 py-2 text-gray-600">
                  {account ? PLAN_LABEL[account.paymentPlan] ?? account.paymentPlan : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {account ? (
                    <>
                      {formatWon(paid)}
                      <span className="text-gray-400"> / </span>
                      {formatWon(billed)}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2">
                  {account ? (
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        status === "paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : status === "partial"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {STATUS_LABEL[status] ?? status}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-700">계정 없음</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">{team.isActive ? "활성" : "비활성"}</td>
                <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!account}
                    title={!account ? "먼저 연도 회비 계정을 생성하세요." : undefined}
                    onClick={() => onPay(team)}
                  >
                    납부 입력
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
