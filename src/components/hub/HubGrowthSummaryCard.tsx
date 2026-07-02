import { ParentGrowthHomeSummaryCard } from "@/components/ai-growth/ParentGrowthHomeSummaryCard";

type Props = {
  className?: string;
};

/** Hub — C-1d parent growth summary (shared with /home/parent) */
export function HubGrowthSummaryCard({ className }: Props) {
  return <ParentGrowthHomeSummaryCard className={className} />;
}
