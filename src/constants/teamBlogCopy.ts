// src/constants/teamBlogCopy.ts
// 🔥 공개 팀 블로그 랜딩 페이지 문구 상수 (실전 사용)

/**
 * 히어로 영역 문구
 */
export const HERO_COPY = {
  // 상태 뱃지
  status: {
    active: "🟢 활발한 팀",
    recruiting: "🟡 모집 중",
    inactive: "⚪ 준비 중",
  },

  // 최근 활동 텍스트
  recentActivity: {
    schedule: (date: string, event: string) => `최근 경기: ${date} - ${event}`,
    attendance: (date: string, count: number) => `이번 주 훈련 완료 (${count}명 참여)`,
    blogPost: (title: string) => `최근 소식: "${title}"`,
    none: "최근 활동 정보를 준비 중입니다.",
  },

  // 신뢰 배지
  badges: {
    weeklyActivity: "✔ 주 1회 활동",
    realTeam: "✔ 실제 팀 운영 중",
    aiManaged: "✔ AI 관리 블로그",
  },

  // CTA 버튼
  cta: {
    join: "함께 운동하기",
    joinRequested: "✓ 가입 요청 보냄 · 승인 대기 중",
    alreadyMember: "✓ 이미 팀원입니다",
    goToDashboard: "팀 대시보드로 이동",
    viewIntro: "팀 소개 보기",
  },
} as const;

/**
 * 팀 캐치프레이즈
 */
export const TEAM_TAGLINE = {
  template: (teamName: string, ageGroup: string, sportType: string) =>
    `⚽ ${teamName}\n${ageGroup}에도 즐겁게 뛰고, 오래 함께하는 ${sportType}팀`,
  default: (teamName: string, description?: string) =>
    description || `${teamName} 팀을 소개합니다.`,
} as const;

/**
 * 팀 핵심 정보 카드
 */
export const TEAM_INFO_COPY = {
  title: "팀 핵심 정보",
  fields: {
    location: {
      label: "활동 지역",
      icon: "📍",
    },
    ageGroup: {
      label: "평균 연령",
      icon: "👥",
    },
    frequency: {
      label: "활동 빈도",
      value: "주 1회",
      icon: "📅",
    },
    atmosphere: {
      label: "분위기",
      value: "즐겁게 / 안전하게",
      icon: "🎯",
    },
  },
} as const;

/**
 * 모집 카드 문구
 */
export const RECRUITMENT_COPY = {
  title: "🙋 이런 분을 기다립니다",
  criteria: {
    ageGroup: (ageGroup: string, sportType: string) =>
      `✔ ${ageGroup} 이상 ${sportType} 좋아하시는 분`,
    noExperience: "✔ 운동 경험 무관",
    healthFirst: "✔ 건강하고 즐겁게 운동하고 싶은 분",
    teamwork: "✔ 승부보다 건강과 팀워크 중시",
  },
  cta: {
    primary: "이 팀에 가입하기",
    secondary: "문의하기",
  },
} as const;

/**
 * 가입 신청 화면 문구
 */
export const JOIN_REQUEST_COPY = {
  title: (teamName: string) => `⚽ ${teamName}에 가입 신청하기`,
  summary: {
    ageGroup: (age: string) => `• 연령대: ${age}`,
    location: (loc: string) => `• 활동 지역: ${loc}`,
    frequency: "• 활동 빈도: 주 1회",
  },
  message: {
    label: "간단한 자기소개나 참여 의사를 남겨주세요",
    placeholder: "예: \"60대 남성입니다. 건강하게 즐겁게 운동하고 싶어요.\"",
    optional: "(선택 사항)",
  },
  submit: "가입 신청하기",
  success: {
    title: "✅ 가입 신청이 완료되었습니다",
    message: "관리자가 확인 후\n참여 안내를 드릴게요!",
  },
  duplicate: {
    title: "ℹ️ 이미 가입 요청을 보내셨습니다.",
    message: "관리자의 승인을 기다려주세요.",
  },
  error: {
    title: "❌ 가입 요청 전송에 실패했습니다.",
    message: "잠시 후 다시 시도해주세요.",
  },
  actions: {
    continue: "팀 블로그 계속 보기",
    explore: "다른 팀 둘러보기",
  },
} as const;

