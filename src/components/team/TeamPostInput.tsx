import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createTeamWallActivity } from "@/services/activity/activityFactory";

const MAX_LEN = 2000;
const TITLE_MAX = 200;

interface TeamPostInputProps {
  teamId: string;
  sport: string;
  onPosted?: () => void;
}

export default function TeamPostInput({ teamId, sport, onPosted }: TeamPostInputProps) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const trimmed = text.trim();
  const canSubmit = Boolean(user?.uid && teamId?.trim() && trimmed.length > 0 && !submitting);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user?.uid) return;

    setSubmitting(true);
    try {
      const body = trimmed.slice(0, MAX_LEN);
      const title = body.slice(0, TITLE_MAX);
      const summary = body.length > TITLE_MAX ? body.slice(TITLE_MAX) : undefined;

      await createTeamWallActivity({
        teamId: teamId.trim(),
        authorId: user.uid,
        authorName: user.displayName || undefined,
        title: title || "(내용 없음)",
        summary,
        sport: sport?.trim() || "soccer",
      });

      setText("");
      toast.success("팀 타임라인에 등록했습니다.");
      onPosted?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "등록에 실패했습니다.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user?.uid) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
        로그인한 팀원만 팀 타임라인에 글을 남길 수 있습니다.
      </p>
    );
  }

  return (
    <form onSubmit={(ev) => void handleSubmit(ev)} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
        placeholder="팀원에게만 보이는 공지·안내를 입력하세요"
        rows={3}
        disabled={submitting}
        className="resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
      />
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
        <span className="text-[11px] text-gray-400">
          {trimmed.length}/{MAX_LEN}
        </span>
        <Button type="submit" size="sm" disabled={!canSubmit}>
          {submitting ? "등록 중…" : "등록"}
        </Button>
      </div>
    </form>
  );
}
