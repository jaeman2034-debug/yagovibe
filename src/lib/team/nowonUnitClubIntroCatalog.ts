/**
 * 노원구축구협회 단위축구회 — 입장식 소개 멘트 구조화 카탈로그 (시드)
 *
 * - 구조화 필드: 제공된 팩트만 (값 없으면 생략). "N년 역사" 고정 문구 없음.
 * - ceremonyIntroText: 사용자가 제공한 입장식 원문만. AI/팩트 조립문 금지.
 * - 이름(matchKeys) 매칭은 CMS 최초 시드 1회용. 저장 후 읽기는 platformTeamId SoT만.
 */
import type { ClubIntroCatalogEntry } from "@/types/clubIntroProfile";

function summaryFromFacts(p: {
  teamName: string;
  foundedYear?: number;
  memberCountLabel?: string;
  homeGrounds?: string[];
  teamValues?: string[];
}): string {
  const parts: string[] = [];
  if (p.foundedYear) {
    parts.push(`${p.teamName}은(는) ${p.foundedYear}년에 창단하였습니다.`);
  } else {
    parts.push(`${p.teamName}을(를) 소개합니다.`);
  }
  if (p.memberCountLabel) {
    parts.push(`현재 ${p.memberCountLabel}의 회원이 활동하고 있습니다.`);
  }
  if (p.homeGrounds?.length) {
    parts.push(`${p.homeGrounds.join(", ")}을(를) 중심으로 축구를 즐깁니다.`);
  }
  if (p.teamValues?.length) {
    parts.push(`${p.teamValues.join(", ")}을(를) 중요하게 생각합니다.`);
  }
  return parts.join(" ");
}

function entry(
  catalogId: string,
  matchKeys: string[],
  base: Omit<ClubIntroCatalogEntry, "catalogId" | "matchKeys" | "source" | "introSummary" | "ceremonyIntroText"> & {
    introSummary?: string;
    /** 입장식 원문. 없으면 빈 문자열 — 조립하지 않음 */
    ceremonyIntroText?: string;
  }
): ClubIntroCatalogEntry {
  const introSummary =
    base.introSummary ??
    summaryFromFacts({
      teamName: base.teamName,
      foundedYear: base.foundedYear,
      memberCountLabel: base.memberCountLabel,
      homeGrounds: base.homeGrounds,
      teamValues: base.teamValues,
    });
  // 원문이 카탈로그에 아직 없으면 빈 문자열. 팩트로 재생성하지 않음.
  const ceremonyIntroText = base.ceremonyIntroText?.trim() ?? "";
  return {
    ...base,
    catalogId,
    matchKeys,
    introSummary,
    ceremonyIntroText,
    source: "NOWON_UNIT_CLUB_CEREMONY_SCRIPT",
  };
}

