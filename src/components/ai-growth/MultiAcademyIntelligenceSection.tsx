import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMultiAcademyIntelligence } from "@/hooks/useMultiAcademyIntelligence";
import { exportMultiAcademyReportPdf } from "@/lib/ai-growth/exportMultiAcademyReportPdf";
import { MultiAcademyCoachBenchmarkCard } from "@/components/ai-growth/MultiAcademyCoachBenchmarkCard";
import { MultiAcademyDashboardCard } from "@/components/ai-growth/MultiAcademyDashboardCard";
import { MultiAcademyOperationsBenchmarkCard } from "@/components/ai-growth/MultiAcademyOperationsBenchmarkCard";
import { MultiAcademyRiskIntelligenceCard } from "@/components/ai-growth/MultiAcademyRiskIntelligenceCard";

type Props = {
  className?: string;
  /** false면 operated academy 0건일 때 null (Hub 기본) */
  hideWhenEmpty?: boolean;
};

/** G-1 — Multi Academy Dashboard + Risk (공유 섹션) */
export function MultiAcademyIntelligenceSection({
  className,
  hideWhenEmpty = true,
}: Props) {
  const { data, loading, emptyReason } = useMultiAcademyIntelligence();
  const [pdfBusy, setPdfBusy] = useState(false);

  const canExportPdf = Boolean(data?.dashboard && data.dashboard.kpi.academyCount >= 1);

  async function handleExportPdf() {
    if (!data || pdfBusy || !canExportPdf) return;
    setPdfBusy(true);
    try {
      await exportMultiAcademyReportPdf({
        reportTitle: "Multi Academy Intelligence",
        dashboard: data.dashboard,
        riskIntelligence: data.riskIntelligence,
        coachBenchmark: data.coachBenchmark,
        operationsBenchmark: data.operationsBenchmark,
      });
    } catch (error) {
      console.warn("[MultiAcademyIntelligenceSection] PDF export failed", error);
    } finally {
      setPdfBusy(false);
    }
  }

  if (hideWhenEmpty && emptyReason === "no_operated_academies" && !loading) {
    return null;
  }

  return (
    <div className={className} data-testid="multi-academy-intelligence-section">
      <MultiAcademyDashboardCard
        dashboard={data?.dashboard ?? null}
        loading={loading}
      />
      <MultiAcademyRiskIntelligenceCard
        intelligence={data?.riskIntelligence ?? null}
        loading={loading}
        className="mt-3"
      />
      <MultiAcademyCoachBenchmarkCard
        benchmark={data?.coachBenchmark ?? null}
        loading={loading}
        className="mt-3"
      />
      <MultiAcademyOperationsBenchmarkCard
        benchmark={data?.operationsBenchmark ?? null}
        loading={loading}
        className="mt-3"
      />

      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 gap-1.5 border-indigo-300 px-4 text-xs font-bold text-indigo-950 hover:bg-indigo-50"
          disabled={pdfBusy || loading || !canExportPdf}
          onClick={() => void handleExportPdf()}
          data-testid="multi-academy-report-pdf-button"
        >
          {pdfBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Download className="h-3.5 w-3.5" aria-hidden />
          )}
          Multi Academy PDF
        </Button>
      </div>
    </div>
  );
}
