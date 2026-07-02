import { Link } from "react-router-dom";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  className?: string;
};

/** I-2.1 — Hub VOC interview entry */
export function HubVocInterviewCard({ className }: Props) {
  return (
    <div
      className={`rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm ${className ?? ""}`}
      data-testid="hub-voc-interview-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-violet-950">💬 인터뷰</p>
          <p className="mt-1 text-xs text-violet-900/90">
            코치 · 운영자 · 학부모 VOC · 🎤 STT · Dashboard · Interview Table v1
          </p>
        </div>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
          NEW
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm" className="gap-1.5 bg-violet-700 hover:bg-violet-600">
          <Link to="/hub/interviews/new">
            <MessageSquarePlus className="h-4 w-4" />
            + 인터뷰 등록
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="border-violet-300">
          <Link to="/hub/interviews?tab=dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
