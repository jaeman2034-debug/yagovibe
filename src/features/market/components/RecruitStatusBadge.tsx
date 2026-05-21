/**
 * 🔥 모집 상태 배지 컴포넌트
 * 모집글 전용 상태 표시 (게시글 상태 + 내 신청 상태)
 */

import { Check, Clock, XCircle } from "lucide-react";
import type { MarketPost } from "../types";

interface RecruitStatusBadgeProps {
  post: MarketPost;
  myApplicationStatus?: "none" | "pending" | "approved" | "rejected";
  className?: string;
}

export default function RecruitStatusBadge({
  post,
  myApplicationStatus = "none",
  className = "",
}: RecruitStatusBadgeProps) {
  // 🔥 게시글 상태가 마감/종료
  if (post.status === "done" || post.status === "hidden") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 ${className}`}
      >
        <XCircle className="w-3 h-3" />
        마감
      </span>
    );
  }

  // 🔥 인원 마감
  const isFull = post.people && post.currentPeople && post.currentPeople >= post.people;
  if (isFull) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 ${className}`}
      >
        <XCircle className="w-3 h-3" />
        모집 마감
      </span>
    );
  }

  // 🔥 내 신청 상태 기반 표시
  if (myApplicationStatus === "none") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700 ${className}`}
      >
        신청 가능
      </span>
    );
  }

  if (myApplicationStatus === "pending") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 animate-pulse ${className}`}
      >
        <Clock className="w-3 h-3" />
        승인 대기
      </span>
    );
  }

  if (myApplicationStatus === "approved") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 ${className}`}
      >
        <Check className="w-3 h-3" />
        참여 확정
      </span>
    );
  }

  if (myApplicationStatus === "rejected") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 ${className}`}
      >
        거절됨
      </span>
    );
  }

  // 🔥 기본: 모집중
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 ${className}`}
    >
      모집중
    </span>
  );
}
