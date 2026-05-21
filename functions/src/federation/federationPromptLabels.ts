/** 협회 AI 프롬프트용 라벨 (Callable 간 공통) */

export const SPORT_LABEL: Record<string, string> = {
  soccer: "축구",
  football: "축구",
  basketball: "농구",
  baseball: "야구",
  volleyball: "배구",
  futsal: "풋살",
  badminton: "배드민턴",
  all: "스포츠",
};

export const AUDIENCE_LABEL: Record<string, string> = {
  youth: "유소년 선수·학부모·지도자를 중심으로 한",
  adult: "성인 선수·동호인·클럽을 중심으로 한",
  all: "전 연령 회원 및 지역 시민을 아우르는",
};

export function sportLabel(sport: string): string {
  return SPORT_LABEL[sport] ?? sport;
}

export function audienceLabel(audience: string | undefined): string {
  if (!audience) return "전 연령 회원 및 지역 시민을 아우르는";
  return AUDIENCE_LABEL[audience] ?? audience;
}
