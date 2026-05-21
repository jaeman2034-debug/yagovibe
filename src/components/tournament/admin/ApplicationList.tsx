/**
 * 🔥 ApplicationList - 참가 신청 목록 (관리자용)
 * 
 * 신청 카드 리스트 표시
 * ❌ EmptyState 없음
 * ❌ "신청이 없습니다" 강조 ❌
 * → 그냥 리스트가 비어 있으면 끝
 */

import { useTournamentApplications } from "@/hooks/useTournamentApplications";
import { ApplicationCard } from "./ApplicationCard";
import { useState } from "react";

interface ApplicationListProps {
  associationId: string;
  tournamentId: string;
}

export function ApplicationList({
  associationId,
  tournamentId,
}: ApplicationListProps) {
  const { applications, loading } = useTournamentApplications(
    associationId,
    tournamentId,
    { enabled: true }
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const handleStatusChanged = () => {
    // 상태 변경 후 목록 새로고침
    setRefreshKey((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (applications.length === 0) {
    // ❌ EmptyState 없음 - 그냥 빈 화면
    return null;
  }

  return (
    <div className="space-y-4">
      {applications.map((application) => (
        <ApplicationCard
          key={application.id}
          application={application}
          associationId={associationId}
          tournamentId={tournamentId}
          onStatusChanged={handleStatusChanged}
        />
      ))}
    </div>
  );
}
