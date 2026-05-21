# ⚽ 축구 + 풋살 중심 플랫폼 아키텍처

**생성일**: 2025-01-XX  
**플랫폼 방향**: 축구 + 풋살 중심 → 이후 종목 확장  
**전략**: 하나의 엔진으로 두 종목 처리

---

## 🎯 핵심 전략

### 왜 축구 + 풋살이 좋은 시작인가?

이 두 종목은 **구조가 거의 같습니다**.

**공통 구조**:
```
Team
Player
Game
League
Tournament
Stats
Ranking
```

**차이점**: `sportType`만 다르게 두면 됩니다.

```typescript
sportType: "football"  // 축구
sportType: "futsal"     // 풋살
```

**장점**:
- 하나의 엔진으로 두 종목 처리
- 코드 재사용성 극대화
- 이후 종목 확장 용이

---

## 📊 종목 기반 구조

### 핵심 원칙: 모든 주요 데이터에 `sportType` 포함

#### Teams
```typescript
teams/{teamId}
{
  name: "노원FC",
  sportType: "football",  // 또는 "futsal"
  region: "서울 노원구",
  regionCode: "SEOUL_NOWON"
}
```

#### Team Games
```typescript
team_games/{gameId}
{
  sportType: "futsal",
  homeTeamId: "teamA",
  awayTeamId: "teamB",
  // ...
}
```

#### Leagues
```typescript
leagues/{leagueId}
{
  name: "노원 풋살 리그",
  sportType: "futsal",
  region: "서울 노원구",
  regionCode: "SEOUL_NOWON"
}
```

#### Player Stats
```typescript
player_stats/{playerId}
{
  playerId: "uid123",
  sportType: "football",
  games: 12,
  goals: 8,
  assists: 5
}
```

---

## ⚽ 축구 / 풋살 스탯 구조

### Player Stats (공통)

```typescript
player_stats/{playerId}
{
  playerId: string;
  sportType: "football" | "futsal";
  
  // 경기 수
  games: number;
  
  // 공격 기록
  goals: number;
  assists: number;
  shots: number;
  
  // 경고/퇴장
  yellowCards: number;
  redCards: number;
  
  // 출전 시간
  minutesPlayed: number;
  
  // 계산 필드
  goalsPerGame: number;
  assistsPerGame: number;
}
```

### Team Stats (공통)

```typescript
teams/{teamId}.stats
{
  games: number;
  wins: number;
  draws: number;
  losses: number;
  
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  
  winRate: number;
  
  lastResult: "win" | "draw" | "loss" | null;
  streakType: "win" | "loss" | "draw" | "none";
  streakCount: number;
}
```

---

## 🎮 경기 규칙 차이

### Sport Rules 레이어

축구와 풋살은 **경기 규칙이 약간 다릅니다**.

**해결책**: `sport_rules` 컬렉션 추가

```typescript
sport_rules/{sportType}
{
  sportType: "football",
  
  // 팀 구성
  playersPerTeam: 11,
  substitutesAllowed: 3,
  
  // 경기 시간
  matchDuration: 90,  // 분
  halfDuration: 45,
  
  // 규칙
  offsideRule: true,
  penaltyShootout: true,
  
  // 통계 기준
  statsEnabled: {
    goals: true,
    assists: true,
    shots: true,
    cards: true,
    minutes: true
  }
}
```

**풋살 규칙**:
```typescript
{
  sportType: "futsal",
  playersPerTeam: 5,
  substitutesAllowed: 7,  // 무제한 교체
  matchDuration: 40,  // 20분 x 2
  halfDuration: 20,
  offsideRule: false,  // 풋살은 오프사이드 없음
  penaltyShootout: true,
  statsEnabled: {
    goals: true,
    assists: true,
    shots: true,
    cards: true,
    minutes: true
  }
}
```

---

## 🗺️ 지역 기반 플랫폼 구조

### Region Code 시스템

**핵심**: 모든 주요 데이터에 `regionCode` 포함

