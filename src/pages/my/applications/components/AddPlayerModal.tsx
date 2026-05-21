/**
 * 선수 추가/수정 모달
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { RosterPlayer } from "@/hooks/useRoster";

interface AddPlayerModalProps {
  player?: RosterPlayer | null;
  onClose: () => void;
  onSave: () => void;
  applicationId: string;
}

export function AddPlayerModal({
  player,
  onClose,
  onSave,
  applicationId,
}: AddPlayerModalProps) {
  const [name, setName] = useState(player?.name || "");
  const [birthDate, setBirthDate] = useState(player?.birthDate || "");
  const [position, setPosition] = useState(player?.position || "");
  const [phone, setPhone] = useState(player?.phone || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (player) {
      setName(player.name);
      setBirthDate(player.birthDate);
      setPosition(player.position || "");
      setPhone(player.phone || "");
    }
  }, [player]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !birthDate) {
      toast.error("이름과 생년월일은 필수입니다.");
      return;
    }

    try {
      setSaving(true);

      // TODO: rosterRepository.addPlayer 또는 updatePlayer 호출
      // await addPlayer(applicationId, {
      //   name: name.trim(),
      //   birthDate,
      //   position: position || undefined,
      //   phone: phone || undefined,
      // });

      toast.success(player ? "선수 정보가 수정되었습니다." : "선수가 추가되었습니다.");
      onSave();
    } catch (error) {
      console.error("[선수 추가] 실패:", error);
      toast.error("선수 추가에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{player ? "선수 정보 수정" : "선수 추가"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                생년월일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">포지션</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">선택 안 함</option>
                <option value="GK">GK</option>
                <option value="DF">DF</option>
                <option value="MF">MF</option>
                <option value="FW">FW</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">연락처</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={saving}
              >
                취소
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? "저장 중..." : player ? "수정" : "추가"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
