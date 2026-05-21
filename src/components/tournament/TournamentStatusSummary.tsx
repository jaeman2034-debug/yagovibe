/**
 * 🔥 대회 상태 요약 컴포넌트
 * 참가 신청, 검수 상태, 조 추첨, 경기 생성 상태를 한눈에 표시
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import type { Tournament } from "@/types/tournament";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useState, useEffect } from "react";

interface TournamentStatusSummaryProps {
  associationId: string;
  tournament: Tournament;
}

interface StatusItem {
  label: string;
  status: "completed" | "pending" | "in-progress" | "error";
  message: string;
  timestamp?: string;
  executor?: string;
}

export function TournamentStatusSummary({
  associationId,
  tournament,
}: TournamentStatusSummaryProps) {
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔥 가드: associationId, tournament.id 확인
    if (!associationId || !tournament?.id) {
      setLoading(false);
      return;
    }
    
    const checkStatuses = async () => {
      try {
        const items: StatusItem[] = [];

        // 1️⃣ 참가 신청 상태
        const teamsRef = collection(
          db,
          `associations/${associationId}/tournaments/${tournament.id}/teams`
        );
        const teamsQuery = query(teamsRef, where("status", "in", ["pending", "approved", "rejected"]));
        const teamsSnap = await getDocs(teamsQuery);
        const totalTeams = teamsSnap.size;
        const approvedTeams = teamsSnap.docs.filter((d) => d.data().status === "approved").length;

        const registrationStatus: StatusItem = {
          label: "참가 신청",
          status: tournament.registrationEndDate
            ? new Date(tournament.registrationEndDate) < new Date()
              ? "completed"
              : "in-progress"
            : "in-progress",
          message: `${approvedTeams}팀 승인 완료 (전체 ${totalTeams}팀)`,
        };
        items.push(registrationStatus);

        // 2️⃣ 검수 상태
        const reviewStatus: StatusItem = {
          label: "검수 상태",
          status: tournament.reviewPeriod?.endDate
            ? new Date(tournament.reviewPeriod.endDate) < new Date()
              ? "completed"
              : "in-progress"
            : "pending",
          message: tournament.reviewPeriod?.endDate
            ? `검수 기간: ~${new Date(tournament.reviewPeriod.endDate).toLocaleDateString("ko-KR")}`
            : "검수 기간 미설정",
        };
        items.push(reviewStatus);

        // 3️⃣ 조 추첨 상태
        const drawStatus: StatusItem = {
          label: "조 추첨",
          status: tournament.drawExecuted ? "completed" : "pending",
          message: tournament.drawExecuted
            ? `완료 (${tournament.drawDivisions?.length || 0}조)`
            : "미실행",
          timestamp: tournament.drawExecutedAt
            ? new Date(tournament.drawExecutedAt).toLocaleString("ko-KR")
            : undefined,
        };
        items.push(drawStatus);

        // 4️⃣ 경기 생성 상태
        const matchesRef = collection(
          db,
          `associations/${associationId}/tournaments/${tournament.id}/matches`
        );
        const matchesSnap = await getDocs(matchesRef);
        const matchCount = matchesSnap.size;

        const matchStatus: StatusItem = {
          label: "경기 생성",
          status: matchCount > 0 ? "completed" : "pending",
          message: matchCount > 0 ? `${matchCount}경기 생성 완료` : "미생성",
        };
        items.push(matchStatus);

        // 🔥 5️⃣ 혼합 대회 구조 상태 (리그+토너먼트)
        if (tournament.mixedConfig?.format === "GROUP_TO_KNOCKOUT") {
          // 조별리그 상태
          const groupLeagueStatus: StatusItem = {
            label: "조별리그",
            status:
              tournament.groupLeagueStatus === "completed"
                ? "completed"
                : tournament.groupLeagueStatus === "in_progress"
                ? "in-progress"
                : "pending",
            message:
              tournament.groupLeagueStatus === "completed"
                ? "조별리그 완료"
                : tournament.groupLeagueStatus === "in_progress"
                ? "조별리그 진행중"
                : "조별리그 미시작",
            timestamp: tournament.groupLeagueCompletedAt
              ? new Date(tournament.groupLeagueCompletedAt).toLocaleString("ko-KR")
              : undefined,
          };
          items.push(groupLeagueStatus);

          // 본선 진출팀 확정 상태
          const knockoutQualifiedStatus: StatusItem = {
            label: "본선 진출팀",
            status: tournament.knockoutQualified ? "completed" : "pending",
            message: tournament.knockoutQualified
              ? `${tournament.knockoutQualifiedTeams?.length || 0}팀 진출 확정`
              : "미확정",
            timestamp: tournament.knockoutQualifiedAt
              ? new Date(tournament.knockoutQualifiedAt).toLocaleString("ko-KR")
              : undefined,
          };
          items.push(knockoutQualifiedStatus);

          // 토너먼트 대진 생성 상태
          const knockoutBracketStatus: StatusItem = {
            label: "토너먼트 대진",
            status: tournament.knockoutBracketGenerated ? "completed" : "pending",
            message: tournament.knockoutBracketGenerated
              ? "토너먼트 대진 생성 완료"
              : "미생성",
            timestamp: tournament.knockoutBracketGeneratedAt
              ? new Date(tournament.knockoutBracketGeneratedAt).toLocaleString("ko-KR")
              : undefined,
          };
          items.push(knockoutBracketStatus);
        }

        setStatuses(items);
      } catch (error) {
        console.error("상태 확인 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    checkStatuses();
  }, [associationId, tournament]);

  const getStatusIcon = (status: StatusItem["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "in-progress":
        return <Clock className="w-5 h-5 text-blue-600" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: StatusItem["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-50 border-green-200";
      case "in-progress":
        return "bg-blue-50 border-blue-200";
      case "error":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-gray-500">상태 확인 중...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">대회 상태 요약</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {statuses.map((item, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getStatusColor(item.status)}`}
            >
              <div className="flex items-start gap-3">
                {getStatusIcon(item.status)}
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-900 mb-1">
                    {item.label}
                  </div>
                  <div className="text-sm text-gray-700">{item.message}</div>
                  {item.timestamp && (
                    <div className="text-xs text-gray-500 mt-1">
                      {item.timestamp}
                    </div>
                  )}
                  {item.executor && (
                    <div className="text-xs text-gray-500 mt-1">
                      실행자: {item.executor}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

