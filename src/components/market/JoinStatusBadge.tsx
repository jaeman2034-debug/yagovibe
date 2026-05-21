/**
 * 🔥 참여 상태 뱃지 컴포넌트
 * 
 * 역할:
 * - 참여 상태에 따른 뱃지 표시
 * - FULL 상태 처리
 */

import React from "react";

interface JoinStatusBadgeProps {
  status: "none" | "pending" | "approved" | "rejected";
  isFull?: boolean;
  className?: string;
}

export default function JoinStatusBadge({
  status,
  isFull = false,
  className = "",
}: JoinStatusBadgeProps) {
  if (status === "approved") {
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 ${className}`}
      >
        ✅ 참여중
      </span>
    );
  }

  if (status === "pending") {
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 ${className}`}
      >
        ⏳ 대기중
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 ${className}`}
      >
        ❌ 거절됨
      </span>
    );
  }

  if (isFull) {
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 ${className}`}
      >
        🔒 모집 마감
      </span>
    );
  }

  return null;
}
