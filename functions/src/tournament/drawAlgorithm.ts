/**
 * 🔥 조 추첨 알고리즘 고도화 모듈
 * 
 * 레벨 0: 완전 랜덤
 * 레벨 1: 시드 분산 + 랜덤
 * 레벨 2: 시드 + 회피 규칙 + 균형 점수 최적화
 */

export interface Team {
  teamId: string;
  teamName: string;
  seed?: number; // 시드 값 (낮을수록 강함)
  clubId?: string; // 클럽/아카데미 ID
  region?: string; // 지역 정보
}

export interface Division {
  division: string; // "A조", "B조", ...
  teams: Array<Team & { seed: number; isSeedTeam?: boolean }>;
}

export interface AlgorithmConfig {
  level: 0 | 1 | 2;
  seedTeamIds?: string[];
  avoidSameClub?: boolean;
  balanceSeeds?: boolean;
  randomSeed: string;
}

/**
 * 레벨 0: 완전 랜덤
 */
export function distributeLevel0(
  teams: Team[],
  divisionCount: number,
  randomSeed: string
): Division[] {
  const shuffled = shuffleArray(teams, randomSeed);
  return distributeEvenly(shuffled, divisionCount);
}

/**
 * 레벨 1: 시드 분산 + 랜덤
 * - 상위 시드는 서로 다른 조로 자동 분산
 * - 나머지는 랜덤 배치
 */
export function distributeLevel1(
  teams: Team[],
  divisionCount: number,
  seedTeamIds: string[],
  randomSeed: string
): Division[] {
  // 시드팀과 비시드팀 분리
  const seedTeams = teams.filter((t) => seedTeamIds.includes(t.teamId));
  const nonSeedTeams = teams.filter((t) => !seedTeamIds.includes(t.teamId));

  // 시드팀을 시드 순서로 정렬 (낮을수록 강함)
  // 🔥 재현성 보장: sort()는 결정적(deterministic) 함수이므로 시드 불필요
  // 같은 입력(seedTeams 배열)에 대해 항상 같은 결과 보장
  const sortedSeedTeams = seedTeams.sort((a, b) => (a.seed || 0) - (b.seed || 0));

  // 비시드팀 랜덤 셔플
  const shuffledNonSeed = shuffleArray(nonSeedTeams, randomSeed);

  // 조 초기화
  const divisions: Division[] = Array.from({ length: divisionCount }, (_, i) => ({
    division: String.fromCharCode(65 + i) + "조", // A조, B조, ...
    teams: [],
  }));

  // 1. 시드팀을 각 조에 1팀씩 분산 (상위 시드부터)
  sortedSeedTeams.forEach((team, idx) => {
    const divisionIdx = idx % divisionCount;
    divisions[divisionIdx].teams.push({
      ...team,
      seed: 1, // 시드팀은 항상 시드 1
      isSeedTeam: true,
    });
  });

  // 2. 나머지 팀을 랜덤 배치
  shuffledNonSeed.forEach((team, idx) => {
    const divisionIdx = idx % divisionCount;
    const currentSeed = divisions[divisionIdx].teams.length + 1;
    divisions[divisionIdx].teams.push({
      ...team,
      seed: currentSeed,
      isSeedTeam: false,
    });
  });

  return divisions;
}

/**
 * 레벨 2: 시드 + 회피 규칙 + 균형 점수 최적화
 * 
 * 점수 계산:
 * score = seedVariance * 0.6 + sameClubPenalty * 0.3 + regionPenalty * 0.1
 */
export function distributeLevel2(
  teams: Team[],
  divisionCount: number,
  seedTeamIds: string[],
  randomSeed: string,
  avoidSameClub: boolean = true,
  balanceSeeds: boolean = true
): { divisions: Division[]; score: number; metadata: any } {
  const seedTeams = teams.filter((t) => seedTeamIds.includes(t.teamId));
  const nonSeedTeams = teams.filter((t) => !seedTeamIds.includes(t.teamId));

  // 시드팀을 각 조에 먼저 배치
  // 🔥 재현성 보장: sort()는 결정적 함수이므로 시드 불필요
  const sortedSeedTeams = seedTeams.sort((a, b) => (a.seed || 0) - (b.seed || 0));
  const baseDivisions: Division[] = Array.from({ length: divisionCount }, (_, i) => ({
    division: String.fromCharCode(65 + i) + "조",
    teams: sortedSeedTeams
      .filter((_, idx) => idx % divisionCount === i)
      .map((team) => ({
        ...team,
        seed: 1,
        isSeedTeam: true,
      })),
  }));

  // 비시드팀을 여러 번 시도하여 최적 조합 찾기
  let bestDivisions = baseDivisions;
  let bestScore = Infinity;
  const attempts = 100; // 100번 시도

  for (let attempt = 0; attempt < attempts; attempt++) {
    const testSeed = `${randomSeed}_attempt_${attempt}`;
    const shuffled = shuffleArray([...nonSeedTeams], testSeed);
    
    const testDivisions: Division[] = baseDivisions.map((div) => ({
      ...div,
      teams: [...div.teams],
    }));

    // 라운드 로빈 방식으로 배치
    shuffled.forEach((team, idx) => {
      const divisionIdx = idx % divisionCount;
      const currentSeed = testDivisions[divisionIdx].teams.length + 1;
      testDivisions[divisionIdx].teams.push({
        ...team,
        seed: currentSeed,
        isSeedTeam: false,
      });
    });

    // 점수 계산
    const score = calculateDistributionScore(testDivisions, avoidSameClub, balanceSeeds);

    if (score < bestScore) {
      bestScore = score;
      bestDivisions = testDivisions;
    }
  }

  return {
    divisions: bestDivisions,
    score: bestScore,
    metadata: {
      attempts,
      avoidSameClub,
      balanceSeeds,
    },
  };
}

