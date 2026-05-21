/**
 * AssociationBookingDashboardCardToday Component
 * 협회 대관 운영 대시보드 카드 (오늘 기준)
 * 
 * 협회 홈 화면용 간소화 버전 (오늘/이번 달 자동 계산)
 */

import React, { useMemo } from "react";
import AssociationBookingDashboardCard from "./AssociationBookingDashboardCard";

/**
 * Props
 */
export interface AssociationBookingDashboardCardTodayProps {
  /** 협회 ID */
  associationId: string;
  /** 리포트 기간 타입 */
  period: "today" | "thisMonth" | "lastMonth" | "thisYear";
  /** 커스텀 클래스명 */
  className?: string;
}

/**
 * 협회 대관 운영 대시보드 카드 (오늘/이번 달 기준)
 * 
 * @example
 * ```tsx
 * // 오늘
 * <AssociationBookingDashboardCardToday
 *   associationId="assoc-nowon-football"
 *   period="today"
 * />
 * 
 * // 이번 달
 * <AssociationBookingDashboardCardToday
 *   associationId="assoc-nowon-football"
 *   period="thisMonth"
 * />
 * ```
 */
export default function AssociationBookingDashboardCardToday({
  associationId,
  period = "thisMonth",
  className = "",
}: AssociationBookingDashboardCardTodayProps) {
  // 기간 계산
  const { from, to } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();

    switch (period) {
      case "today": {
        const today = new Date(year, month, date);
        const from = today.toISOString().split("T")[0];
        const to = from;
        return { from, to };
      }

      case "thisMonth": {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const from = firstDay.toISOString().split("T")[0];
        const to = lastDay.toISOString().split("T")[0];
        return { from, to };
      }

      case "lastMonth": {
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        const from = firstDay.toISOString().split("T")[0];
        const to = lastDay.toISOString().split("T")[0];
        return { from, to };
      }

      case "thisYear": {
        const firstDay = new Date(year, 0, 1);
        const lastDay = new Date(year, 11, 31);
        const from = firstDay.toISOString().split("T")[0];
        const to = lastDay.toISOString().split("T")[0];
        return { from, to };
      }

      default:
        return { from: "", to: "" };
    }
  }, [period]);

  if (!from || !to) {
    return null;
  }

  return (
    <AssociationBookingDashboardCard
      associationId={associationId}
      from={from}
      to={to}
      className={className}
    />
  );
}

