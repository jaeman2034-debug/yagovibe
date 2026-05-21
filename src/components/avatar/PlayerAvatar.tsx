import type { AvatarAppearance } from "@/types/avatar";
import { normalizeAvatarJerseyNumber } from "@/services/avatarService";

export type PlayerAvatarSize = "hub" | "sm" | "md" | "lg";
export type PlayerAvatarVariant = "light" | "dark";

function skinGradient(tone?: string, variant: PlayerAvatarVariant = "light"): string {
  const dark = variant === "dark";
  switch (tone) {
    case "라이트":
      return dark
        ? "from-amber-100/95 to-amber-200/90"
        : "from-amber-300 to-amber-500";
    case "미디엄":
      return dark ? "from-amber-300 to-amber-500" : "from-amber-400 to-amber-600";
    case "탠":
      return dark ? "from-amber-600 to-amber-800" : "from-amber-500 to-amber-800";
    case "다크":
      return dark ? "from-amber-800 to-amber-950" : "from-amber-700 to-amber-900";
    default:
      return dark ? "from-slate-300 to-slate-500" : "from-amber-300 to-amber-500";
  }
}

function hairBlock(hair?: string): { cap: string; extra?: string } {
  if (!hair) return { cap: "h-3.5 rounded-t-full bg-gradient-to-b from-stone-800 to-stone-950" };
  if (hair.includes("포니"))
    return {
      cap: "h-2.5 rounded-t-full bg-gradient-to-b from-violet-700 to-indigo-950",
      extra: "absolute -right-0.5 top-3 h-5 w-2.5 rounded-full bg-gradient-to-b from-violet-600 to-indigo-900 shadow-md",
    };
  if (hair.includes("반삭"))
    return { cap: "h-2 rounded-sm bg-gradient-to-b from-slate-600 to-slate-900" };
  if (hair.includes("가르마"))
    return {
      cap: "h-3 rounded-t-full bg-gradient-to-b from-stone-800 to-stone-950 ring-1 ring-white/10",
      extra: "absolute inset-x-2.5 top-1.5 mx-auto h-2.5 w-px bg-white/25",
    };
  if (hair.includes("댄디"))
    return { cap: "h-3 rounded-t-md bg-gradient-to-br from-slate-700 via-slate-900 to-black" };
  return { cap: "h-3.5 rounded-t-full bg-gradient-to-b from-amber-900 to-stone-950" };
}

function faceShape(face?: string): string {
  switch (face) {
    case "둥근형":
      return "rounded-full";
    case "각진형":
      return "rounded-md [clip-path:polygon(6%_0,94%_0,100%_38%,94%_100%,6%_100%,0_38%)]";
    case "부드러운":
      return "rounded-[1.75rem] scale-x-[0.97]";
    case "선명한":
      return "rounded-xl scale-x-[0.92] border border-black/12";
    default:
      return "rounded-full";
  }
}

/** Head box — smaller vs torso for athletic proportion. */
function headBox(face?: string): string {
  switch (face) {
    case "각진형":
      return "h-[2.75rem] w-[2.65rem]";
    case "선명한":
      return "h-[2.8rem] w-[2.5rem]";
    case "부드러운":
      return "h-[2.85rem] w-[2.7rem]";
    default:
      return "h-12 w-12";
  }
}

function faceAccents(face?: string, variant: PlayerAvatarVariant = "light"): { jaw?: string; eyeDot: string; eyeY: string; eyeL: string; eyeR: string } {
  const dot = variant === "dark" ? "bg-white/88" : "bg-slate-900/78";
  switch (face) {
    case "각진형":
      return {
        jaw: "absolute inset-x-2 bottom-1.5 h-px bg-black/22",
        eyeDot: `h-1 w-1 rounded-full ${dot}`,
        eyeY: "bottom-[1.72rem]",
        eyeL: "left-[20%]",
        eyeR: "right-[20%]",
      };
    case "선명한":
      return {
        jaw: "absolute inset-x-3 bottom-2 h-0.5 bg-black/20",
        eyeDot: `h-1 w-1 rounded-full ${dot} ring-1 ring-black/15`,
        eyeY: "bottom-[1.68rem]",
        eyeL: "left-[23%]",
        eyeR: "right-[23%]",
      };
    case "부드러운":
      return {
        eyeDot: `h-0.5 w-1 rounded-full ${dot} opacity-90 scale-95`,
        eyeY: "bottom-[1.75rem]",
        eyeL: "left-[26%]",
        eyeR: "right-[26%]",
      };
    default:
      return {
        eyeDot: `h-1 w-1 rounded-full ${dot}`,
        eyeY: "bottom-[1.7rem]",
        eyeL: "left-[27%]",
        eyeR: "right-[27%]",
      };
  }
}