/**
 * Pro 전환 문구 (관리자 전용)
 */
export const PRO_CONVERSION_COPY = {
  // 트리거 ①: 첫 글 생성 직후
  firstPost: {
    title: "✨ 첫 글이 생성되었습니다!",
    features: [
      "• 주간 자동 포스팅 (매주 자동)",
      "• SEO 최적화 (검색 노출 강화)",
      "• 사진 기반 AI 설명 자동 생성",
      "• 브랜딩 제거",
    ],
    cta: "Pro 시작하기 - 월 19,000원",
    cancel: "나중에",
  },

  // 트리거 ②: 블로그 조회수 증가
  viewsIncrease: {
    title: "🔥 이 팀 블로그가 반응을 얻고 있어요!",
    message: (views: number) =>
      `지난 7일간 ${views}명이 방문했습니다.\n\nPro로 업그레이드하면:\n• 검색 노출 강화 (더 많은 방문자)\n• 주간 자동 포스팅 (지속적인 콘텐츠)\n• 상세 통계 (방문자 분석)`,
    cta: "Pro로 더 키워보기 - 월 19,000원",
  },

  // 트리거 ③: 두 번째 글 생성 시도
  secondPostAttempt: {
    title: "💡 무료 플랜은 월 2개 글까지만 가능합니다",
    features: [
      "• 무제한 자동 포스팅",
      "• 주간 요약 자동 생성",
      "• SEO 최적화",
    ],
    cta: "Pro 시작하기 - 월 19,000원",
    cancel: "무료로 계속하기",
  },

  // 트리거 ④: 가입 요청 증가
  joinRequestsIncrease: {
    title: "🎉 팀 블로그가 관심을 받고 있어요!",
    message: (views: number, requests: number) =>
      `이번 주 ${views}명이 방문했고,\n가입 요청 ${requests}건이 들어왔습니다.\n\nPro로 업그레이드하면:\n• 검색 노출 강화 (더 많은 방문자)\n• 자동 홍보 (SNS 공유 최적화)\n• 상세 통계`,
    cta: "Pro로 더 키워보기 - 월 19,000원",
  },

  // 트리거 ⑤: 관리자 대시보드 진입
  dashboardEntry: {
    title: "🤖 AI가 블로그를 관리 중입니다",
    features: [
      "• 주간 자동 포스팅",
      "• SEO 최적화",
      "• 브랜딩 제거",
    ],
    cta: "Pro 시작하기 - 월 19,000원",
  },
} as const;

/**
 * 블로그 콘텐츠 영역 문구
 */
export const BLOG_CONTENT_COPY = {
  tabs: {
    intro: "팀 소개",
    activity: "활동",
    reviews: "후기",
  },
  empty: {
    intro: "팀 소개를 준비 중입니다.",
    activity: "활동 내역이 없습니다.",
    reviews: "후기가 없습니다.",
  },
} as const;

/**
 * 사이드바 문구
 */
export const SIDEBAR_COPY = {
  teamInfo: {
    title: "팀/운영자",
    operator: "팀 운영자",
    rating: (rating: number) => `평점 ★${rating.toFixed(2)}`,
    reviews: (count: number) => `리뷰 수 ${count}개`,
  },
  teamDetails: {
    title: "팀 정보",
    sport: (sport: string) => `🏆 종목: ${sport}`,
    location: (loc: string) => `📍 활동 지역: ${loc}`,
    members: (current: number, max: number) => `👥 모집 인원: ${current}/${max}명`,
    difficulty: (level: string) => `⭐ 난이도: ${level}`,
  },
  stats: {
    title: "활동 통계",
    button: "활성 통계",
  },
} as const;

/**
 * 공유 기능 문구
 */
export const SHARE_COPY = {
  button: "공유하기",
  success: "블로그 링크가 클립보드에 복사되었습니다!",
} as const;

/**
 * SEO 메타 태그 문구
 */
export const SEO_COPY = {
  title: (teamName: string) => `${teamName} 팀 블로그`,
  description: (teamName: string, location: string, ageGroup: string, sportType: string) =>
    `${teamName} 팀을 소개합니다. ${location}에서 활동하는 ${ageGroup} ${sportType}팀입니다.`,
  keywords: (location: string, sportType: string, ageGroup: string) =>
    `${location} ${sportType}, ${ageGroup} ${sportType}팀, ${location} 운동 모임`,
} as const;

