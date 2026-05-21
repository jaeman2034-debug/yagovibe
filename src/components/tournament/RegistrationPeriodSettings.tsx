/**
 * 🔥 참가 신청 기간 설정 UI (관리자용)
 * 
 * 커서 지시문 1️⃣, 2️⃣ 기반:
 * - 신청 시작일/마감일 설정
 * - 명단 수정 마감일 설정 (선택)
 * - 사무국 요청에 의한 제한적 수정 허용 여부
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Save, Calendar, Info } from "lucide-react";
import type { Tournament } from "@/types/tournament";

interface RegistrationPeriodSettingsProps {
  associationId: string;
  tournamentId: string;
  tournament: Tournament;
  onSave?: () => void;
}

export function RegistrationPeriodSettings({
  associationId,
  tournamentId,
  tournament,
  onSave,
}: RegistrationPeriodSettingsProps) {
  const [saving, setSaving] = useState(false);
  
  // 기본값 설정
  const [startDate, setStartDate] = useState(
    tournament.registrationPeriod?.startDate || ""
  );
  const [endDate, setEndDate] = useState(
    tournament.registrationPeriod?.endDate || ""
  );
  const [rosterEditDeadline, setRosterEditDeadline] = useState(
    tournament.registrationPeriod?.rosterEditDeadline || ""
  );
  const [allowLateEdit, setAllowLateEdit] = useState(
    tournament.registrationPeriod?.allowLateEdit ?? false
  );

  // 대회 시작일 기준 기본값 설정
  useEffect(() => {
    if (!startDate && tournament.startDate) {
      // 대회 시작 2주 전을 신청 시작일로
      const start = new Date(tournament.startDate);
      start.setDate(start.getDate() - 14);
      setStartDate(start.toISOString().split("T")[0]);
    }
    if (!endDate && tournament.startDate) {
      // 대회 시작 3일 전을 신청 마감일로
      const end = new Date(tournament.startDate);
      end.setDate(end.getDate() - 3);
      setEndDate(end.toISOString().split("T")[0]);
    }
  }, [tournament.startDate, startDate, endDate]);

  // 저장
  const handleSave = async () => {
    if (!startDate || !endDate) {
      return toast.error("신청 시작일과 마감일은 필수입니다.");
    }

    if (new Date(startDate) > new Date(endDate)) {
      return toast.error("시작일이 마감일보다 늦을 수 없습니다.");
    }

    if (rosterEditDeadline && new Date(rosterEditDeadline) < new Date(endDate)) {
      return toast.error("명단 수정 마감일은 신청 마감일 이후여야 합니다.");
    }

    setSaving(true);
    try {
      const tournamentRef = doc(
        db,
        `associations/${associationId}/tournaments/${tournamentId}`
      );

      await updateDoc(tournamentRef, {
        registrationPeriod: {
          startDate,
          endDate,
          rosterEditDeadline: rosterEditDeadline || null,
          allowLateEdit,
        },
        updatedAt: new Date(),
      });

      toast.success("신청 기간 설정이 저장되었습니다.");
      onSave?.();
    } catch (error: any) {
      console.error("저장 실패:", error);
      toast.error(`저장 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          참가 신청 기간 설정
        </CardTitle>
        <CardDescription>
          참가 신청 및 선수 명단 수정 가능 기간을 설정합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 신청 기간 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">신청 시작일 *</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">신청 마감일 *</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* 명단 수정 마감일 */}
        <div className="space-y-2">
          <Label htmlFor="rosterEditDeadline">명단 수정 마감일 (선택)</Label>
          <Input
            id="rosterEditDeadline"
            type="date"
            value={rosterEditDeadline}
            onChange={(e) => setRosterEditDeadline(e.target.value)}
            placeholder="미설정 시 신청 마감일과 동일"
          />
          <p className="text-xs text-muted-foreground">
            미설정 시 신청 마감일과 동일하게 적용됩니다.
          </p>
        </div>

        {/* 제한적 수정 허용 */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="allowLateEdit"
            checked={allowLateEdit}
            onCheckedChange={(checked) => setAllowLateEdit(checked === true)}
          />
          <Label htmlFor="allowLateEdit" className="cursor-pointer">
            마감 후 사무국 요청에 의한 제한적 수정 허용
          </Label>
        </div>

        {/* 안내 메시지 */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">기간 설정 안내</p>
              <ul className="list-disc list-inside text-xs space-y-1">
                <li>신청 기간 내에만 새로운 참가 신청이 가능합니다.</li>
                <li>신청 마감 후에는 신규 신청이 불가합니다.</li>
                <li>선수 명단은 명단 수정 마감일까지 수정 가능합니다.</li>
                <li>"제한적 수정 허용" 시 마감 후에도 사무국 보완 요청에 한해 수정 가능합니다.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "저장 중..." : "기간 설정 저장"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

