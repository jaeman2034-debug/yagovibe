import { cn } from "@/lib/utils";
import type { ClubIntroProfile } from "@/types/clubIntroProfile";

export type TeamClubIntroPublicSectionsProps = {
  intro: ClubIntroProfile;
  dark?: boolean;
  /** DRAFT/REVIEWED 미리보기 배지 */
  previewBadge?: boolean;
};

/**
 * 공개(또는 관리자 미리보기) — 핵심 정보 / 업적 / 고문
 * 입장식 원문(ceremonyIntroText)은 공개에 넣지 않음.
 */
export function TeamClubIntroPublicSections({
  intro,
  dark = false,
  previewBadge = false,
}: TeamClubIntroPublicSectionsProps) {
  const facts: { label: string; value: string }[] = [];
  if (intro.foundedYear) facts.push({ label: "창단", value: `${intro.foundedYear}년` });
  else if (intro.foundedDate) facts.push({ label: "창단", value: intro.foundedDate });
  if (intro.memberCountLabel) facts.push({ label: "회원", value: intro.memberCountLabel });
  if (intro.homeGrounds?.length) facts.push({ label: "홈구장", value: intro.homeGrounds.join(" · ") });
  if (intro.ageRange) facts.push({ label: "연령대", value: intro.ageRange });
  if (intro.activityDay) facts.push({ label: "활동일", value: intro.activityDay });
  if (intro.chairmanName) facts.push({ label: "회장", value: intro.chairmanName });

  return (
    <div className="space-y-4">
      {previewBadge ? (
        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-xs font-medium",
            dark
              ? "border-amber-700/50 bg-amber-950/30 text-amber-100"
              : "border-amber-200 bg-amber-50 text-amber-950"
          )}
        >
          미리보기 · 상태 {intro.status} (방문객에게는 PUBLISHED만 공개)
        </p>
      ) : null}

      {intro.introSummary ? (
        <section>
          <h2
            className={cn(
              "text-sm font-semibold tracking-tight",
              dark ? "text-slate-200" : "text-gray-800"
            )}
          >
            팀 소개
          </h2>
          <p
            className={cn(
              "mt-2 whitespace-pre-line text-sm leading-relaxed sm:text-base",
              dark ? "text-slate-200" : "text-gray-600"
            )}
          >
            {intro.introSummary}
          </p>
        </section>
      ) : null}

      {facts.length > 0 ? (
        <section
          className={cn(
            "rounded-xl border p-4",
            dark ? "border-slate-600/70 bg-slate-900/40" : "border-gray-200 bg-white"
          )}
          aria-label="핵심 정보"
        >
          <h2 className={cn("text-sm font-semibold", dark ? "text-slate-100" : "text-gray-900")}>
            핵심 정보
          </h2>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {facts.map((f) => (
              <div key={f.label} className="text-sm">
                <dt className={cn("text-xs font-medium", dark ? "text-slate-400" : "text-gray-500")}>
                  {f.label}
                </dt>
                <dd className={cn("mt-0.5 font-medium", dark ? "text-slate-100" : "text-gray-900")}>
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
          {intro.teamValues?.length ? (
            <ul className={cn("mt-3 space-y-1 text-sm", dark ? "text-slate-300" : "text-gray-600")}>
              {intro.teamValues.map((v) => (
                <li key={v} className="flex gap-2">
                  <span className="text-emerald-500" aria-hidden>
                    •
                  </span>
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {intro.achievements?.length ? (
        <section>
          <h2 className={cn("text-sm font-semibold", dark ? "text-slate-200" : "text-gray-800")}>
            주요 업적
          </h2>
          <ul className={cn("mt-2 space-y-1.5 text-sm", dark ? "text-slate-300" : "text-gray-600")}>
            {intro.achievements.map((a) => (
              <li key={a} className="flex gap-2">
                <span aria-hidden>•</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {intro.notablePeople?.length ? (
        <section>
          <h2 className={cn("text-sm font-semibold", dark ? "text-slate-200" : "text-gray-800")}>
            고문·주요 인물
          </h2>
          <ul className="mt-2 space-y-2">
            {intro.notablePeople.map((p) => (
              <li
                key={`${p.title}-${p.name}`}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm",
                  dark ? "border-slate-600/70 bg-slate-900/35" : "border-gray-100 bg-gray-50"
                )}
              >
                <span className="font-semibold">{p.name}</span>
                <span className={cn("ml-2 text-xs", dark ? "text-slate-400" : "text-gray-500")}>
                  {p.title}
                </span>
                {p.note ? (
                  <p className={cn("mt-0.5 text-xs", dark ? "text-slate-400" : "text-gray-500")}>
                    {p.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
