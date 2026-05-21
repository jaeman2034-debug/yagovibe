import type { AvatarOnboardingAppearance } from "@/services/avatarService";
import { AVATAR_ONBOARDING_OPTIONS, defaultOnboardingAppearance } from "./onboardingOptions";

/**
 * PR-11D — 로컬 키워드만으로 appearance 채움 (외부 LLM 없음).
 * 매칭 없으면 `defaultOnboardingAppearance` 기반.
 */
export function parseAvatarStylePrompt(raw: string): AvatarOnboardingAppearance {
  const t = raw.trim();
  const base = defaultOnboardingAppearance();
  if (!t) return base;

  const patch: Partial<AvatarOnboardingAppearance> = {};

  if (/근육|파워|스트라이커|공격수|striker/i.test(t)) patch.bodyType = "근육형";
  else if (/날렵|윙어|빠른|슬림|마른|wing/i.test(t)) patch.bodyType = "슬림";
  else if (/밸런스|보통|미드|mid/i.test(t)) patch.bodyType = "보통";
  else if (/스포티|박스|수비|def/i.test(t)) patch.bodyType = "스포티";

  if (/포니|pony/i.test(t)) patch.hair = "포니테일";
  else if (/반삭|버즈|짧게/i.test(t)) patch.hair = "반삭";
  else if (/가르마|가지런/i.test(t)) patch.hair = "가르마";
  else if (/댄디|슬릭/i.test(t)) patch.hair = "댄디";
  else if (/짧은|숏/i.test(t)) patch.hair = "짧은 머리";

  if (/각|샤프|sharp/i.test(t)) patch.face = "각진형";
  else if (/둥|라운드|round/i.test(t)) patch.face = "둥근형";
  else if (/부드|소프트|soft/i.test(t)) patch.face = "부드러운";
  else if (/선명|날카/i.test(t)) patch.face = "선명한";

  if (/다크|어둡|흑색/i.test(t)) patch.skinTone = "다크";
  else if (/탠|구릿/i.test(t)) patch.skinTone = "탠";
  else if (/미디엄|미듐|중간/i.test(t)) patch.skinTone = "미디엄";
  else if (/라이트|밝은|화이트/i.test(t)) patch.skinTone = "라이트";

  if (/윈드|바람막이|wind/i.test(t)) patch.outfit = "윈드브레이커";
  else if (/트레이닝|training|짐/i.test(t)) patch.outfit = "트레이닝";
  else if (/스트리트|street|힙/i.test(t)) patch.outfit = "후드";
  else if (/보라|퍼플|purple|저지|유니폼|jersey/i.test(t)) patch.outfit = "저지";

  if (/스터드|cleat|철발/i.test(t)) patch.shoes = "스터드";
  else if (/실내|indoor/i.test(t)) patch.shoes = "실내화";
  else if (/농구/i.test(t)) patch.shoes = "농구화";
  else if (/런닝|러닝|runn/i.test(t)) patch.shoes = "러닝화";

  const merged = { ...base, ...patch };
  for (const k of Object.keys(AVATAR_ONBOARDING_OPTIONS) as (keyof AvatarOnboardingAppearance)[]) {
    const allowed = AVATAR_ONBOARDING_OPTIONS[k] as readonly string[];
    if (!allowed.includes(merged[k] as string)) {
      merged[k] = base[k];
    }
  }
  return merged;
}