```typescript
// 지역 코드 구조
type RegionCode = 
  | "SEOUL_NOWON"      // 서울 노원구
  | "SEOUL_GANGNAM"    // 서울 강남구
  | "SEOUL_MAPO"       // 서울 마포구
  | "GYEONGGI_UIJEONGBU"  // 경기 의정부
  | "GYEONGGI_SUWON"   // 경기 수원
  | "GYEONGGI_SEONGNAM"   // 경기 성남
  | "INCHEON"          // 인천
  | "BUSAN"            // 부산
  // ...
```

### 사용 예시

#### Teams
```typescript
teams/{teamId}
{
  name: "노원FC",
  sportType: "futsal",
  region: "서울 노원구",
  regionCode: "SEOUL_NOWON"
}
```

#### Leagues
```typescript
leagues/{leagueId}
{
  name: "노원 풋살 리그",
  sportType: "futsal",
  region: "서울 노원구",
  regionCode: "SEOUL_NOWON"
}
```

#### Matches (경기 매칭)
```typescript
matches/{matchId}
{
  sportType: "football",
  region: "서울 노원구",
  regionCode: "SEOUL_NOWON",
  // ...
}
```

---

## 📍 지역별 기능

### 지역 리그
```typescript
// 노원구 풋살 리그
leagues where regionCode == "SEOUL_NOWON" and sportType == "futsal"
```

### 지역 랭킹
```typescript
// 노원구 팀 랭킹
teams where regionCode == "SEOUL_NOWON" and sportType == "futsal"
order by stats.winRate desc
```

### 지역 매칭
```typescript
// 노원구 경기 매칭
matches where regionCode == "SEOUL_NOWON" and sportType == "futsal"
```

---

## 🎯 사용자 흐름

### 축구 / 풋살 사용자 흐름

```
1. 팀 생성
   ↓
2. 팀원 모집
   ↓
3. 경기 매칭 (상대 찾기)
   ↓
4. 경기 기록
   ↓
5. 팀 통계 자동 업데이트
   ↓
6. 랭킹 확인
   ↓
7. 리그 참가
   ↓
8. 시즌별 성적 관리
```

---

## 🚀 플랫폼 성장 구조

### Phase 1: 지역 풋살 / 축구 플랫폼 (현재)

**기능**:
- ✅ 팀 생성/관리
- ✅ 경기 기록
- ✅ 통계/랭킹
- ✅ 리그 시스템
- ✅ 경기 매칭

**목표 지역**: 서울 노원구 (또는 수도권 전체)

---

### Phase 2: 학교 / 클럽 리그

**추가 기능**:
- Division System (1부/2부/3부)
- Season System (시즌별 통계)
- Promotion/Relegation (승격/강등)

---

### Phase 3: 스포츠 SNS

**추가 기능**:
- Activity Feed (활동 피드)
- Player Profile (선수 프로필)
- Highlight/Media (영상/사진)
- Follow System (팔로우)

---

## 📊 최종 플랫폼 구조

### 경기 레이어
```
sportType
   ↓
regionCode
   ↓
Season
   ↓
League
   ↓
Division
   ↓
Teams
   ↓
Games
   ↓
Stats
   ↓
Ranking
```

### SNS 레이어
```
Player Stats
Activities
Media
Follow
```

---

## 🔧 구현 우선순위

### 즉시 구현 (Phase 1)
1. ⭐ **Season System** (시즌별 통계 분리)
2. **Sport Rules** (경기 규칙 레이어)
3. **Region Code** 정리 및 표준화

### 중기 구현 (Phase 2)
1. **Team Profile Page** (`/teams/:teamId`)
2. **Activity Feed** 시스템
3. **Division System**

### 장기 구현 (Phase 3)
1. **Promotion/Relegation**
2. **Media/Highlight** 시스템
3. **Follow System**

---

## 📝 참고 문서

- `docs/PLATFORM_ROADMAP.md` - 플랫폼 로드맵
- `docs/SEASON_SYSTEM_DESIGN.md` - 시즌 시스템 설계
- `src/types/teamGame.ts` - 경기 타입 정의
- `src/types/season.ts` - 시즌 타입 정의

---

## 🎉 평가

**현재 플랫폼 구조**: **Sports Platform Core Engine**

**축구 + 풋살 중심 전략**: ✅ **최적의 시작 전략**

**다음 단계**: Season System + Sport Rules + Region Code 정리

이 구조가 완성되면 **실제 서비스 플랫폼**이 됩니다. ⚽
