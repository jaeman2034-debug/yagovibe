/**
 * 공개 팀 허브 — SNS 홍보문 카드 (복사·공유용)
 */
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TeamSocialPostShareCardProps = {
  socialPost: string;
  dark?: boolean;
};

export function TeamSocialPostShareCard({ socialPost, dark = false }: TeamSocialPostShareCardProps) {
  const text = socialPost.trim();
  const [copied, setCopied] = useState(false);
  if (!text) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("SNS 홍보문을 복사했어요.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("복사에 실패했어요. 직접 선택해 복사해 주세요.");
    }
  };

  return (
    <section
      className={cn(
        "rounded-lg border px-4 py-3 sm:px-5 sm:py-4",
        dark
          ? "border-slate-600/80 bg-slate-800/50 text-slate-100"
          : "border-slate-200 bg-slate-50 text-slate-800"
      )}
      aria-label="SNS 공유"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          className={cn(
            "text-sm font-semibold tracking-tight",
            dark ? "text-slate-100" : "text-gray-900"
          )}
        >
          SNS 공유
        </h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn("h-8 gap-1 text-xs", dark ? "border-slate-500 text-slate-100" : "")}
          onClick={() => void handleCopy()}
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          {copied ? "복사됨" : "복사"}
        </Button>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed sm:text-base">{text}</p>
    </section>
  );
}
