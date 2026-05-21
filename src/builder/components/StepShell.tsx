/**
 * StepShell
 * Step 공통 레이아웃 래퍼
 */

import { ReactNode } from "react";

interface StepShellProps {
  stepNumber: number;
  totalSteps: number;
  title: string;
  description?: string;
  children: ReactNode;
}

export default function StepShell({
  stepNumber,
  totalSteps,
  title,
  description,
  children,
}: StepShellProps) {
  return (
    <div className="space-y-8">
      {/* Step 헤더 */}
      <div className="text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">
          Step {stepNumber} / {totalSteps}
        </p>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>

      {/* Step 콘텐츠 */}
      {children}
    </div>
  );
}
