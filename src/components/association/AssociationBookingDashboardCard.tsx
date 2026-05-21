/**
 * AssociationBookingDashboardCard Component
 * 협회 대관 운영 대시보드 카드
 * 
 * 협회 홈 화면에 표시되는 핵심 지표 카드
 */

import React from "react";
import { useAssociationReport } from "@/hooks/useAssociationReport";

/**
 * Props
 */
export interface AssociationBookingDashboardCardProps {
  /** 협회 ID */
  associationId: string;
  /** 리포트 시작일 (ISO date string) */
  from: string;
  /** 리포트 종료일 (ISO date string) */
  to: string;
  /** 커스텀 클래스명 */
  className?: string;
}

/**
 * 협회 대관 운영 대시보드 카드
 * 
 * @example
 * ```tsx
 * <AssociationBookingDashboardCard
 *   associationId="assoc-nowon-football"
 *   from="2026-01-01"
 *   to="2026-01-31"
 * />
 * ```
 */
export default function AssociationBookingDashboardCard({
  associationId,
  from,
  to,
  className = "",
}: AssociationBookingDashboardCardProps) {
  const { loading, report, error } = useAssociationReport({
    associationId,
    from,
    to,
  });

  // 로딩 상태
  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 ${className}`}>
        <div className="text-red-500 text-sm">{error}</div>
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

  // 비회원 대기 발생 수 (WAITLIST + VIEW_ONLY)
  const nonMemberWaitlistCount =
    report.byDecision.WAITLIST + report.byDecision.VIEW_ONLY;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 ${className}`}>
      {/* 헤더 */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          대관 운영 현황
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {report.period.from} ~ {report.period.to}
        </p>
      </div>

      {/* 핵심 지표 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 전체 대관 요청 수 */}
        <MetricCard
          title="전체 대관 요청"
          value={report.totalBookings}
          unit="건"
          icon="📅"
          color="blue"
        />

        {/* 우선 배정 사용률 */}
        <MetricCard
          title="우선 배정 사용률"
          value={priorityUsageRate}
          unit="%"
          icon="⭐"
          color="green"
          subtitle={`${report.priorityUsage.HIGH}건 사용`}
        />

        {/* 비회원 대기 발생 수 */}
        <MetricCard
          title="비회원 대기 발생"
          value={nonMemberWaitlistCount}
          unit="건"
          icon="⏳"
          color="orange"
          subtitle={`대기 ${report.byDecision.WAITLIST}건, 제한 ${report.byDecision.VIEW_ONLY}건`}
        />

        {/* 전환 유도 발생 수 */}
        <MetricCard
          title="전환 유도 발생"
          value={report.conversionMetrics.nonMemberDenies}
          unit="건"
          icon="🔄"
          color="purple"
          subtitle={`전환 문의 ${report.conversionMetrics.conversionRequests}건`}
        />
      </div>

      {/* 상세 통계 (접을 수 있는 섹션) */}
      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
          상세 통계 보기
        </summary>
        <div className="mt-4 space-y-4">
          {/* 팀 유형별 통계 */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              팀 유형별 대관 요청
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <StatItem label="회원팀" value={report.byTeamType.MEMBER} unit="건" />
              <StatItem label="비회원팀" value={report.byTeamType.NON_MEMBER} unit="건" />
              <StatItem label="아카데미" value={report.byTeamType.ACADEMY} unit="건" />
            </div>
          </div>

          {/* 상태별 통계 */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              대관 상태별 집계
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <StatItem label="확정" value={report.byStatus.CONFIRMED} unit="건" />
              <StatItem label="대기" value={report.byStatus.WAITLIST} unit="건" />
              <StatItem label="승인 대기" value={report.byStatus.PENDING} unit="건" />
            </div>
          </div>

          {/* 전환 성과 */}
          {report.conversionMetrics.conversionRequests > 0 && (
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-3">
                회원 전환 성과
              </h3>
              <div className="space-y-2">
                <StatItem
                  label="전환 문의"
                  value={report.conversionMetrics.conversionRequests}
                  unit="건"
                />
                <StatItem
                  label="전환 후 성공률"
                  value={report.conversionMetrics.conversionSuccessRate}
                  unit="%"
                />
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

/**
 * 지표 카드 컴포넌트
 */
function MetricCard({
  title,
  value,
  unit,
  icon,
  color,
  subtitle,
}: {
  title: string;
  value: number;
  unit: string;
  icon: string;
  color: "blue" | "green" | "orange" | "purple";
  subtitle?: string;
}) {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    green: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    orange: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
    purple: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{title}</span>
      </div>
      <div className="flex items-baseline space-x-1">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {value.toLocaleString()}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>
      </div>
      {subtitle && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

/**
 * 통계 아이템 컴포넌트
 */
function StatItem({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className="text-lg font-semibold text-gray-900 dark:text-white">
        {value.toLocaleString()}
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">{unit}</span>
      </div>
    </div>
  );
}