/**
 * 분배 점수 계산
 * 
 * score = seedVariance * 0.6 + sameClubPenalty * 0.3 + regionPenalty * 0.1
 */
function calculateDistributionScore(
  divisions: Division[],
  avoidSameClub: boolean,
  balanceSeeds: boolean
): number {
  let seedVariance = 0;
  let sameClubPenalty = 0;
  let regionPenalty = 0;

  if (balanceSeeds) {
    // 조별 평균 시드 계산
    const avgSeeds = divisions.map((div) => {
      const seeds = div.teams.map((t) => t.seed || 0);
      return seeds.reduce((a, b) => a + b, 0) / seeds.length;
    });

    // 시드 분산 계산 (표준편차)
    const overallAvg = avgSeeds.reduce((a, b) => a + b, 0) / avgSeeds.length;
    const variance = avgSeeds.reduce((sum, avg) => sum + Math.pow(avg - overallAvg, 2), 0) / avgSeeds.length;
    seedVariance = Math.sqrt(variance);
  }

  if (avoidSameClub) {
    // 동일 클럽 페널티 계산
    divisions.forEach((div) => {
      const clubCounts: { [clubId: string]: number } = {};
      div.teams.forEach((team) => {
        if (team.clubId) {
          clubCounts[team.clubId] = (clubCounts[team.clubId] || 0) + 1;
        }
      });
      // 같은 클럽이 2팀 이상이면 페널티
      Object.values(clubCounts).forEach((count) => {
        if (count > 1) {
          sameClubPenalty += count - 1;
        }
      });
    });
  }

  // 지역 페널티 계산
  divisions.forEach((div) => {
    const regionCounts: { [region: string]: number } = {};
    div.teams.forEach((team) => {
      if (team.region) {
        regionCounts[team.region] = (regionCounts[team.region] || 0) + 1;
      }
    });
    // 같은 지역이 3팀 이상이면 페널티
    Object.values(regionCounts).forEach((count) => {
      if (count > 2) {
        regionPenalty += count - 2;
      }
    });
  });

  return seedVariance * 0.6 + sameClubPenalty * 0.3 + regionPenalty * 0.1;
}

/**
 * 균등 분배 (라운드 로빈 방식)
 * 
 * 🔥 핵심 알고리즘:
 * - idx % divisionCount로 라운드 로빈 배치
 * - 홀수팀 자동 처리 (최대 편차 1팀)
 * 
 * 📊 케이스별 예시:
 * 
 * 1️⃣ 4팀, 2조:
 *   - 0%2=0(A), 1%2=1(B), 2%2=0(A), 3%2=1(B)
 *   - 결과: A조 2팀, B조 2팀 ✅
 * 
 * 2️⃣ 5팀, 2조 (홀수):
 *   - 0%2=0(A), 1%2=1(B), 2%2=0(A), 3%2=1(B), 4%2=0(A)
 *   - 결과: A조 3팀, B조 2팀 ✅ (편차 1)
 * 
 * 3️⃣ 8팀, 4조:
 *   - 0%4=0(A), 1%4=1(B), 2%4=2(C), 3%4=3(D), 4%4=0(A), 5%4=1(B), 6%4=2(C), 7%4=3(D)
 *   - 결과: A조 2팀, B조 2팀, C조 2팀, D조 2팀 ✅
 * 
 * 4️⃣ 9팀, 4조 (홀수):
 *   - 0%4=0(A), 1%4=1(B), 2%4=2(C), 3%4=3(D), 4%4=0(A), 5%4=1(B), 6%4=2(C), 7%4=3(D), 8%4=0(A)
 *   - 결과: A조 3팀, B조 2팀, C조 2팀, D조 2팀 ✅ (편차 1)
 * 
 * 5️⃣ 7팀, 2조 (홀수):
 *   - 0%2=0(A), 1%2=1(B), 2%2=0(A), 3%2=1(B), 4%2=0(A), 5%2=1(B), 6%2=0(A)
 *   - 결과: A조 4팀, B조 3팀 ✅ (편차 1)
 */
function distributeEvenly(teams: Team[], divisionCount: number): Division[] {
  const divisions: Division[] = Array.from({ length: divisionCount }, (_, i) => ({
    division: String.fromCharCode(65 + i) + "조",
    teams: [],
  }));

  // 라운드 로빈 방식: idx % divisionCount로 자동 균등 분배
  teams.forEach((team, idx) => {
    const divisionIdx = idx % divisionCount;
    divisions[divisionIdx].teams.push({
      ...team,
      seed: idx + 1,
      isSeedTeam: false,
    });
  });

  return divisions;
}

/**
 * Fisher-Yates 셔플
 */
function shuffleArray<T>(array: T[], seed?: string): T[] {
  const shuffled = [...array];
  
  let random: () => number;
  if (seed) {
    let seedValue = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    random = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      return seedValue / 233280;
    };
  } else {
    random = () => Math.random();
  }
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

