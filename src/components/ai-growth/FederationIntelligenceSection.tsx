import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFederationIntelligence } from "@/hooks/useFederationIntelligence";
import { exportFederationReportPdf } from "@/lib/ai-growth/exportFederationReportPdf";
import { FederationDashboardCard } from "@/components/ai-growth/FederationDashboardCard";
import { FederationCoachBenchmarkCard } from "@/components/ai-growth/FederationCoachBenchmarkCard";
import { FederationOperationsBenchmarkCard } from "@/components/ai-growth/FederationOperationsBenchmarkCard";
import { FederationRiskIntelligenceCard } from "@/components/ai-growth/FederationRiskIntelligenceCard";

type Props = {
  className?: string;
  /** false면 operated academy 0건일 때 null (Hub 기본, G-1과 동일) */
  hideWhenEmpty?: boolean;
};

/** H-1 — Federation Intelligence */
export function FederationIntelligenceSection({
  className,
  hideWhenEmpty = true,
}: Props) {
  const { data, loading, emptyReason } = useFederationIntelligence();
  const [pdfBusy, setPdfBusy] = useState(false);

  const canExportPdf = Boolean(data?.dashboard);

  async function handleExportPdf() {
    if (!data || pdfBusy || !canExportPdf) return;
    setPdfBusy(true);
    try {
      await exportFederationReportPdf({
        reportTitle: "Federation Intelligence",
        dashboard: data.dashboard,
        riskIntelligence: data.riskIntelligence,
        coachBenchmark: data.coachBenchmark,
        operationsBenchmark: data.operationsBenchmark,
      });
    } catch (error) {
      console.warn("[FederationIntelligenceSection] PDF export failed", error);
    } finally {
      setPdfBusy(false);
    }
  }

  if (hideWhenEmpty && emptyReason === "no_operated_academies" && !loading) {
    return null;
  }

  return (
    <div className={className} data-testid="federation-intelligence-section">
      <FederationDashboardCard dashboard={data?.dashboard ?? null} loading={loading} />
      <FederationRiskIntelligenceCard
        intelligence={data?.riskIntelligence ?? null}
        loading={loading}
        className="mt-3"
      />
      <FederationCoachBenchmarkCard
        benchmark={data?.coachBenchmark ?? null}
        loading={loading}
        className="mt-3"
      />
      <FederationOperationsBenchmarkCard
        benchmark={data?.operationsBenchmark ?? null}
        loading={loading}
        className="mt-3"
      />

      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 gap-1.5 border-violet-300 px-4 text-xs font-bold text-violet-950 hover:bg-violet-50"
          disabled={pdfBusy || loading || !canExportPdf}
          onClick={() => void handleExportPdf()}
          data-testid="federation-report-pdf-button"
        >
          {pdfBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Download className="h-3.5 w-3.5" aria-hidden />
          )}
          Federation PDF
        </Button>
      </div>
    </div>
  );
}
