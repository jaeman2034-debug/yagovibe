/**
 * 🔥 G-④-②: AI 분석 결과 요약 카드 컴포넌트
 * 
 * AI 결과를 3초 안에 이해할 수 있게 만듭니다.
 * - 신뢰도 배지 → 1줄 결론 → 핵심 포인트
 * - 스크롤 전 핵심 노출
 * - 모바일 퍼스트
 */

import { useEffect, useRef } from "react";
import { ConfidenceBadgeWithTooltip } from "@/components/ai/ConfidenceBadge";
import { ConfidenceResult } from "@/lib/analytics/confidenceCalculator";
import type { AISummary } from "@/lib/ai/summaryGenerator";
import { aiAnalysisLogger } from "@/lib/analytics/aiAnalysisLogger";
import { detectInAppBrowser } from "@/utils/inAppBrowser";

interface AISummaryCardProps {
  confidence: ConfidenceResult;
  summary: AISummary;
  className?: string;
}

/**
 * AI 분석 결과 요약 카드
 * 
 * @example
 * ```tsx
 * <AISummaryCard
 *   confidence={confidenceResult}
 *   summary={aiSummary}
 * />
 * ```
 */
export function AISummaryCard({
  confidence,
  summary,
  className = '',
}: AISummaryCardProps) {
  const isUnavailable = confidence.level === 'UNAVAILABLE';
  const isLow = confidence.level === 'LOW';
  
  // 🔥 관측 지표: 요약 체류 시간 추적
  const startTimeRef = useRef<number>(Date.now());
  const cardRef = useRef<HTMLElement>(null);
  const hasLoggedRef = useRef<boolean>(false);

  useEffect(() => {
    startTimeRef.current = Date.now();
    hasLoggedRef.current = false;

    // 스크롤 이벤트 리스너: 요약 영역 이탈 감지
    const handleScroll = () => {
      if (hasLoggedRef.current || !cardRef.current) return;

      const cardRect = cardRef.current.getBoundingClientRect();
      const isOutOfView = cardRect.bottom < 0; // 카드가 화면 위로 완전히 벗어남

      if (isOutOfView) {
        const durationMs = Date.now() - startTimeRef.current;
        
        // 🔥 안전 가드: 의미 없는 체류 제거 (300ms 미만은 노이즈)
        if (durationMs < 300) {
          hasLoggedRef.current = true;
          return;
        }
        
        const isInAppBrowser = detectInAppBrowser() !== 'none';
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        const environment = isInAppBrowser ? 'INAPP_BROWSER' : (isMobile ? 'MOBILE' : 'DESKTOP');

        aiAnalysisLogger.logEvent('summary_view_end', {
          metric: 'summary_view_duration',
          durationMs,
          confidenceLevel: confidence.level,
          environment,
          reason: 'scroll_away',
        });

        hasLoggedRef.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // 언마운트 시 로깅 (아직 로그되지 않은 경우만)
    return () => {
      window.removeEventListener('scroll', handleScroll);
      
      if (!hasLoggedRef.current) {
        const durationMs = Date.now() - startTimeRef.current;
        
        // 🔥 안전 가드: 의미 없는 체류 제거 (300ms 미만은 노이즈)
        if (durationMs >= 300) {
          const isInAppBrowser = detectInAppBrowser() !== 'none';
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          
          const environment = isInAppBrowser ? 'INAPP_BROWSER' : (isMobile ? 'MOBILE' : 'DESKTOP');

          aiAnalysisLogger.logEvent('summary_view_end', {
            metric: 'summary_view_duration',
            durationMs,
            confidenceLevel: confidence.level,
            environment,
            reason: 'unmount',
          });
        }
      }
    };
  }, [confidence.level]);

  return (
    <section
      ref={cardRef}
      className={`
        rounded-xl border p-4
        bg-white dark:bg-slate-900
        border-slate-200 dark:border-slate-700
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {/* 신뢰도 배지 */}
      <div className="mb-2">
        <ConfidenceBadgeWithTooltip
          level={confidence.level}
          reasons={confidence.reasons}
          size="sm"
        />
      </div>

      {/* 1줄 결론 */}
      <p
        className={`
          text-base font-medium leading-snug
          ${isUnavailable 
            ? 'text-slate-500 dark:text-slate-400' 
            : 'text-slate-900 dark:text-slate-100'
          }
        `.trim().replace(/\s+/g, ' ')}
      >
        {summary.headline}
      </p>

      {/* 핵심 포인트 */}
      {summary.highlights.length > 0 && !isUnavailable && (
        <ul className="mt-3 space-y-1 text-sm">
          {summary.highlights.slice(0, 3).map((point, idx) => (
            <li
              key={idx}
              className={`
                flex items-start gap-2
                ${isLow
                  ? 'text-slate-600 dark:text-slate-400'
                  : 'text-slate-700 dark:text-slate-300'
                }
              `.trim().replace(/\s+/g, ' ')}
            >
              <span className="mt-[2px] select-none text-green-600 dark:text-green-400">✔</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}

      {/* UNAVAILABLE 가이드 */}
      {isUnavailable && (
        <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          이미지 상태를 개선하거나 외부 브라우저에서 다시 시도해보세요.
        </div>
      )}
    </section>
  );
}

