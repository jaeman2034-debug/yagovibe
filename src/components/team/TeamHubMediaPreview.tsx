import { useEffect, useState } from "react";
import { Image, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMediaByEntity } from "@/services/mediaService";
import type { Media } from "@/types/media";

export type TeamHubMediaPreviewProps = {
  teamId: string;
  dark?: boolean;
  /** 기본 6 */
  maxPhotos?: number;
  onViewAll: () => void;
};

export function TeamHubMediaPreview({ teamId, dark = false, maxPhotos = 6, onViewAll }: TeamHubMediaPreviewProps) {
  const [photos, setPhotos] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const tid = teamId.trim();
    if (!tid) {
      setPhotos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        const list = await getMediaByEntity("team", tid, { type: "photo", limitCount: maxPhotos });
        if (!cancelled) setPhotos(list.filter((m) => m.type === "photo"));
      } catch (e) {
        console.error("[TeamHubMediaPreview]", e);
        if (!cancelled) setPhotos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamId, maxPhotos]);

  if (loading) {
    return (
      <section
        className={cn(
          "rounded-xl border p-4 sm:p-5",
          dark ? "border-slate-600/80 bg-slate-800/25 text-slate-200" : "border-gray-200 bg-white/95"
        )}
        aria-busy="true"
        aria-label="활동 사진"
      >
        <div className="flex items-center gap-2 text-sm opacity-80">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          사진을 불러오는 중…
        </div>
      </section>
    );
  }

  if (photos.length === 0) return null;

  return (
    <section
      className={cn(
        "rounded-xl border p-4 shadow-sm",
        dark ? "border-slate-600/80 bg-slate-800/35 text-slate-100" : "border-gray-200 bg-white/95 text-gray-900"
      )}
      aria-label="최근 활동 사진"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Image className={cn("h-4 w-4 shrink-0", dark ? "text-slate-300" : "text-gray-600")} aria-hidden />
          <h2 className={cn("text-sm font-semibold tracking-tight", dark ? "text-slate-100" : "text-gray-900")}>
            최근 활동 사진
          </h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 text-xs font-medium",
            dark ? "text-violet-200 hover:bg-white/10" : "text-indigo-700 hover:bg-indigo-50"
          )}
          onClick={onViewAll}
        >
          더 보기
        </Button>
      </div>
      <div
        className={cn(
          "mt-3 grid gap-2 sm:gap-2.5",
          photos.length <= 2 ? "grid-cols-2" : photos.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3"
        )}
      >
        {photos.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={onViewAll}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-lg border text-left outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-violet-500",
              dark ? "border-slate-600/80 bg-slate-900/50 ring-offset-slate-900" : "border-gray-100 bg-gray-100 ring-offset-white"
            )}
          >
            <img
              src={m.thumbnailUrl || m.url}
              alt={m.title || "팀 활동 사진"}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
            <span className="sr-only">미디어 탭에서 크게 보기</span>
          </button>
        ))}
      </div>
    </section>
  );
}
