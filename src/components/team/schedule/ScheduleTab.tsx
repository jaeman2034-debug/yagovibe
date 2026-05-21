/**
 * 🔥 일정 탭 컴포넌트 (완전판)
 * 
 * Props:
 * - teamId: 팀 ID
 * - isOwner: 운영자 여부
 * 
 * 하위 라우트:
 * - /sports/{type}/team/schedule → 일정 목록 (기본)
 * - /sports/{type}/team/schedule/new → 일정 생성
 * - /sports/{type}/team/schedule/{id} → 일정 상세
 */

import { Routes, Route, Navigate } from "react-router-dom";
import { ScheduleList } from "./ScheduleList";
import { ScheduleCreateForm } from "./ScheduleCreateForm";
import { ScheduleDetail } from "./ScheduleDetail";

interface ScheduleTabProps {
  teamId: string;
  isOwner: boolean;
}

export function ScheduleTab({ teamId, isOwner }: ScheduleTabProps) {
  return (
    <Routes>
      <Route index element={<ScheduleList teamId={teamId} />} />
      <Route
        path="new"
        element={
          isOwner ? (
            <ScheduleCreateForm teamId={teamId} />
          ) : (
            <Navigate to=".." replace />
          )
        }
      />
      <Route path=":id" element={<ScheduleDetail teamId={teamId} />} />
    </Routes>
  );
}