export const NOWON_UNIT_CLUB_INTRO_CATALOG: ClubIntroCatalogEntry[] = [
  entry("gongneung", ["공릉축구회", "공릉fc", "공릉FC", "공릉"], {
    teamName: "공릉축구회",
    chairmanName: "서정석",
    foundedYear: 1972,
    memberCount: 107,
    memberCountLabel: "107명",
    homeGrounds: ["공릉동 과학기술대학교"],
    ageRange: "20대~70대",
    teamValues: ["세대가 어우러지는 개방적 분위기", "소통과 친목 중심"],
    notablePeople: [{ name: "장성일", title: "고문", note: "제13·14대 회장 역임" }],
    sortOrder: 1,
  }),
  entry("gongil", ["공일축구회", "공일fc", "공일FC", "공일"], {
    teamName: "공일축구회",
    chairmanName: "이재영",
    foundedYear: 1979,
    memberCount: 70,
    memberCountLabel: "약 70명",
    ageRange: "20대~70대",
    teamValues: ["오랜 역사와 전통"],
    notablePeople: [{ name: "심경택", title: "고문", note: "제32·33대 회장 역임" }],
    sortOrder: 2,
  }),
  entry("nowon", ["노원축구회", "노원fc", "노원FC"], {
    teamName: "노원축구회",
    chairmanName: "김주권",
    foundedYear: 1978,
    foundedDate: "1978-10-09",
    memberCount: 60,
    memberCountLabel: "60명",
    homeGrounds: ["수락산구장"],
    teamValues: ["지역 주민 선후배 친목", "우승보다 우정과 상부상조 중시"],
    notablePeople: [{ name: "홍흥표", title: "고문", note: "제23·24대 회장 역임" }],
    sortOrder: 3,
  }),
  entry("nowon-ku", ["노원ku축구회", "노원KU축구회", "노원교우회", "고려대학교 노원교우회"], {
    teamName: "노원KU축구회",
    chairmanName: "허진우",
    foundedYear: 2017,
    memberCount: 100,
    memberCountLabel: "약 100명",
    homeGrounds: ["육사구장"],
    activityDay: "매주 토요일",
    teamValues: ["고려대학교 노원교우회", "1980년대 학번 중심", "매주 토요일 활동"],
    sortOrder: 4,
  }),
  entry("nohae", ["노해축구회", "노해fc", "노해FC", "노해"], {
    teamName: "노해축구회",
    chairmanName: "서국원",
    foundedYear: 1987,
    memberCount: 50,
    memberCountLabel: "50명",
    homeGrounds: ["수락산 스포츠타운"],
    teamValues: ["정회원 중심의 친목 축구회"],
    sortOrder: 5,
  }),
  entry("daewoo", ["대우fc", "대우FC", "대우"], {
    teamName: "대우FC",
    chairmanName: "김형식",
    foundedYear: 2002,
    memberCount: 55,
    memberCountLabel: "55명",
    homeGrounds: ["수락산 스포츠타운"],
    teamValues: ["‘큰 벗’이라는 의미", "회원 친목 최우선"],
    sortOrder: 6,
  }),
  entry("madeul", ["마들fc", "마들FC", "마들"], {
    teamName: "마들FC",
    chairmanName: "이중산",
    foundedYear: 1991,
    memberCount: 80,
    memberCountLabel: "약 80명",
    teamValues: ["중원FC와 청계FC 합병", "화합과 번영", "제2의 중흥기"],
    notablePeople: [{ name: "김수근", title: "고문", note: "제15·16대 회장 역임" }],
    sortOrder: 7,
  }),
  entry("biho", ["비호축구회", "비호fc", "비호FC", "비호"], {
    teamName: "비호축구회",
    chairmanName: "이문석",
    foundedYear: 1976,
    memberCount: 70,
    memberCountLabel: "70명",
    teamValues: ["노원구 최초 창단"],
    achievements: ["역대 대회 30회 우승", "2023년 60대 실버부 우승"],
    notablePeople: [{ name: "이권직", title: "고문", note: "제17·18대 회장 역임" }],
    sortOrder: 8,
  }),
  entry("sanggye", ["상계fc", "상계FC", "상계"], {
    teamName: "상계FC",
    chairmanName: "신성진",
    foundedYear: 2025,
    memberCount: 150,
    memberCountLabel: "약 150명",
    homeGrounds: ["재현인조잔디구장"],
    teamValues: ["실력과 단합"],
    achievements: ["2025 서울시 K6리그 B조 디비전리그 우승"],
    sortOrder: 9,
  }),
  entry("sangcheon", ["상천축구회", "상천fc", "상천FC", "상천"], {
    teamName: "상천축구회",
    chairmanName: "정경래",
    foundedYear: 1989,
    memberCount: 50,
    memberCountLabel: "약 50명",
    homeGrounds: ["육사구장"],
    teamValues: ["온수축구회로 창단", "1999년 상천축구회로 개명"],
    achievements: ["2002년 30대 우승", "2004년 30대 우승"],
    notablePeople: [
      { name: "오영도", title: "고문", note: "제19·20대 회장 역임" },
      { name: "박병구", title: "노원구축구협회장", note: "상천축구회 소속" },
    ],
    sortOrder: 10,
  }),
  entry("saebyeoknyeok", ["fc새벽녘", "FC새벽녘", "새벽녘", "새벽녘fc"], {
    teamName: "FC새벽녘",
    chairmanName: "김용만",
    foundedYear: 2010,
    memberCount: 176,
    memberCountLabel: "176명",
    homeGrounds: ["마들스타디움"],
    activityDay: "매주 토요일 이른 새벽",
    teamValues: ["노원구 대표 K6리그 참여"],
    achievements: ["JTBC 뭉쳐야 찬다 4회 출연"],
    sortOrder: 11,
  }),
  entry("won", ["원fc", "원FC"], {
    teamName: "원FC",
    chairmanName: "장수안",
    foundedYear: 2015,
    memberCount: 50,
    memberCountLabel: "50명",
    homeGrounds: ["육사구장"],
    sortOrder: 12,
  }),
  entry("wolgye", ["월계축구회", "월계fc", "월계FC", "월계"], {
    teamName: "월계축구회",
    chairmanName: "김경호",
    foundedYear: 1998,
    memberCount: 50,
    memberCountLabel: "50명",
    homeGrounds: ["경기기계공업고등학교"],
    achievements: ["2017~2022 노원구청장기 50대 경기 3연패", "다수 우승"],
    notablePeople: [{ name: "김우석", title: "상임고문", note: "제34대 회장 역임" }],
    sortOrder: 13,
  }),
  entry("jungpyeong", ["중평축구회", "중평fc", "중평FC", "중평"], {
    teamName: "중평축구회",
    chairmanName: "박정규",
    foundedYear: 1989,
    memberCount: 80,
    memberCountLabel: "80명",
    homeGrounds: ["한국전력공사 인재개발원 운동장"],
    ageRange: "20대~70대",
    teamValues: ["형제애", "선배 존경, 후배 사랑", "세대 화합"],
    notablePeople: [{ name: "김용찬", title: "고문", note: "제28·29대 회장 역임" }],
    sortOrder: 14,
  }),
  entry("cheongwon", ["청원축구회", "청원fc", "청원FC", "청원"], {
    teamName: "청원축구회",
    chairmanName: "백형달",
    foundedYear: 1988,
    memberCount: 100,
    memberCountLabel: "100명",
    homeGrounds: ["청원고등학교"],
    sortOrder: 15,
  }),
  entry("hagye-hwangso", ["하계황소축구회", "하계황소", "하계황소fc"], {
    teamName: "하계황소축구회",
    chairmanName: "김석주",
    foundedYear: 2019,
    memberCount: 76,
    memberCountLabel: "76명",
    homeGrounds: ["경기기계공업고등학교"],
    teamValues: ["순수 아마추어", "열정 중심"],
    sortOrder: 16,
  }),
  entry("hanul", ["한울fc", "한울FC", "한울"], {
    teamName: "한울FC",
    chairmanName: "허정영",
    foundedYear: 2013,
    memberCount: 52,
    memberCountLabel: "약 52명",
    homeGrounds: ["대진고등학교", "경기기계공업고등학교"],
    activityDay: "매주 일요일",
    teamValues: ["공릉동 기반", "즐거운 축구 문화"],
    sortOrder: 17,
  }),
  entry("jfc", ["jfc", "JFC"], {
    teamName: "JFC",
    chairmanName: "신경식",
    foundedYear: 2018,
    memberCount: 65,
    memberCountLabel: "65명",
    homeGrounds: ["을지중학교"],
    sortOrder: 18,
  }),
];

/** 팀 표시명 → 카탈로그 (CMS 최초 시드 전용). 공개/읽기 경로에서 호출 금지. */
export function normalizeClubMatchKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/축구회$/g, "")
    .replace(/fc$/i, "fc");
}

/**
 * CMS 시드 1회용. 저장 이후 공개·미리보기는 `getTeamClubIntro(team)`만 사용.
 */
export function findClubIntroCatalogByTeamName(teamName: string): ClubIntroCatalogEntry | null {
  const key = normalizeClubMatchKey(teamName);
  if (!key) return null;

  const exact = NOWON_UNIT_CLUB_INTRO_CATALOG.filter((e) =>
    e.matchKeys.some((k) => normalizeClubMatchKey(k) === key)
  );
  if (exact.length === 1) return exact[0]!;
  if (exact.length > 1) return null;

  if (key.length < 4) return null;
  const soft = NOWON_UNIT_CLUB_INTRO_CATALOG.filter((e) =>
    e.matchKeys.some((k) => {
      const nk = normalizeClubMatchKey(k);
      return nk.length >= 4 && (key === nk || key.includes(nk) || nk.includes(key));
    })
  );
  return soft.length === 1 ? soft[0]! : null;
}
