/**
 * 🔥 G-②: AI 분석 결과 신뢰도 배지 컴포넌트
 * 
 * 사용자가 "이 결과를 얼마나 믿어도 되는지" 0.5초 안에 이해하게 만듭니다.
 */

import { ConfidenceLevel, getConfidenceLabel, getConfidenceToken } from "@/lib/analytics/confidenceCalculator";
import { CheckCircle2, AlertCircle, XCircle, Info } from "lucide-react";

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  reasons?: string[];
  size?: 'sm' | 'md';
  className?: string;
  showReasons?: boolean;
}

/**
 * 신뢰도 등급에 따른 아이콘을 반환합니다.
 */
function getConfidenceIcon(level: ConfidenceLevel) {
  switch (level) {
    case 'HIGH':
      return CheckCircle2;
    case 'MEDIUM':
      return AlertCircle;
    case 'LOW':
      return XCircle;
    case 'UNAVAILABLE':
      return Info;
  }
}

/**
 * 신뢰도 배지 컴포넌트
 * 
 * @example
 * ```tsx
 * <ConfidenceBadge 
 *   level="HIGH" 
 *   reasons={['첫 시도 성공', '빠른 응답']}
 *   size="sm"
 * />
 * ```
 */
export function ConfidenceBadge({ 
  level, 
  reasons = [], 
  size = 'md',
  className = '',
  showReasons = false 
}: ConfidenceBadgeProps) {
  const label = getConfidenceLabel(level);
  const token = getConfidenceToken(level);
  const Icon = getConfidenceIcon(level);
  
  // 사이즈별 스타일
  const sizeStyles = {
    sm: {
      container: 'px-2 py-0.5 text-xs',
      icon: 'w-3 h-3',
      text: 'text-xs',
      reasons: 'text-[10px]'
    },
    md: {
      container: 'px-3 py-1 text-sm',
      icon: 'w-4 h-4',
      text: 'text-sm',
      reasons: 'text-xs'
    }
  };

  const styles = sizeStyles[size];

  // CSS 변수 사용 (다크모드 자동 대응)
  const badgeStyle = {
    color: `var(${token})`,
    backgroundColor: `var(${token})`,
    opacity: '0.1',
    borderColor: `var(${token})`,
  };

  // 배경색 클래스 (다크모드 대응)
  const bgClass = {
    HIGH: 'bg-green-50 dark:bg-green-900/20',
    MEDIUM: 'bg-yellow-50 dark:bg-yellow-900/20',
    LOW: 'bg-red-50 dark:bg-red-900/20',
    UNAVAILABLE: 'bg-gray-50 dark:bg-gray-800',
  }[level];

  const borderClass = {
    HIGH: 'border-green-200 dark:border-green-800',
    MEDIUM: 'border-yellow-200 dark:border-yellow-800',
    LOW: 'border-red-200 dark:border-red-800',
    UNAVAILABLE: 'border-gray-200 dark:border-gray-700',
  }[level];

  const badgeClass = `
    inline-flex items-center gap-1.5 rounded-full border font-medium
    ${bgClass} ${borderClass}
    ${styles.container}
    ${styles.text}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // reasons 텍스트 (최대 2개)
  const reasonsText = reasons.slice(0, 2).join(' · ');

  return (
    <div className="inline-flex flex-col gap-1">
      <div 
        className={badgeClass}
        style={{
          color: `var(${token})`,
        }}
      >
        <Icon className={styles.icon} style={{ color: `var(${token})` }} />
        <span>{label}</span>
      </div>
      
      {/* reasons 서브텍스트 (showReasons가 true일 때만) */}
      {showReasons && reasonsText && (
        <div 
          className={`${styles.reasons} text-gray-600 dark:text-gray-400`}
          title={reasons.join(' · ')}
        >
          {reasonsText}
        </div>
      )}
    </div>
  );
}

/**
 * 툴팁이 있는 신뢰도 배지 (reasons를 툴팁으로 표시)
 * 
 * @example
 * ```tsx
 * <ConfidenceBadgeWithTooltip 
 *   level="MEDIUM" 
 *   reasons={['재시도 1회', '응답 지연']}
 * />
 * ```
 */
export function ConfidenceBadgeWithTooltip({ 
  level, 
  reasons = [], 
  size = 'md',
  className = ''
}: Omit<ConfidenceBadgeProps, 'showReasons'>) {
  const label = getConfidenceLabel(level);
  const token = getConfidenceToken(level);
  const Icon = getConfidenceIcon(level);
  
  const sizeStyles = {
    sm: {
      container: 'px-2 py-0.5 text-xs',
      icon: 'w-3 h-3',
    },
    md: {
      container: 'px-3 py-1 text-sm',
      icon: 'w-4 h-4',
    }
  };

  const styles = sizeStyles[size];

  const bgClass = {
    HIGH: 'bg-green-50 dark:bg-green-900/20',
    MEDIUM: 'bg-yellow-50 dark:bg-yellow-900/20',
    LOW: 'bg-red-50 dark:bg-red-900/20',
    UNAVAILABLE: 'bg-gray-50 dark:bg-gray-800',
  }[level];

  const borderClass = {
    HIGH: 'border-green-200 dark:border-green-800',
    MEDIUM: 'border-yellow-200 dark:border-yellow-800',
    LOW: 'border-red-200 dark:border-red-800',
    UNAVAILABLE: 'border-gray-200 dark:border-gray-700',
  }[level];

  return (
    <div 
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium cursor-help
        ${bgClass} ${borderClass}
        ${styles.container}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      style={{
        color: `var(${token})`,
      }}
      title={reasons.length > 0 ? reasons.join(' · ') : label}
    >
      <Icon className={styles.icon} style={{ color: `var(${token})` }} />
      <span>{label}</span>
    </div>
  );
}

