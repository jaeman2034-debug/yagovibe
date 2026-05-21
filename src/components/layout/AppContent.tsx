import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import {
  MobileFullWidthContainer,
  mobileFullWidthContainerClassName,
} from "@/components/layout/MobileFullWidthContainer";

/**
 * 앱 콘텐츠 폭 규칙 — 모바일 퍼스트 단일 컬럼 (허브·마이·활동 등 공통).
 * @see MobileFullWidthContainer — 플랫폼 전역 모바일 가로폭 정책
 */
export { mobileFullWidthContainerClassName as appContentMaxClassName };

export function AppContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <MobileFullWidthContainer className={cn(className)} {...props} />
  );
}

/** 리스트·폼 세로 간격 (카드 사이 space-y-3) */
export function AppStack({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-3", className)} {...props} />;
}

/** 섹션 구분 (첫 블록은 상단 여백 없음) */
export function AppSection({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4 first:mt-0", className)} {...props} />;
}
