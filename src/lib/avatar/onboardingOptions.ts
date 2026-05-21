import type { AvatarOnboardingAppearance } from "@/services/avatarService";

/** 온보딩·PlayerAvatar·AI 파서 공통 옵션 (Firestore 저장 값과 동일 문자열) */
export const AVATAR_ONBOARDING_OPTIONS = {
  bodyType: ["보통", "슬림", "근육형", "스포티"],
  hair: ["짧은 머리", "가르마", "댄디", "포니테일", "반삭"],
  face: ["둥근형", "각진형", "부드러운", "선명한"],
  skinTone: ["라이트", "미디엄", "탠", "다크"],
  outfit: ["저지", "후드", "트레이닝", "윈드브레이커"],
  shoes: ["러닝화", "실내화", "농구화", "스터드"],
} as const satisfies Record<keyof AvatarOnboardingAppearance, readonly string[]>;

export function defaultOnboardingAppearance(): AvatarOnboardingAppearance {
  return {
    bodyType: AVATAR_ONBOARDING_OPTIONS.bodyType[0]!,
    hair: AVATAR_ONBOARDING_OPTIONS.hair[0]!,
    face: AVATAR_ONBOARDING_OPTIONS.face[0]!,
    skinTone: AVATAR_ONBOARDING_OPTIONS.skinTone[0]!,
    outfit: AVATAR_ONBOARDING_OPTIONS.outfit[0]!,
    shoes: AVATAR_ONBOARDING_OPTIONS.shoes[0]!,
  };
}

/** 원탭 프리셋 → appearance (PR-11D) */
export const AVATAR_STYLE_PRESETS: Record<string, AvatarOnboardingAppearance> = {
  공격수: {
    bodyType: "근육형",
    hair: "짧은 머리",
    face: "선명한",
    skinTone: "미디엄",
    outfit: "저지",
    shoes: "스터드",
  },
  플레이메이커: {
    bodyType: "보통",
    hair: "가르마",
    face: "부드러운",
    skinTone: "라이트",
    outfit: "트레이닝",
    shoes: "러닝화",
  },
  드리블러: {
    bodyType: "슬림",
    hair: "반삭",
    face: "각진형",
    skinTone: "탠",
    outfit: "후드",
    shoes: "실내화",
  },
  수비수: {
    bodyType: "스포티",
    hair: "댄디",
    face: "각진형",
    skinTone: "미디엄",
    outfit: "윈드브레이커",
    shoes: "스터드",
  },
  스트리트: {
    bodyType: "보통",
    hair: "포니테일",
    face: "둥근형",
    skinTone: "다크",
    outfit: "후드",
    shoes: "농구화",
  },
};
