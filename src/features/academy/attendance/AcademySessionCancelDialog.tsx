import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionTitle?: string;
  saving: boolean;
  onConfirm: () => Promise<void>;
};

export function AcademySessionCancelDialog({
  open,
  onOpenChange,
  sessionTitle,
  saving,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>훈련 세션 취소</DialogTitle>
          <DialogDescription className="space-y-2 pt-1 text-left">
            {sessionTitle ? (
              <span className="block font-medium text-gray-900">{sessionTitle}</span>
            ) : null}
            <span className="block">이 훈련 세션을 취소하시겠습니까?</span>
            <span className="block text-gray-600">기존 출석 기록은 유지됩니다.</span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            유지
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={saving}
            onClick={() => {
              void onConfirm()
                .then(() => onOpenChange(false))
                .catch(() => {
                  /* toast shown by mutation hook */
                });
            }}
          >
            {saving ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                취소 중…
              </span>
            ) : (
              "세션 취소"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
