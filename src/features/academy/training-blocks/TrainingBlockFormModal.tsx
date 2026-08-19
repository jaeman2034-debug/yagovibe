import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TrainingBlockRow } from "@/features/academy/training-blocks/mutations/trainingBlockCallables";
import { useEffect, useState } from "react";

export type TrainingBlockFormValues = {
  title: string;
  description: string;
  videoUrl: string;
  coachNotes: string;
  publish: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  block: TrainingBlockRow | null;
  saving: boolean;
  onSubmit: (values: TrainingBlockFormValues) => Promise<void>;
};

const emptyValues: TrainingBlockFormValues = {
  title: "",
  description: "",
  videoUrl: "",
  coachNotes: "",
  publish: false,
};

export function TrainingBlockFormModal({ open, onOpenChange, mode, block, saving, onSubmit }: Props) {
  const [values, setValues] = useState<TrainingBlockFormValues>(emptyValues);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && block) {
      setValues({
        title: block.title ?? "",
        description: block.description ?? "",
        videoUrl: block.videoUrl ?? "",
        coachNotes: block.coachNotes ?? "",
        publish: block.status === "published",
      });
    } else {
      setValues(emptyValues);
    }
  }, [open, mode, block]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "훈련 블록 만들기" : "훈련 블록 수정"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="tb-title">제목</Label>
            <Input
              id="tb-title"
              value={values.title}
              onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
              placeholder="드릴 / 훈련 이름"
            />
          </div>
          <div>
            <Label htmlFor="tb-video">영상 URL (YouTube / Vimeo)</Label>
            <Input
              id="tb-video"
              value={values.videoUrl}
              onChange={(e) => setValues((v) => ({ ...v, videoUrl: e.target.value }))}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <p className="mt-1 text-xs text-gray-500">
              유튜브·비메오 공개/일부공개 링크만 사용하세요.
            </p>
          </div>
          <div>
            <Label htmlFor="tb-desc">설명 (선택)</Label>
            <Textarea
              id="tb-desc"
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="tb-notes">코치 메모 (선택, 보호자 비공개)</Label>
            <Textarea
              id="tb-notes"
              value={values.coachNotes}
              onChange={(e) => setValues((v) => ({ ...v, coachNotes: e.target.value }))}
              rows={2}
            />
          </div>
          {mode === "edit" && block?.status !== "published" ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.publish}
                onChange={(e) => setValues((v) => ({ ...v, publish: e.target.checked }))}
              />
              유효한 영상 URL로 게시 (draft → published)
            </label>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            취소
          </Button>
          <Button
            disabled={saving || !values.title.trim()}
            onClick={() => void onSubmit(values)}
          >
            {saving ? "저장 중…" : mode === "create" ? "만들기" : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
