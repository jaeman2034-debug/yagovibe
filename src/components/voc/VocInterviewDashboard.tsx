import type { VocFeedbackListItem } from "@/lib/voc/vocFeedbackService";
import { formatVocCapturedAt } from "@/lib/voc/vocFeedbackService";
import {
  type PainIntelligenceCategory,
  type RequestIntelligenceCategory,
  type VocRankedItem,
} from "@/lib/voc/aggregateVocDashboard";
import {
  aggregateVocReport,
  type VocReportStats,
} from "@/lib/voc/aggregateVocReport";
import { VOC_FEATURE_LABELS, VOC_PERSONA_LABELS, type VocPersona } from "@/lib/voc/vocFeedbackTypes";
import { cn } from "@/lib/utils";

const PERSONA_COLORS: Record<VocPersona, string> = {
  parent: "bg-emerald-500",
  coach: "bg-violet-500",
  operator: "bg-sky-500",
};

function PainIntelligencePanel({ categories }: { categories: PainIntelligenceCategory[] }) {
  return (
    <div
      className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-3"
      data-testid="voc-pain-intelligence"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
          Pain Intelligence
        </p>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
          I-2.3
        </span>
      </div>
      <p className="mt-1 text-[10px] text-amber-900/80">
        FII · GEV · 전문 용어 등 → 정규화 카테고리
      </p>

      {categories.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">아직 Pain Intelligence 데이터가 없습니다.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {categories.map((cat) => (
            <div key={cat.id} className="rounded-lg border border-amber-100 bg-white/80 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{cat.label}</p>
                <p className="text-sm font-bold text-amber-800">{cat.pct}%</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: `${Math.min(100, cat.pct)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">{cat.count}건 · 대표 VOC</p>
              {cat.sampleQuotes.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {cat.sampleQuotes.map((quote) => (
                    <li key={quote} className="text-xs italic text-slate-700">
                      &ldquo;{quote}&rdquo;
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RequestIntelligencePanel({ categories }: { categories: RequestIntelligenceCategory[] }) {
  return (
    <div
      className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3"
      data-testid="voc-request-intelligence"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-900">
          Request Intelligence
        </p>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
          I-2.4
        </span>
      </div>
      <p className="mt-1 text-[10px] text-emerald-900/80">
        자동 발송 · 카카오톡 · 월간 리포트 → 정규화 카테고리
      </p>

      {categories.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">아직 Request Intelligence 데이터가 없습니다.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {categories.map((cat) => (
            <div key={cat.id} className="rounded-lg border border-emerald-100 bg-white/80 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{cat.label}</p>
                  <p className="text-[10px] text-slate-500">{cat.hint}</p>
                </div>
                <p className="text-sm font-bold text-emerald-800">{cat.pct}%</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{ width: `${Math.min(100, cat.pct)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">{cat.count}건 · 대표 VOC</p>
              {cat.sampleQuotes.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {cat.sampleQuotes.map((quote) => (
                    <li key={quote} className="text-xs italic text-slate-700">
                      &ldquo;{quote}&rdquo;
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RankList({ title, items, empty }: { title: string; items: VocRankedItem[]; empty: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{empty}</p>
      ) : (
        <ol className="mt-2 space-y-2">
          {items.map((row, idx) => (
            <li key={`${row.label}-${idx}`} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{row.label}</p>
                <p className="text-xs text-slate-500">{row.count}건</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function RecentInterviewList({ items }: { items: VocFeedbackListItem[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">최근 인터뷰</p>
      <div className="mt-2 space-y-2">
        {items.slice(0, 8).map((row) => (
          <div key={row.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-900">{VOC_PERSONA_LABELS[row.persona]}</span>
              <span className="text-slate-500">{formatVocCapturedAt(row.capturedAt)}</span>
              <span className="rounded bg-white px-1.5 py-0.5 text-slate-600">
                {VOC_FEATURE_LABELS[row.feature]}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-slate-800">
              {row.positiveText || row.painText || row.requestText || "(내용 없음)"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VocInterviewDashboard({
  items,
  stats: statsProp,
}: {
  items: VocFeedbackListItem[];
  stats?: VocReportStats;
}) {
  const stats = statsProp ?? aggregateVocReport(items);
  const maxTrend = Math.max(1, ...stats.dailyTrend.map((d) => d.count));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-violet-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase text-violet-700">총 인터뷰</p>
          <p className="text-2xl font-bold text-slate-900">{stats.totalCount}</p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase text-violet-700">평균 Q1</p>
          <p className="text-2xl font-bold text-slate-900">{stats.avgQ1 || "—"}</p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase text-violet-700">평균 Q2</p>
          <p className="text-2xl font-bold text-slate-900">{stats.avgQ2 || "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(["parent", "coach", "operator"] as VocPersona[]).map((p) => (
          <div key={p} className="rounded-xl border border-slate-200 bg-white p-2 text-center">
            <p className="text-[10px] font-semibold text-slate-500">{VOC_PERSONA_LABELS[p]}</p>
            <p className="text-lg font-bold text-slate-900">{stats.personaCounts[p]}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Persona 비율</p>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100">
          {(["parent", "coach", "operator"] as VocPersona[]).map((p) =>
            stats.personaPct[p] > 0 ? (
              <div
                key={p}
                className={cn(PERSONA_COLORS[p])}
                style={{ width: `${stats.personaPct[p]}%` }}
                title={`${VOC_PERSONA_LABELS[p]} ${stats.personaPct[p]}%`}
              />
            ) : null
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
          {(["parent", "coach", "operator"] as VocPersona[]).map((p) => (
            <span key={p} className="inline-flex items-center gap-1">
              <span className={cn("inline-block h-2 w-2 rounded-full", PERSONA_COLORS[p])} />
              {VOC_PERSONA_LABELS[p]} {stats.personaPct[p]}%
            </span>
          ))}
        </div>
      </div>

      <PainIntelligencePanel categories={stats.painIntelligence} />

      <RequestIntelligencePanel categories={stats.requestIntelligence} />

      <RankList
        title="TOP Pain (원본 태그)"
        items={stats.topPain}
        empty="아직 Pain 데이터가 없습니다."
      />
      <RankList
        title="TOP Request (원본 태그)"
        items={stats.topRequest}
        empty="아직 Request 데이터가 없습니다."
      />

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">최근 30일 추세</p>
        <div className="mt-3 flex h-24 items-end gap-0.5">
          {stats.dailyTrend.map((point) => (
            <div
              key={point.date}
              className="flex min-w-0 flex-1 flex-col items-center justify-end"
              title={`${point.label} · ${point.count}건 · Q2 ${point.avgQ2 || "—"}`}
            >
              <div
                className="w-full rounded-t bg-violet-300"
                style={{
                  height: `${Math.max(4, (point.count / maxTrend) * 100)}%`,
                  minHeight: point.count > 0 ? 8 : 2,
                }}
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-slate-500">막대 = 일별 인터뷰 건수 (최근 30일)</p>
      </div>

      <RecentInterviewList items={items} />
    </div>
  );
}
