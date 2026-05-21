/**
 * SelectCard
 * 선택 가능한 카드 컴포넌트
 */

import { ReactNode } from "react";

interface SelectCardProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}

export default function SelectCard({
  selected,
  onClick,
  children,
  className = "",
}: SelectCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        cursor-pointer border-2 rounded-xl p-4 transition-all
        ${selected
          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-lg"
          : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:shadow-xl shadow-lg"
        }
        ${className}
      `}
    >
      {children}
    </div>
  );
}