function torsoWidth(body?: string): string {
  switch (body) {
    case "슬림":
      return "w-[3.35rem]";
    case "근육형":
      return "w-[4.6rem]";
    case "스포티":
      return "w-[4.85rem]";
    default:
      return "w-[3.85rem]";
  }
}

function torsoGradient(outfit?: string, variant: PlayerAvatarVariant = "light"): string {
  if (variant === "light") {
    switch (outfit) {
      case "저지":
        return "from-indigo-800 via-violet-800 to-indigo-950";
      case "후드":
        return "from-slate-700 via-slate-800 to-slate-950";
      case "트레이닝":
        return "from-emerald-800 via-teal-800 to-emerald-950";
      case "윈드브레이커":
        return "from-sky-700 via-blue-800 to-slate-900";
      default:
        return "from-indigo-700 to-slate-900";
    }
  }
  switch (outfit) {
    case "저지":
      return "from-indigo-600 via-violet-600 to-indigo-800";
    case "후드":
      return "from-slate-600 via-slate-700 to-slate-900";
    case "트레이닝":
      return "from-emerald-600 via-teal-600 to-emerald-900";
    case "윈드브레이커":
      return "from-sky-500 via-blue-600 to-slate-800";
    default:
      return "from-indigo-500 to-slate-800";
  }
}

function shortsClass(outfit?: string): string {
  if (outfit === "트레이닝") return "from-emerald-800 to-emerald-950";
  if (outfit === "윈드브레이커") return "from-slate-700 to-slate-900";
  return "from-indigo-900 to-slate-950";
}

function shoeBlock(shoes?: string): { upper: string; sole: string; studs?: boolean } {
  switch (shoes) {
    case "스터드":
      return {
        upper: "from-emerald-900 to-emerald-950",
        sole: "bg-emerald-950 ring-1 ring-emerald-950/50",
        studs: true,
      };
    case "실내화":
      return { upper: "from-slate-500 to-slate-600", sole: "bg-slate-600" };
    case "농구화":
      return { upper: "from-orange-600 to-orange-800", sole: "bg-orange-950" };
    default:
      return { upper: "from-indigo-800 to-indigo-950", sole: "bg-indigo-950 ring-1 ring-indigo-950/40" };
  }
}

function shortsOuterClass(body?: string): string {
  switch (body) {
    case "슬림":
      return "w-[3.85rem]";
    case "근육형":
      return "w-[5.15rem]";
    case "스포티":
      return "w-[5.35rem]";
    default:
      return "w-[4.35rem]";
  }
}

function sizeFrame(size: PlayerAvatarSize): string {
  switch (size) {
    case "hub":
      /** sm 전신과 동일 geometry + scale(0.72) 기준 레이아웃 슬롯(시각 높이 ~108px) */
      return "h-[6.75rem] w-[5.5rem]";
    case "sm":
      return "h-[9.35rem] w-[6rem]";
    case "lg":
      return "h-[13.25rem] w-[8.75rem]";
    default:
      return "h-[10.75rem] w-[7rem]";
  }
}

function limbScale(size: PlayerAvatarSize): { armH: string; armW: string; thighH: string; calfH: string; legW: string } {
  switch (size) {
    case "hub":
    case "sm":
      return { armH: "h-[2.65rem]", armW: "w-2.5", thighH: "h-7", calfH: "h-6", legW: "w-3" };
    case "lg":
      return { armH: "h-[3.35rem]", armW: "w-3.5", thighH: "h-9", calfH: "h-8", legW: "w-4" };
    default:
      return { armH: "h-[2.95rem]", armW: "w-3", thighH: "h-8", calfH: "h-7", legW: "w-3.5" };
  }
}

/**
 * PR-11D — 동일 appearance → 동일 렌더. 전신 미니 풋볼 플레이어 (CSS만).
 * Hub 전용 `size="hub"` 은 정체성 카드에서 시각 계층(이름·XP·CTA 우선)용 컴팩트 프레임.
 */
