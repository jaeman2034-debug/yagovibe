/**
 * builderData
 * YAGO Builder에서 사용하는 정적 데이터
 */

export const organizationTypes = [
  {
    id: "federation",
    label: "협회",
    labelEn: "Federation",
    description: "리그 및 대회 운영",
    icon: "🏆",
  },
  {
    id: "academy",
    label: "아카데미",
    labelEn: "Academy",
    description: "훈련 프로그램 운영",
    icon: "🎓",
  },
  {
    id: "club",
    label: "클럽",
    labelEn: "Club",
    description: "팀 중심 활동",
    icon: "👥",
  },
];

export const sports = [
  { id: "football", label: "축구", icon: "⚽" },
  { id: "basketball", label: "농구", icon: "🏀" },
  { id: "baseball", label: "야구", icon: "⚾" },
  { id: "volleyball", label: "배구", icon: "🏐" },
  { id: "badminton", label: "배드민턴", icon: "🏸" },
];

export const audiences = [
  { id: "youth", label: "유소년", description: "초등/중학생 대상" },
  { id: "teen", label: "청소년", description: "고등학생 대상" },
  { id: "adult", label: "성인", description: "성인 대상" },
  { id: "mixed", label: "혼합", description: "모든 연령대" },
];

export const heroImages = [
  {
    id: "sports-field",
    label: "운동장",
    url: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=400&fit=crop",
  },
  {
    id: "stadium",
    label: "경기장",
    url: "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800&h=400&fit=crop",
  },
  {
    id: "team-huddle",
    label: "팀 단합",
    url: "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&h=400&fit=crop",
  },
  {
    id: "trophy",
    label: "트로피",
    url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=400&fit=crop",
  },
];

export const templates = [
  {
    id: "nowon-football-template",
    name: "노원구 축구협회 템플릿 (표준)",
    features: [
      "회원/비회원/아카데미 팀 구분",
      "우선 대관 시설 정책",
      "월간 운영 리포트 자동화",
      "이메일 자동 발송",
    ],
  },
];

// URL slug 생성 함수
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}
