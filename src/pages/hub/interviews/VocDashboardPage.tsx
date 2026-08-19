import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import VocInterviewDashboard from "@/components/voc/VocInterviewDashboard";
import type { VocFeedbackListItem } from "@/lib/voc/vocFeedbackService";
import {
  aggregateVocReport,
  VOC_REPORT_MIN_INTERVIEWS,
} from "@/lib/voc/aggregateVocReport";
import { exportVocReportPdf } from "@/lib/voc/pdf/exportVocReportPdf";
import { cn } from "@/lib/utils";

type Props = {
  items: VocFeedbackListItem[];
  teamLabel?: string;
};

/** I-2.5 — VOC Dashboard + Pilot Report PDF */
export default function VocDashboardPage({ items, teamLabel }: Props) {
  const stats = useMemo(() => aggregateVocReport(items), [items]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleExportPdf() {
    setExporting(true);
    setExportError(null);
    try {
      await exportVocReportPdf({
        stats,
        reportTitle: teamLabel ? `${teamLabel} VOC Pilot` : "VOC Pilot Report",
        teamLabel,
      });
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "PDF 생성 실패");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-3" data-testid="voc-dashboard-page">
      <div
        className={cn(
          "rounded-xl border p-3",
          stats.meetsGate
            ? "border-violet-200 bg-violet-50"
            : "border-amber-200 bg-amber-50"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
              I-2.5 VOC Pilot Report
            </p>
            <p className="mt-1 text-sm text-slate-700">
              {stats.isEmpty
                ? "인터뷰를 등록하면 Pilot Report PDF를 생성할 수 있습니다."
                : stats.meetsGate
                  ? `Gate PASS · n=${stats.totalCount} · Q1 ${stats.avgQ1 || "—"} · Q2 ${stats.avgQ2 || "—"}`
                  : `Gate 미달 · n=${stats.totalCount}/${VOC_REPORT_MIN_INTERVIEWS} · Q1 ${stats.avgQ1 || "—"} · Q2 ${stats.avgQ2 || "—"}`}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="shrink-0"
            disabled={exporting || stats.isEmpty}
            onClick={() => void handleExportPdf()}
            data-testid="voc-export-pdf-button"
          >
            {exporting ? "생성 중…" : "PDF 다운로드"}
          </Button>
        </div>
        {exportError ? (
          <p className="mt-2 text-sm text-red-700">{exportError}</p>
        ) : null}
      </div>

      <VocInterviewDashboard items={items} stats={stats} />
    </div>
  );
}