export function PlayerAvatar({
  appearance,
  variant = "light",
  size = "md",
  jerseyNumber,
  className = "",
  "aria-label": ariaLabel = "플레이어 캐릭터",
}: {
  appearance: AvatarAppearance;
  variant?: PlayerAvatarVariant;
  size?: PlayerAvatarSize;
  /** 1~99 가슴 배번. `avatars/{uid}.jerseyNumber` 와 동기 */
  jerseyNumber?: number | null;
  className?: string;
  "aria-label"?: string;
}) {
  const skin = skinGradient(appearance.skinTone, variant);
  const hair = hairBlock(appearance.hair);
  const face = faceShape(appearance.face);
  const hb = headBox(appearance.face);
  const accents = faceAccents(appearance.face, variant);
  const tw = torsoWidth(appearance.bodyType);
  const torso = torsoGradient(appearance.outfit, variant);
  const shorts = shortsClass(appearance.outfit);
  const shoe = shoeBlock(appearance.shoes);
  const ring =
    variant === "dark" ? "ring-2 ring-white/15 shadow-[0_0_20px_rgba(99,102,241,0.25)]" : "ring-2 ring-slate-500/55 shadow-md";
  const limbRing =
    variant === "dark" ? "ring-1 ring-white/10" : "ring-1 ring-slate-600/30 shadow-sm";
  const neckW = "w-[2.125rem]";
  const shortsW = shortsOuterClass(appearance.bodyType);
  const L = limbScale(size);
  /** Firestore 숫자·문자 혼입 + hub 전체 scale 시에도 읽히게 normalize·글자 크기 보정 */
  const jerseyDisplay = normalizeAvatarJerseyNumber(jerseyNumber);
  const figureStyle =
    size === "hub"
      ? ({
          transform: "translateX(2px) translateY(0px) rotate(-3.5deg) skewX(-0.5deg) scale(0.72)",
          transformOrigin: "50% 100%",
        } as const)
      : ({
          transform: "translateX(3px) translateY(1px) rotate(-3.5deg) skewX(-0.5deg)",
        } as const);

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={`relative mx-auto flex flex-col items-center justify-end overflow-visible pt-1 ${sizeFrame(size)} ${className}`}
    >
      <div className="relative flex flex-col items-center" style={figureStyle}>
        {/* Head + neck — football-ready slight forward lean via child offsets */}
        <div className="relative z-20 flex flex-col items-center">
          <div className={`relative ${hb} ${face} bg-gradient-to-b ${skin} ${ring} shadow-inner`}>
            <div className={`absolute inset-x-1 top-0 ${hair.cap} w-[calc(100%-0.5rem)]`} />
            {hair.extra ? <div className={hair.extra} /> : null}
            {accents.jaw ? <div className={accents.jaw} /> : null}
            <div className="absolute bottom-2 left-1/2 h-1 w-7 -translate-x-1/2 rounded-full bg-rose-400/30 blur-[1.5px]" />
            <span className={`pointer-events-none absolute ${accents.eyeY} ${accents.eyeL} ${accents.eyeDot}`} />
            <span className={`pointer-events-none absolute ${accents.eyeY} ${accents.eyeR} ${accents.eyeDot}`} />
          </div>
          <div className={`${neckW} -mt-px h-2 bg-gradient-to-b ${skin} opacity-95`} />
        </div>

        {/* Arms + torso — asymmetric ready stance */}
        <div className="relative z-10 -mt-px flex items-end justify-center gap-0">
          <div
            className={`relative z-0 mb-0.5 ${L.armH} ${L.armW} origin-top rotate-[24deg] rounded-full bg-gradient-to-b ${skin} opacity-95 ${limbRing}`}
          />
          <div
            className={`${tw} relative z-10 translate-y-px rounded-b-xl rounded-t-lg bg-gradient-to-b ${torso} px-1 pb-1.5 pt-2 shadow-inner ${
              variant === "dark" ? "ring-1 ring-white/10" : "ring-1 ring-black/10"
            }`}
          >
            <div className="relative mx-auto flex flex-col items-center">
              <div className="h-0 w-0 border-x-[11px] border-x-transparent border-t-[13px] border-t-white/30" />
              <div className="-mt-px h-0.5 w-8 rounded-full bg-white/22" />
            </div>
            <div className="absolute left-0.5 top-4 h-5 w-0.5 rounded-full bg-white/18" />
            <div className="absolute right-0.5 top-4 h-5 w-0.5 rounded-full bg-white/18" />
            <div className="mx-auto mt-1 h-1 w-7 rounded-full bg-white/22" />
            {jerseyDisplay != null ? (
              <div className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center pt-2">
                <span
                  className={`rounded-md bg-black/60 px-1.5 py-0.5 font-black tabular-nums text-white shadow-md ring-1 ring-white/30 ${
                    size === "hub"
                      ? "text-[13px] leading-none"
                      : size === "sm"
                        ? "text-[11px] leading-none"
                        : size === "lg"
                          ? "text-base leading-none"
                          : "text-sm leading-none"
                  }`}
                >
                  {jerseyDisplay}
                </span>
              </div>
            ) : null}
          </div>
          <div
            className={`relative z-0 mb-0.5 ${L.armH} ${L.armW} origin-top -rotate-[14deg] rounded-full bg-gradient-to-b ${skin} opacity-95 ${limbRing}`}
          />
        </div>

        {/* Shorts — clearer hem + side stripe */}
        <div
          className={`relative -mt-px ${shortsW} rounded-b-xl bg-gradient-to-b ${shorts} px-1 pb-1.5 pt-1 shadow-md ${
            variant === "dark" ? "ring-1 ring-white/10" : "ring-1 ring-black/15"
          }`}
        >
          <div className="absolute left-1 top-1 h-4 w-0.5 rounded-full bg-white/14" />
          <div className="absolute right-1 top-1 h-4 w-0.5 rounded-full bg-white/14" />
          <div className="mx-auto h-0.5 w-11 rounded-full bg-black/15" />
          <div className="mx-auto mt-1 h-1 w-10 rounded-full bg-white/12" />
        </div>

        {/* Legs + socks + boots — weight on back foot */}
        <div className="relative z-0 -mt-px flex justify-center gap-2.5 px-0.5">
          {(["left", "right"] as const).map((side) => (
            <div
              key={side}
              className={`flex flex-col items-center ${
                side === "left"
                  ? "origin-top rotate-[6deg] translate-y-0.5"
                  : "origin-top -rotate-[2deg] -translate-y-px"
              }`}
            >
              <div className={`${L.thighH} ${L.legW} rounded-md bg-gradient-to-b ${skin} ${limbRing}`} />
              <div className={`${L.calfH} ${L.legW} rounded-md bg-gradient-to-b ${skin} opacity-95 ${limbRing}`} />
              <div
                className={`relative mt-px flex w-[calc(100%+2px)] flex-col items-stretch gap-px ${
                  variant === "dark" ? "opacity-95" : ""
                }`}
              >
                <div className="h-2.5 w-full rounded-sm border border-white/35 bg-gradient-to-b from-white to-slate-100 shadow-sm" />
                <div className="mx-auto h-1 w-[85%] rounded-full bg-slate-300/55" />
              </div>
              <div className="relative mt-0.5 flex flex-col items-center">
                <div
                  className={`h-2.5 w-[1.35rem] rounded-t-md bg-gradient-to-b ${shoe.upper} ${
                    variant === "dark" ? "ring-1 ring-black/25" : "ring-1 ring-black/15"
                  }`}
                />
                <div
                  className={`relative -mt-px h-2.5 w-[1.55rem] rounded-b-lg rounded-t-sm ${shoe.sole} shadow-md ${
                    variant === "dark" ? "ring-1 ring-black/35" : "ring-1 ring-black/25"
                  }`}
                >
                  <div className="absolute -top-0.5 left-1/2 h-1 w-[1.1rem] -translate-x-1/2 rounded-t-full bg-black/12" />
                  {shoe.studs ? (
                    <span className="absolute inset-x-1 bottom-0 flex justify-between">
                      <span className="h-0.5 w-0.5 rounded-full bg-lime-300/95" />
                      <span className="h-0.5 w-0.5 rounded-full bg-lime-300/95" />
                      <span className="h-0.5 w-0.5 rounded-full bg-lime-300/95" />
                      <span className="h-0.5 w-0.5 rounded-full bg-lime-300/95" />
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
