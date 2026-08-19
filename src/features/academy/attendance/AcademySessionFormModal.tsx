import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { AcademySessionRow } from "@/lib/academy/academySessionRead";
import type { AcademySessionStatus } from "@/lib/academy/academySessionReadTypes";
import {
  datetimeLocalToIso,
  sessionValueToDatetimeLocal,
} from "@/features/academy/attendance/academySessionDatetime";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type AcademySessionFormValues = {
  title: string;
  startsAt: string;
  endsAt?: string;
  notes?: string;
  openImmediately?: boolean;
  status?: "scheduled" | "open" | "closed";
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  session?: AcademySessionRow | null;
  saving: boolean;
  onSubmit: (values: AcademySessionFormValues) => Promise<void>;
};

const EDIT_STATUSES: { value: "scheduled" | "open" | "closed"; label: string }[] = [
  { value: "scheduled", label: "예정" },
  { value: "open", label: "출석 진행" },
  { value: "closed", label: "마감" },
];

export function AcademySessionFormModal({
  open,
  onOpenChange,
  mode,
  session,
  saving,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState("");
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [endsAtLocal, setEndsAtLocal] = useState("");
  const [notes, setNotes] = useState("");
  const [openImmediately, setOpenImmediately] = useState(false);
  const [status, setStatus] = useState<"scheduled" | "open" | "closed">("scheduled");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && session) {
      setTitle(session.title || "");
      setStartsAtLocal(sessionValueToDatetimeLocal(session.startsAt));
      setEndsAtLocal(session.endsAt ? sessionValueToDatetimeLocal(session.endsAt) : "");
      setNotes(session.notes || "");
      setOpenImmediately(false);
      const s = session.status;
      setStatus(s === "open" || s === "closed" ? s : "scheduled");
    } else {
      setTitle("");
      setStartsAtLocal("");
      setEndsAtLocal("");
      setNotes("");
      setOpenImmediately(false);
      setStatus("scheduled");
    }
  }, [open, mode, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startsAtLocal) return;
    await onSubmit({
      title: title.trim(),
      startsAt: datetimeLocalToIso(startsAtLocal),
      ...(mode === "create"
        ? endsAtLocal
          ? { endsAt: datetimeLocalToIso(endsAtLocal) }
          : {}
        : { endsAt: endsAtLocal ? datetimeLocalToIso(endsAtLocal) : null }),
      ...(notes.trim() ? { notes: notes.trim() } : mode === "edit" ? { notes: notes.trim() || null } : {}),
      ...(mode === "create" ? { openImmediately } : { status }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "훈련 만들기" : "훈련 수정"}</DialogTitle>
          <DialogDescription>
            팀 훈련 세션을 {mode === "create" ? "등록" : "수정"}합니다. 설명은 notes 필드로 저장됩니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="session-title">제목 *</Label>
            <Input
              id="session-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 주말 훈련"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="session-starts">시작 일시 *</Label>
            <Input
              id="session-starts"
              type="datetime-local"
              value={startsAtLocal}
              onChange={(e) => setStartsAtLocal(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="session-ends">종료 일시 (선택)</Label>
            <Input
              id="session-ends"
              type="datetime-local"
              value={endsAtLocal}
              onChange={(e) => setEndsAtLocal(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="session-notes">설명 (선택)</Label>
            <textarea
              id="session-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="훈련 안내, 장소 등"
            />
          </div>
          {mode === "create" ? (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={openImmediately}
                onChange={(e) => setOpenImmediately(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              지금 바로 출석 시작 (open)
            </label>
          ) : (
            <div className="space-y-1.5">
              <Label>상태</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AcademySessionStatus)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {EDIT_STATUSES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              닫기
            </Button>
            <Button type="submit" disabled={saving || !title.trim() || !startsAtLocal}>
              {saving ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  저장 중…
                </span>
              ) : mode === "create" ? (
                "생성"
              ) : (
                "저장"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
