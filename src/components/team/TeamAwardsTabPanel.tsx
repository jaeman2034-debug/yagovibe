import { useCallback, useState, type ReactNode } from "react";
import { Trophy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeamAward } from "@/types/teamSummary";
import { createTeamAward, deleteTeamAward } from "@/services/teamSummaryService";

export type TeamAwardsTabPanelProps = {
  teamId: string;
  awards: TeamAward[];
  canManage: boolean;
  onChanged: () => void;
  formatDate: (value: TeamAward["awardedAt"]) => string;
};

const AWARD_TYPES: { value: TeamAward["awardType"]; label: string }[] = [
  { value: "champion", label: "우승" },
  { value: "runner_up", label: "준우승" },
  { value: "semifinalist", label: "4강" },
  { value: "fair_play", label: "페어플레이" },
];

export function TeamAwardsTabPanel({
  teamId,
  awards,
  canManage,
  onChanged,
  formatDate,
}: TeamAwardsTabPanelProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [awardType, setAwardType] = useState<TeamAward["awardType"]>("champion");
  const [awardedOn, setAwardedOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setTitle("");
    setAwardType("champion");
    setAwardedOn(new Date().toISOString().slice(0, 10));
  }, []);

  const handleAdd = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("수상 제목을 입력해 주세요.");
      return;
    }
    const date = new Date(awardedOn);
    if (Number.isNaN(date.getTime())) {
      toast.error("수상 일자를 확인해 주세요.");
      return;
    }
    setSaving(true);
    try {
      await createTeamAward({ teamId, title: trimmed, awardType, awardedAt: date });
      toast.success("수상 기록을 추가했어요.");
      setAddOpen(false);
      resetForm();
      onChanged();
    } catch (e) {
      console.error("[TeamAwardsTabPanel] create", e);
      toast.error("수상 추가에 실패했어요. 권한을 확인해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (award: TeamAward) => {
    if (!window.confirm(`「${award.title}」 수상 기록을 삭제할까요?`)) return;
    setDeletingId(award.id);
    try {
      await deleteTeamAward(award.id);
      toast.success("삭제했어요.");
      onChanged();
    } catch (e) {
      console.error("[TeamAwardsTabPanel] delete", e);
      toast.error("삭제에 실패했어요.");
    } finally {
      setDeletingId(null);
    }
  };

  const addDialog = (
    <AddAwardDialog
      open={addOpen}
      onOpenChange={setAddOpen}
      title={title}
      setTitle={setTitle}
      awardType={awardType}
      setAwardType={setAwardType}
      awardedOn={awardedOn}
      setAwardedOn={setAwardedOn}
      saving={saving}
      onSubmit={handleAdd}
    />
  );

  if (awards.length === 0) {
    return (
      <AwardsEmptyState canManage={canManage} onAdd={() => setAddOpen(true)}>
        {addDialog}
      </AwardsEmptyState>
    );
  }

  return (
    <>
      {canManage ? (
        <AwardsToolbar onAdd={() => setAddOpen(true)} />
      ) : null}
      <div className="space-y-4">
        {awards.map((award) => (
          <AwardRow
            key={award.id}
            award={award}
            formatDate={formatDate}
            canManage={canManage}
            deleting={deletingId === award.id}
            onDelete={() => void handleDelete(award)}
          />
        ))}
      </div>
      {addDialog}
    </>
  );
}

function AwardsEmptyState({
  canManage,
  onAdd,
  children,
}: {
  canManage: boolean;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <div className="py-8 text-center">
      <Trophy className="mx-auto mb-3 h-10 w-10 text-amber-400" />
      <p className="text-gray-500">수상 기록이 없습니다.</p>
      {canManage ? (
        <Button type="button" className="mt-4 gap-1.5" onClick={onAdd}>
          <Plus className="h-4 w-4" aria-hidden />
          수상 추가
        </Button>
      ) : null}
      {children}
    </div>
  );
}

function AwardsToolbar({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mb-4 flex justify-end">
      <Button type="button" size="sm" className="gap-1.5" onClick={onAdd}>
        <Plus className="h-4 w-4" aria-hidden />
        수상 추가
      </Button>
    </div>
  );
}

function AwardRow({
  award,
  formatDate,
  canManage,
  deleting,
  onDelete,
}: {
  award: TeamAward;
  formatDate: (value: TeamAward["awardedAt"]) => string;
  canManage: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 p-4">
      <Trophy className="h-8 w-8 shrink-0 text-yellow-600" />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-gray-900">{award.title?.trim() || "수상"}</div>
        <div className="mt-1 text-sm text-gray-600">{formatDate(award.awardedAt)}</div>
      </div>
      {canManage ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
          disabled={deleting}
          aria-label="수상 삭제"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

type AddAwardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  setTitle: (v: string) => void;
  awardType: TeamAward["awardType"];
  setAwardType: (v: TeamAward["awardType"]) => void;
  awardedOn: string;
  setAwardedOn: (v: string) => void;
  saving: boolean;
  onSubmit: () => void;
};

function AddAwardDialog({
  open,
  onOpenChange,
  title,
  setTitle,
  awardType,
  setAwardType,
  awardedOn,
  setAwardedOn,
  saving,
  onSubmit,
}: AddAwardDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>수상 추가</DialogTitle>
          <DialogDescription>대회·리그 수상 내역을 팀 페이지에 표시합니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="award-title">수상 제목</Label>
            <Input
              id="award-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 2026 봄 리그 우승"
            />
          </div>
          <div className="space-y-2">
            <Label>유형</Label>
            <Select value={awardType} onValueChange={(v) => setAwardType(v as TeamAward["awardType"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AWARD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="award-date">수상 일자</Label>
            <Input
              id="award-date"
              type="date"
              value={awardedOn}
              onChange={(e) => setAwardedOn(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="button" disabled={saving} onClick={() => void onSubmit()}>
            {saving ? "저장 중…" : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
