/**
 * 출전 명단 섹션
 * 팀별 좌우 분리, 선발/교체 표시
 */

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Match, MatchPlayer } from "@/types/tournament";
import { Users, UserPlus, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface MatchLineupSectionProps {
  match: Match;
  onUpdate: (updates: Partial<Match>) => Promise<void>;
}

export function MatchLineupSection({ match, onUpdate }: MatchLineupSectionProps) {
  const homePlayers = match.homePlayers || [];
  const awayPlayers = match.awayPlayers || [];

  const getVerificationIcon = (status: MatchPlayer["verificationStatus"]) => {
    switch (status) {
      case "verified":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "pending":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getVerificationLabel = (status: MatchPlayer["verificationStatus"]) => {
    switch (status) {
      case "verified":
        return "완료";
      case "pending":
        return "미검";
      case "rejected":
        return "불가";
    }
  };

  const renderPlayerRow = (player: MatchPlayer) => {
    return (
      <div
        key={player.id}
        className="flex items-center justify-between p-2 rounded border hover:bg-gray-50"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="font-mono font-semibold w-8 text-center">
            {player.jerseyNumber}
          </div>
          <div className="flex-1">
            <div className="font-medium">{player.name}</div>
            {player.position && (
              <div className="text-xs text-muted-foreground">{player.position}</div>
            )}
          </div>
          <Badge variant={player.role === "starter" ? "default" : "outline"} className="text-xs">
            {player.role === "starter" ? "선발" : "교체"}
          </Badge>
          <div className="flex items-center gap-1">
            {getVerificationIcon(player.verificationStatus)}
            <span className="text-xs text-muted-foreground">
              {getVerificationLabel(player.verificationStatus)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="rounded-xl">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5" />
          <h2 className="text-lg font-semibold">출전 명단</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 홈팀 */}
          <div>
            <div className="font-semibold mb-3 text-center border-b pb-2">
              {match.homeSlot?.teamName || match.teamA || "홈팀"}
            </div>
            <div className="space-y-1">
              {homePlayers.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  출전 명단이 등록되지 않았습니다.
                </div>
              ) : (
                homePlayers.map(renderPlayerRow)
              )}
            </div>
          </div>

          {/* 원정팀 */}
          <div>
            <div className="font-semibold mb-3 text-center border-b pb-2">
              {match.awaySlot?.teamName || match.teamB || "원정팀"}
            </div>
            <div className="space-y-1">
              {awayPlayers.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  출전 명단이 등록되지 않았습니다.
                </div>
              ) : (
                awayPlayers.map(renderPlayerRow)
              )}
            </div>
          </div>
        </div>

        {/* 명단 추가 버튼 (나중에 구현) */}
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" disabled>
            <UserPlus className="w-4 h-4 mr-2" />
            명단 추가
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

