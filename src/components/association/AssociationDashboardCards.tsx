/**
 * AssociationDashboardCards Component
 * 협회 홈 대시보드 카드 4개 묶음
 * 
 * 협회 운영 현황을 한눈에 볼 수 있는 핵심 지표 4개
 */

import React from "react";
import { useAssociationReport } from "@/hooks/useAssociationReport";
import AssociationStatCard from "./AssociationStatCard";

/**
 * Props
 */
export interface AssociationDashboardCardsProps {
  /** 협회 ID */
  associationId: string;
  /** 리포트 기간 타입 */
  period?: "today" | "thisMonth" | "lastMonth" | "thisYear";
  /** 커스텀 기간 (period가 undefined일 때 사용) */
  from?: string;
  to?: string;
  /** 커스텀 클래스명 */
  className?: string;
}

/**
 * 협회 홈 대시보드 카드 4개
 * 
 * @example
 * ```tsx
 * // 이번 달 기준
 * <AssociationDashboardCards
 *   associationId="assoc-nowon-football"
 *   period="thisMonth"
 * />
 * 
 * // 커스텀 기간
 * <AssociationDashboardCards
 *   associationId="assoc-nowon-football"
 *   from="2026-01-01"
 *   to="2026-01-31"
 * />
 * ```
 */
export default function AssociationDashboardCards({
  associationId,
  period = "thisMonth",
  from,
  to,
  className = "",
}: AssociationDashboardCardsProps) {
  // 기간 계산
  const dateRange = React.useMemo(() => {
    if (from && to) {
      return { from, to };
    }

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
  }, [period, from, to]);

  const { loading, report, error } = useAssociationReport({
    associationId,
    from: dateRange.from,
    to: dateRange.to,
    enabled: !!dateRange.from && !!dateRange.to,
  });

  // 로딩 상태
  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border-2 p-5 bg-gray-100 dark:bg-gray-800 animate-pulse"
          >
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-3"></div>
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 ${className}`}>
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  // 리포트 없음
  if (!report) {
    return null;
  }

  // 우선 배정 사용률 계산
  const priorityUsageRate =
    report.totalBookings > 0
      ? Math.round((report.priorityUsage.HIGH / report.totalBookings) * 100)
      : 0;

  // 비회원 대기 발생 수 (WAITLIST)
  const nonMemberWaitlistCount = report.byDecision.WAITLIST;

  // 전환 유도 발생 수 (VIEW_ONLY = nonMemberDenies)
  const conversionTriggers = report.conversionMetrics.nonMemberDenies;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {/* 카드 1: 이번 달 대관 요청 */}
      <AssociationStatCard
        title="이번 달 대관 요청"
        value={report.totalBookings}
        subtitle="이번 달 전체 요청"
        color="blue"
      />

      {/* 카드 2: 우선 배정 사용률 */}
      <AssociationStatCard
        title="우선 배정 사용률"
        value={`${priorityUsageRate}%`}
        subtitle="회원 우선권 사용"
        color="green"
      />

      {/* 카드 3: 비회원 대기 발생 */}
      <AssociationStatCard
        title="비회원 대기"
        value={nonMemberWaitlistCount}
        subtitle="초과 수요 발생"
        color="yellow"
      />

      {/* 카드 4: 전환 유도 발생 */}
      <AssociationStatCard
        title="회원 전환 유도"
        value={conversionTriggers}
        subtitle="정책 기반 전환"
        color="purple"
      />
    </div>
  );
}

