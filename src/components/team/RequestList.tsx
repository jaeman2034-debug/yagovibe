/**
 * 🔥 RequestList - 가입 요청 목록 (STEP: 팀원 가입 플로우)
 * 
 * RequestCard 리스트 표시
 * ❌ EmptyState 없음
 * ❌ "요청이 없습니다" 강조 ❌
 * → 그냥 리스트가 비어 있으면 끝
 */

import { useJoinRequests } from "@/hooks/useJoinRequests";
import { RequestCard } from "./RequestCard";
import { useState } from "react";

interface RequestListProps {
  teamId: string;
}

export function RequestList({ teamId }: RequestListProps) {
  const { requests, loading } = useJoinRequests(teamId, { enabled: true });
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  // 처리된 요청 제외
  const visibleRequests = requests.filter((r) => !processedIds.has(r.id));

  const handleApproved = (requestId: string) => {
    setProcessedIds((prev) => new Set([...prev, requestId]));
  };

  const handleRejected = (requestId: string) => {
    setProcessedIds((prev) => new Set([...prev, requestId]));
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (visibleRequests.length === 0) {
    // ❌ EmptyState 없음 - 그냥 빈 화면
    return null;
  }

  return (
    <div className="space-y-4">
      {visibleRequests.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          teamId={teamId}
          onApproved={() => handleApproved(request.id)}
          onRejected={() => handleRejected(request.id)}
        />
      ))}
    </div>
  );
}
