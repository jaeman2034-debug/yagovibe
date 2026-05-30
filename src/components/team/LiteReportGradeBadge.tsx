import type React from "react";
import { Badge } from "@/components/ui/badge";
import {
  getLiteReportGradeBadgeClassName,
  type LiteReportGrade,
} from "@/lib/team/teamAiAnalysisLite";

type Props = {
  grade: LiteReportGrade;
  className?: string;
} & Pick<React.HTMLAttributes<HTMLSpanElement>, "data-testid">;

/** Sprint 8E — AI 분석 Lite 등급 배지 */
export function LiteReportGradeBadge({ grade, className, ...rest }: Props) {
  return (
    <Badge
      variant="outline"
      className={`min-w-[2.25rem] justify-center tabular-nums ${getLiteReportGradeBadgeClassName(grade)} ${className ?? ""}`}
      {...rest}
    >
      {grade}
    </Badge>
  );
}
