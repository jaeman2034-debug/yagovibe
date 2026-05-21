import type { ExperimentVariantBucket } from "../types/teamNotificationExperiment";

type ExperimentUiMode = "re_register" | "fee_reminder";

type RolloutMeta = {
  rollout?: string;
  winner?: "A" | "B";
  decidedAt?: unknown;
};

type Props = {
  title: string;
  description: string;
  mode: ExperimentUiMode;
  loading: boolean;
  permissionDenied: boolean;
  /** 문서 없음(아직 집계 0건) */
  empty: boolean;
  variantA: ExperimentVariantBucket;
  variantB: ExperimentVariantBucket;
  rolloutMeta?: RolloutMeta | null;
};

function pct(n: number, d: number, digits = 1): string {
  if (!d || d <= 0) return "—";
  return `${((n / d) * 100).toFixed(digits)}%`;
}

function VariantBlock({
  label,
  b,
  mode,
}: {
  label: string;
  b: ExperimentVariantBucket;
  mode: ExperimentUiMode;
}) {
  const openRate = pct(b.opened, b.sent);
  const clickRate = pct(b.clicked, b.opened);
  const convPrimary =
    mode === "re_register" ? pct(b.reRegisterConverted, b.clicked) : pct(b.converted, b.clicked);
  const convLabel = mode === "re_register" ? "재등록→자동결제 전환" : "즉시 결제 전환";

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
      <p className="text-sm font-semibold text-gray-900">{label}</p>
      <dl className="mt-3 space-y-1.5 text-sm text-gray-700">
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500">발송</dt>
          <dd className="font-medium tabular-nums">{b.sent}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500">오픈</dt>
          <dd className="font-medium tabular-nums">{b.opened}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500">클릭</dt>
          <dd className="font-medium tabular-nums">{b.clicked}</dd>
        </div>
        {mode === "re_register" ? (
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500">재등록 후 자동결제 성공</dt>
            <dd className="font-medium tabular-nums">{b.reRegisterConverted}</dd>
          </div>
        ) : (
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500">즉시 결제 성공</dt>
            <dd className="font-medium tabular-nums">{b.converted}</dd>
          </div>
        )}
      </dl>
      <div className="mt-3 border-t border-gray-200 pt-3 text-xs text-gray-600 space-y-1">
        <p>오픈율 {openRate}</p>
        <p>클릭율(오픈 대비) {clickRate}</p>
        <p className="font-semibold text-gray-900">
          {convLabel} {convPrimary}
        </p>
      </div>
    </div>
  );
}

function primaryRate(b: ExperimentVariantBucket, mode: ExperimentUiMode): number {
  if (mode === "re_register") {
    return b.clicked > 0 ? b.reRegisterConverted / b.clicked : -1;
  }
  return b.clicked > 0 ? b.converted / b.clicked : -1;
}

function formatDecidedAt(v: unknown): string | null {
  if (!v || typeof v !== "object") return null;
  const toDate = (v as { toDate?: () => Date }).toDate;
  if (typeof toDate !== "function") return null;
  try {
    return toDate.call(v).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  } catch {
    return null;
  }
}

function winnerHint(a: ExperimentVariantBucket, b: ExperimentVariantBucket, mode: ExperimentUiMode): string {
  const ra = primaryRate(a, mode);
  const rb = primaryRate(b, mode);
  if (ra < 0 && rb < 0) return "클릭 데이터가 쌓이면 A/B 비교가 표시됩니다.";
  if (ra < 0) return "A안: 클릭이 없어 전환율을 계산할 수 없습니다.";
  if (rb < 0) return "B안: 클릭이 없어 전환율을 계산할 수 없습니다.";
  const eps = 0.0001;
  if (Math.abs(ra - rb) < eps) return "두 안의 전환율이 비슷합니다. 표본을 더 모아 보세요.";
  if (ra > rb) return "현재 A안 전환율이 더 높습니다.";
  return "현재 B안 전환율이 더 높습니다.";
}

function rolloutFooter(meta: RolloutMeta | null | undefined, a: ExperimentVariantBucket, b: ExperimentVariantBucket, mode: ExperimentUiMode): string {
  if (meta?.rollout === "winner_only" && meta.winner) {
    const when = formatDecidedAt(meta.decidedAt);
    return `자동 롤아웃: 신규 알림은 ${meta.winner}안만 발송됩니다.${
      when ? ` 확정 시각(서울) ${when} 기준.` : ""
    } 아래 수치는 확정 전까지 누적된 실험 기록입니다.`;
  }
  return winnerHint(a, b, mode);
}

export default function TeamNotificationExperimentCard({
  title,
  description,
  mode,
  loading,
  permissionDenied,
  empty,
  variantA,
  variantB,
  rolloutMeta,
}: Props) {
  if (permissionDenied) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h4 className="text-base font-semibold text-gray-900">{title}</h4>
        <p className="mt-2 text-sm text-gray-500">팀 스태프만 실험 집계를 볼 수 있습니다.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h4 className="text-base font-semibold text-gray-900">{title}</h4>
        <p className="mt-3 text-sm text-gray-500">실험 데이터를 불러오는 중…</p>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-white p-5 shadow-sm">
        <h4 className="text-base font-semibold text-gray-900">{title}</h4>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
        <p className="mt-2 text-xs text-gray-400">아직 집계 문서가 없거나 발송 건수가 0입니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h4 className="text-base font-semibold text-gray-900">{title}</h4>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      {rolloutMeta?.rollout === "winner_only" && rolloutMeta.winner ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <span className="font-semibold">자동 적용 중</span> — 신규 발송은{" "}
          <span className="font-semibold">{rolloutMeta.winner}안</span> 문구만 사용합니다.
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <VariantBlock label="A안" b={variantA} mode={mode} />
        <VariantBlock label="B안" b={variantB} mode={mode} />
      </div>
      <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-800">
        {rolloutFooter(rolloutMeta, variantA, variantB, mode)}
      </p>
    </div>
  );
}
