import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_TEAM_FEE_POLICY, fetchTeamFeePolicy, saveTeamFeePolicy } from "@/lib/team/teamFeePolicy";
import type { TeamFeePolicy } from "@/types/teamFeePolicy";

type Props = {
  teamId: string;
  /** 팀 설정 편집 권한 없으면 true */
  disabled: boolean;
};

export default function TeamFeePolicySettingsCard({ teamId, disabled }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<TeamFeePolicy>(DEFAULT_TEAM_FEE_POLICY);
  const [useEarlyBird, setUseEarlyBird] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTeamFeePolicy(teamId)
      .then((p) => {
        if (!cancelled) {
          setPolicy(p);
          setUseEarlyBird(Boolean(p.annual.earlyBirdPeriod));
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("회비 정책을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const handleSave = async () => {
    if (disabled || saving) return;
    const months = Math.min(24, Math.max(1, Math.floor(policy.annual.months)));
    const discountMonths = Math.min(months - 1, Math.max(0, Math.floor(policy.annual.discountMonths)));
    const earlySrc = policy.annual.earlyBirdPeriod ?? { startMonth: 1, endMonth: 3 };
    const next: TeamFeePolicy = {
      monthlyAmount: Math.max(0, Math.floor(Number(policy.monthlyAmount)) || 0),
      allowExempt: policy.allowExempt,
      annual: {
        enabled: policy.annual.enabled,
        months,
        discountMonths,
        earlyBirdPeriod:
          useEarlyBird &&
          earlySrc.startMonth >= 1 &&
          earlySrc.startMonth <= 12 &&
          earlySrc.endMonth >= 1 &&
          earlySrc.endMonth <= 12
            ? { startMonth: earlySrc.startMonth, endMonth: earlySrc.endMonth }
            : undefined,
      },
    };
    setSaving(true);
    try {
      await saveTeamFeePolicy(teamId, next);
      setPolicy(next);
      toast.success("회비 정책을 저장했습니다.", {
        description:
          "다음 회비 생성·연납 처리부터 적용됩니다. 현재 열려 있는 회차 금액과 기존 납부 내역은 바뀌지 않습니다.",
      });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const annual = policy.annual;
  const early = annual.earlyBirdPeriod ?? { startMonth: 1, endMonth: 3 };

  return (
    <div
      id="fee-policy-settings"
      className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm scroll-mt-4"
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">회비 정책</h3>
        <p className="mt-1 text-sm text-gray-600">
          기본 월 회비·연납·조기납부 규칙을 정합니다. 변경 후에는{" "}
          <span className="font-medium text-gray-800">새로 만드는 회비 회차와 이후 연납 처리</span>에 반영됩니다.
        </p>
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700">
          <span className="font-semibold text-slate-900">정책 변경이 미치는 범위:</span> 이미 등록된 회차의{" "}
          <code className="rounded bg-white px-1 py-0.5 text-[11px]">amount</code>·납부 기록은 그대로입니다.
          예를 들어 월 회비를 2만 원→2만 5천 원으로 바꿔도, 과거 회차 문서는 수정되지 않고{" "}
          <span className="font-medium">다음 회비 생성·연납 시점부터</span> 새 규칙이 적용됩니다.
          <p className="mt-2 border-t border-slate-200 pt-2 font-semibold text-slate-900">
            이미 생성된 회차와 기존 납부 내역은 변경되지 않습니다.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">불러오는 중…</p>
      ) : (
        <div className="grid gap-4">
          <label className="block">
            <div className="text-sm font-medium text-gray-800">기본 월 회비(원)</div>
            <p className="mt-0.5 text-xs text-gray-500">
              새 회비 만들기 시 금액 칸이 비어 있으면 이 값을 씁니다. 0이면 회차별로만 금액을 정합니다(정책 없이 생성 시
              오류가 날 수 있어요).
            </p>
            <input
              type="number"
              min={0}
              step={1000}
              value={policy.monthlyAmount === 0 ? "" : policy.monthlyAmount}
              onChange={(e) => {
                const raw = e.target.value.trim();
                setPolicy((p) => ({
                  ...p,
                  monthlyAmount: raw === "" ? 0 : Math.max(0, Math.floor(Number(raw)) || 0),
                }));
              }}
              disabled={disabled}
              placeholder="예: 20000"
              className="mt-1 w-full max-w-xs rounded-md border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50"
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2">
            <div>
              <div className="text-sm font-medium text-gray-900">연납 허용</div>
              <div className="text-xs text-gray-600">끄면 연납 분해(총무 연납 처리)를 쓸 수 없습니다.</div>
            </div>
            <input
              type="checkbox"
              checked={annual.enabled}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  annual: { ...p.annual, enabled: e.target.checked },
                }))
              }
              disabled={disabled}
            />
          </label>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="block">
              <div className="text-sm font-medium text-gray-800">연납 개월 수</div>
              <input
                type="number"
                min={1}
                max={24}
                value={annual.months}
                onChange={(e) => {
                  const months = Math.min(24, Math.max(1, Math.floor(Number(e.target.value)) || 1));
                  setPolicy((p) => ({
                    ...p,
                    annual: {
                      ...p.annual,
                      months,
                      discountMonths: Math.min(months - 1, p.annual.discountMonths),
                    },
                  }));
                }}
                disabled={disabled || !annual.enabled}
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </label>
            <label className="block md:col-span-2">
              <div className="text-sm font-medium text-gray-800">할인 개월 상한</div>
              <p className="mt-0.5 text-xs text-gray-500">연납 시 &quot;몇 개월 치&quot;를 깎아 줄지(0~개월수−1).</p>
              <input
                type="number"
                min={0}
                max={Math.max(0, annual.months - 1)}
                value={annual.discountMonths}
                onChange={(e) => {
                  const maxD = annual.months - 1;
                  const v = Math.min(maxD, Math.max(0, Math.floor(Number(e.target.value)) || 0));
                  setPolicy((p) => ({
                    ...p,
                    annual: { ...p.annual, discountMonths: v },
                  }));
                }}
                disabled={disabled || !annual.enabled}
                className="mt-1 w-full max-w-xs rounded-md border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </label>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-md border border-amber-100 bg-amber-50/40 px-3 py-2">
            <div>
              <div className="text-sm font-medium text-gray-900">조기납부 할인 기간(월)</div>
              <div className="text-xs text-gray-600">
                켜면 이 달(서울) 안에서만 위 할인 개월을 적용합니다. 끄면 연중 언제든 할인 상한까지만 적용됩니다.
              </div>
            </div>
            <input
              type="checkbox"
              checked={useEarlyBird}
              onChange={(e) => {
                const on = e.target.checked;
                setUseEarlyBird(on);
                if (on) {
                  setPolicy((p) => ({
                    ...p,
                    annual: {
                      ...p.annual,
                      earlyBirdPeriod: p.annual.earlyBirdPeriod ?? { startMonth: 1, endMonth: 3 },
                    },
                  }));
                }
              }}
              disabled={disabled || !annual.enabled}
            />
          </label>

          {useEarlyBird && annual.enabled ? (
            <div className="grid grid-cols-2 gap-3 md:max-w-md">
              <label className="block">
                <div className="text-sm font-medium text-gray-800">시작 월 (1–12)</div>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={early.startMonth}
                  onChange={(e) => {
                    const startMonth = Math.min(12, Math.max(1, Math.floor(Number(e.target.value)) || 1));
                    setPolicy((p) => ({
                      ...p,
                      annual: {
                        ...p.annual,
                        earlyBirdPeriod: {
                          startMonth,
                          endMonth: p.annual.earlyBirdPeriod?.endMonth ?? 3,
                        },
                      },
                    }));
                  }}
                  disabled={disabled}
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50"
                />
              </label>
              <label className="block">
                <div className="text-sm font-medium text-gray-800">종료 월 (1–12)</div>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={early.endMonth}
                  onChange={(e) => {
                    const endMonth = Math.min(12, Math.max(1, Math.floor(Number(e.target.value)) || 1));
                    setPolicy((p) => ({
                      ...p,
                      annual: {
                        ...p.annual,
                        earlyBirdPeriod: {
                          startMonth: p.annual.earlyBirdPeriod?.startMonth ?? 1,
                          endMonth,
                        },
                      },
                    }));
                  }}
                  disabled={disabled}
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50"
                />
              </label>
            </div>
          ) : null}

          <label className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2">
            <div>
              <div className="text-sm font-medium text-gray-900">회비 면제 허용</div>
              <div className="text-xs text-gray-600">멤버를 면제로 둘 수 있게 합니다(운영 정책).</div>
            </div>
            <input
              type="checkbox"
              checked={policy.allowExempt}
              onChange={(e) => setPolicy((p) => ({ ...p, allowExempt: e.target.checked }))}
              disabled={disabled}
            />
          </label>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={disabled || saving}
              className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-50"
            >
              {saving ? "저장 중…" : "회비 정책 저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
