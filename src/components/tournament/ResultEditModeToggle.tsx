/**
 * 🔥 FINAL+ 단계: 결과 수정 모드 토글 컴포넌트
 * 
 * 관리자가 결과 수정 모드를 활성화/비활성화할 수 있는 토글
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";
import { Lock, Unlock, Loader2 } from "lucide-react";
import type { Tournament } from "@/types/tournament";

interface ResultEditModeToggleProps {
  associationId: string;
  tournament: Tournament;
  onToggle?: (enabled: boolean) => void;
}

export function ResultEditModeToggle({
  associationId,
  tournament,
  onToggle,
}: ResultEditModeToggleProps) {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(tournament.resultEditEnabled === true);

  const handleToggle = async (newEnabled: boolean) => {
    if (
      !confirm(
        newEnabled
          ? "결과 수정 모드를 활성화하시겠습니까?\n\n완료된 경기 결과를 수정할 수 있게 됩니다."
          : "결과 수정 모드를 비활성화하시겠습니까?\n\n완료된 경기 결과를 수정할 수 없게 됩니다."
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const functions = getFunctions(app, "asia-northeast3");
      const toggleMode = httpsCallable(functions, "toggleResultEditModeCallable");

      await toggleMode({
        associationId,
        tournamentId: tournament.id,
        enabled: newEnabled,
      });

      setEnabled(newEnabled);
      toast.success(
        newEnabled
          ? "결과 수정 모드가 활성화되었습니다."
          : "결과 수정 모드가 비활성화되었습니다."
      );

      if (onToggle) {
        onToggle(newEnabled);
      }
    } catch (error: any) {
      console.error("[결과 수정 모드 토글] 실패:", error);
      toast.error(error?.message || "결과 수정 모드 변경에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {enabled ? (
            <Unlock className="w-5 h-5 text-green-600" />
          ) : (
            <Lock className="w-5 h-5 text-gray-400" />
          )}
          결과 수정 모드
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 🔥 경고 배너 (수정 모드 ON일 때) */}
        {enabled && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800 font-semibold">
              ⚠️ 결과 수정 모드 활성화
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              모든 수정 사항은 감사 로그에 기록됩니다.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="result-edit-mode" className="text-sm font-medium">
              완료된 경기 결과 수정 허용
            </Label>
            <p className="text-xs text-gray-500">
              {enabled
                ? "완료된 경기 결과를 수정할 수 있습니다. (감사 로그에 기록됩니다)"
                : "완료된 경기 결과는 수정할 수 없습니다. (운영 안정성)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={enabled ? "default" : "secondary"}>
              {enabled ? "활성화" : "비활성화"}
            </Badge>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              <Switch
                id="result-edit-mode"
                checked={enabled}
                onCheckedChange={handleToggle}
                disabled={loading}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
