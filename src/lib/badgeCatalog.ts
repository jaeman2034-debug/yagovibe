/** PR-6: 아바타 배지 표시용 (클라 읽기 전용 문서와 동일 id) */
export const AVATAR_BADGE_CATALOG: Record<
  string,
  { title: string; short: string; emoji: string }
> = {
  first_join: { title: "첫 팀 합류", short: "첫 합류", emoji: "🤝" },
  first_rsvp: { title: "첫 일정 참석", short: "첫 RSVP", emoji: "📅" },
  recruiter: { title: "리크루터", short: "리크루터", emoji: "📣" },
  active_player: { title: "액티브 플레이어", short: "액티브", emoji: "⚡" },
  content_creator: { title: "콘텐츠 크리에이터", short: "크리에이터", emoji: "🎬" },
};