/**
 * 에러/로딩 문구
 */
export const ERROR_COPY = {
  loading: "블로그를 불러오는 중...",
  notFound: {
    title: "팀 블로그를 찾을 수 없습니다.",
    action: "스포츠 허브로 돌아가기",
  },
} as const;

/**
 * 상태별 화면 문구 (더미 데이터 포함)
 */
export const STATE_COPY = {
  guest: {
    hero: {
      statusBadge: "🟢 활발한 팀 · 최근 활동 있음",
      teamName: "⚽ 소흘 60대 FC",
      catchphrase: "60대에도 우리는 계속 뛰고 있습니다.",
      recentActivity: "🟢 최근 경기 완료 · 7월 21일(일)",
    },
    cta: {
      primary: "함께 운동하기",
      secondary: "팀 소개 보기",
    },
    meta: {
      location: "포천",
      ageGroup: "60대",
      frequency: "주 1회",
      vibe: "즐겁게",
    },
    conversion1: {
      headline: "🙋 이런 분을 기다립니다",
      bullets: [
        "✔ 60대 이상, 축구 경험 무관",
        "✔ 건강하게 오래 운동하고 싶은 분",
        "✔ 팀워크를 소중히 여기는 분",
      ],
      cta: "이 팀에 가입하기",
    },
    blog: {
      cards: [
        {
          title: "7월 정기 경기 후기",
          summary: "무더위 속에서도 웃음 가득",
          date: "2025.07.21",
        },
        {
          title: "새 멤버 환영합니다",
          summary: "첫 경기 적응기",
          date: "2025.07.14",
        },
        {
          title: "스트레칭 루틴 공유",
          summary: "부상 없이 오래 뛰는 법",
          date: "2025.07.07",
        },
      ],
      link: "블로그 전체 보기 →",
    },
    conversion2: {
      copy: "직접 와서 한 번 같이 뛰어보세요.\n부담 없이 참여할 수 있어요.",
      cta: {
        primary: "함께 운동하기",
        secondary: "문의하기",
      },
    },
  },
  member: {
    hero: {
      statusBadge: "🟢 활동 중 · 다음 일정 예정",
      recentActivity: "🗓 다음 경기 · 7월 28일(일)",
    },
    cta: {
      primary: "일정 보기",
      secondary: "팀 소개 보기",
    },
    conversion1: {
      headline: "🙌 함께 뛰는 동료가 있어 더 즐겁습니다",
      cta: "출석 체크하기",
    },
    conversion2: {
      copy: "오늘 컨디션은 어떠신가요?",
      cta: {
        primary: "출석 체크",
        secondary: "문의하기",
      },
    },
  },
  admin: {
    hero: {
      statusBadge: "🟢 팀 운영 중 · 활동 데이터 정상",
      recentActivity: "🟢 최근 7일 활동 있음",
    },
    cta: {
      primary: "팀 관리하기",
      secondary: "페이지 미리보기",
    },
    insights: {
      title: "관리자 인사이트",
      metrics: [
        { label: "👀 최근 7일 방문자", value: "42명" },
        { label: "👉 CTA 클릭", value: "11회" },
        { label: "📝 블로그 조회", value: "67회" },
      ],
    },
    proNotice: {
      title: "📈 팀 블로그가 잘 작동하고 있어요",
      message: "지난 7일간 42명이 방문했습니다.\n\nPro로 전환하면\n자동 홍보와 글 생성을 계속할 수 있어요.",
      cta: {
        primary: "🚀 Pro 계속 사용하기",
        secondary: "기능 더 알아보기",
      },
    },
  },
  pending: {
    hero: {
      statusBadge: "🟢 활발한 팀 · 최근 활동 있음",
    },
    cta: {
      primary: "가입 승인 대기중",
      secondary: "팀 소개 보기",
    },
    conversion1: {
      headline: "🙋 이런 분을 기다립니다",
      cta: "가입 승인 대기중",
    },
    conversion2: {
      copy: "직접 와서 한 번 같이 뛰어보세요.\n부담 없이 참여할 수 있어요.",
      cta: {
        primary: "가입 승인 대기중",
      },
    },
  },
} as const;

