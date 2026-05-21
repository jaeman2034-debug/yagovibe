import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, X } from "lucide-react";
import { resolveSportSlugForCreate } from "@/components/fab/fabWriteRouteUtils";

interface CreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sport?: string;
}

type CreateType = "sale" | "share" | "lost" | "ai";
type ModalStep = "root" | "trade";
type RootAction = "trade" | "match" | "recruit" | "team";

const LS_ROOT = "yago:v1:createModal:rootChoice";

function persistRoot(key: string) {
  try {
    localStorage.setItem(LS_ROOT, key);
  } catch {
    /* ignore */
  }
}

function readLs(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** 거래(trade)는 항상 0번, 그 다음에 최근 선택을 둔다 */
function orderWithRecentFirst<T extends { key: string }>(
  items: T[],
  recentKey: string | null,
  pinnedKey = "trade"
): T[] {
  const copy = [...items];
  const pinIdx = copy.findIndex((x) => x.key === pinnedKey);
  if (pinIdx <= 0 && copy[0]?.key === pinnedKey) {
    if (!recentKey || recentKey === pinnedKey) return copy;
    const rIdx = copy.findIndex((x) => x.key === recentKey);
    if (rIdx <= 0) return copy;
    const [r] = copy.splice(rIdx, 1);
    copy.splice(1, 0, r);
    return copy;
  }
  return copy;
}

export function CreateModal({ open, onOpenChange, sport }: CreateModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<ModalStep>("root");

  const pathname = location.pathname;
  const isHub = pathname === "/hub";
  const isSport = pathname.startsWith("/sports/");
  const isMarket = pathname.includes("/market");
  const targetSport = resolveSportSlugForCreate(pathname, sport);

  const from: "hub" | "category" | "market" = isHub ? "hub" : isMarket ? "market" : isSport ? "category" : "hub";

  useEffect(() => {
    if (open) setStep("root");
  }, [open]);

  const rootRows = useMemo(() => {
    const last = readLs(LS_ROOT);
    const base = [
      {
        key: "trade",
        icon: "📦",
        title: "거래",
        description: "판매·나눔·유실물 등록",
        action: "trade" as const,
      },
      {
        key: "match",
        icon: "🏆",
        title: "경기",
        description: "경기 매칭 글 작성",
        action: "match" as const,
      },
      {
        key: "recruit",
        icon: "⚡",
        title: "활동",
        description: "모집·활동 글 작성",
        action: "recruit" as const,
      },
      {
        key: "team",
        icon: "👥",
        title: "팀",
        description: "팀 만들기",
        action: "team" as const,
      },
    ];
    return orderWithRecentFirst(base, last, "trade");
  }, [open]);

  if (!open) return null;

  const go = (path: string, state?: { from: "hub" | "category" | "market"; sport?: string }) => {
    onOpenChange(false);
    navigate(path, state ? { state } : undefined);
  };

  const sportSeg = encodeURIComponent(targetSport);

  const buildMarketCreatePath = (type: CreateType): string => {
    if (type === "ai") return `/sports/${sportSeg}/market/ai-create`;
    const params = new URLSearchParams();
    params.set("type", type);
    if (isMarket) {
      const mc = new URLSearchParams(location.search).get("category");
      if (mc && ["equipment", "recruit", "match", "all"].includes(mc)) {
        params.set("listCategory", mc);
      }
    }
    return `/sports/${sportSeg}/market/create?${params.toString()}`;
  };

  const handleMove = (type: CreateType) => {
    if (type === "ai") {
      go(buildMarketCreatePath("ai"), { from, sport: targetSport });
      return;
    }
    go(buildMarketCreatePath(type), { from, sport: targetSport });
  };

  const navigateFromRoot = (action: RootAction) => {
    persistRoot(action);
    if (action === "trade") {
      setStep("trade");
      return;
    }
    if (action === "match") {
      go(`/sports/${sportSeg}/match/create`, { from, sport: targetSport });
      return;
    }
    if (action === "recruit") {
      go(`/sports/${sportSeg}/recruit/create`, { from, sport: targetSport });
      return;
    }
    go(`/team/create?sport=${encodeURIComponent(targetSport)}`, { from, sport: targetSport });
  };

  type Variant = "default" | "accent";

  const btnNeutral =
    "w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-gray-300 hover:bg-gray-50 hover:shadow-md active:scale-[0.99]";

  const OptionCard = ({
    icon,
    title,
    description,
    onClick,
    variant = "default",
  }: {
    icon: string;
    title: string;
    description: string;
    onClick: () => void;
    variant?: Variant;
  }) => {
    const wrap =
      variant === "accent"
        ? "w-full rounded-xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 via-white to-purple-50/80 p-4 text-left shadow-md transition hover:border-violet-400 hover:shadow-lg active:scale-[0.99]"
        : btnNeutral;

    const iconCls = variant === "accent" ? "text-[28px] leading-none" : "text-2xl leading-none";

    const titleCls =
      variant === "accent" ? "text-base font-semibold text-violet-900" : "text-[15px] font-semibold text-gray-900";

    const descCls = variant === "accent" ? "text-sm text-violet-700/90" : "text-sm text-gray-500";

    const arrowCls = variant === "accent" ? "text-violet-500" : "text-gray-400";

    return (
      <button onClick={onClick} className={wrap} type="button">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className={`shrink-0 ${iconCls}`} aria-hidden>
              {icon}
            </span>
            <div className="min-w-0">
              <div className={titleCls}>{title}</div>
              <div className={`mt-0.5 ${descCls}`}>{description}</div>
            </div>
          </div>
          <span className={`shrink-0 text-lg font-light ${arrowCls}`} aria-hidden>
            →
          </span>
        </div>
      </button>
    );
  };

  return (
    <div
      className="animate-fadeIn fixed inset-0 z-[100000] flex items-center justify-center bg-black/45 p-4"
      onClick={() => onOpenChange(false)}
      role="presentation"
    >
      <div
        className="animate-scaleIn w-full max-w-md rounded-2xl border border-white/60 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={step === "trade" ? "거래 유형 선택" : "글쓰기 모달"}
      >
        <div className="mb-4 grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-1">
          {step === "trade" ? (
            <button
              type="button"
              onClick={() => setStep("root")}
              className="justify-self-start rounded-full p-1.5 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
              aria-label="뒤로"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : (
            <span aria-hidden className="inline-block w-9" />
          )}
          <h2 className="min-w-0 truncate text-center text-lg font-bold tracking-tight text-gray-900">
            {step === "trade" ? "거래 등록" : "글쓰기"}
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="justify-self-end rounded-full p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[80vh] space-y-3 overflow-y-auto pr-1">
          {step === "root" &&
            rootRows.map((row) => (
              <OptionCard
                key={row.key}
                icon={row.icon}
                title={row.title}
                description={row.description}
                onClick={() => navigateFromRoot(row.action)}
              />
            ))}

          {step === "trade" && (
            <>
              <OptionCard
                icon="🛒"
                title="판매하기"
                description="상품을 등록하고 판매합니다"
                onClick={() => handleMove("sale")}
              />
              <OptionCard icon="🎁" title="나눔하기" description="무료로 나눔을 등록합니다" onClick={() => handleMove("share")} />
              <OptionCard icon="🔍" title="유실물" description="분실·습득 정보를 남깁니다" onClick={() => handleMove("lost")} />

              <div className="my-1 border-t border-gray-200" role="separator" aria-hidden />

              <OptionCard
                icon="✨"
                title="AI로 빠르게 등록"
                description="이미지·텍스트로 초안을 만듭니다"
                variant="accent"
                onClick={() => handleMove("ai")}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
