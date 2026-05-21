# 🎯 Event Platform 완전 설계 요약

**생성일**: 2025-01-XX  
**플랫폼 방향**: 생활체육 행사 운영 플랫폼  
**핵심 원칙**: Event First (League는 Event의 한 종류)

---

## 🎯 플랫폼 재정의

### 기존: 리그 중심 플랫폼
```
League → Matches → Stats
```

### 새로운: Event 중심 플랫폼
```
Season → Event → Division → Entry → Match → Record → Stats/Ranking/Awards
```

**핵심**: **League는 Event의 한 종류일 뿐**

---

## 📊 최상위 도메인 구조

```
Organization (협회/구청/운영기관)
  ↓
Season (연도 시즌)
  ↓
Event (행사)
  ├ ceremony (시무식/종무식)
  ├ tournament (토너먼트)
  ├ league (리그)
  ├ academy (유소년 아카데미)
  └ festival (축제)
  ↓
Event Division (부문: U12, 일반부, 장년부 등)
  ↓
Event Entry (참가 신청 단위)
  ↓
Event Match (경기)
  ↓
Record (team_games / player_games)
  ↓
Stats / Ranking / Awards
```

---

## 🔥 핵심 컬렉션 (7개)

### 필수 컬렉션
1. **seasons** - 시즌
2. **events** - 행사
3. **event_divisions** - 행사 부문
4. **event_entries** - 참가 신청
5. **event_matches** - 행사 경기
6. **team_games** - 팀 경기 기록 (기존 활용)
7. **player_games** - 선수 경기 기록

### 보조 컬렉션
8. **event_schedules** - 행사 일정
9. **rankings** - 순위
10. **awards** - 시상

---

## 📋 완료된 작업

### 1. 타입 정의
- ✅ `src/types/event.ts` - Event 타입 정의 (Event, EventDivision, EventEntry, EventMatch, EventSchedule, Ranking, Award)
- ✅ `src/types/teamGame.ts` - `eventId`, `divisionId`, `roundCode` 필드 추가
- ✅ `src/types/playerGame.ts` - Player Game 타입 정의
- ✅ `src/types/season.ts` - Season 타입 정의

### 2. 서비스 레이어
- ✅ `src/services/eventService.ts` - Event 서비스
- ✅ `src/services/seasonService.ts` - Season 서비스

### 3. Firestore 인덱스
- ✅ `firestore.indexes.json` - Event Platform 인덱스 추가

### 4. 문서
- ✅ `docs/EVENT_PLATFORM_ARCHITECTURE.md` - Event Platform 아키텍처
- ✅ `docs/EVENT_PLATFORM_FIRESTORE_DESIGN.md` - Firestore 설계
- ✅ `docs/EVENT_TO_TEAM_GAMES_INTEGRATION.md` - 통합 가이드

---

## 🔄 기존 시스템과의 연결

### 그대로 활용
- ✅ `teams` 컬렉션
- ✅ `team_games` 컬렉션 (필드 확장)
- ✅ `player_stats` 컬렉션
- ✅ `onTeamGameWrite` Cloud Function

### 이름 재정의
- `league_matches` → `event_matches` (eventType=league)
- `tournament_matches` → `event_matches` (eventType=tournament)

### 새로 추가
- ✅ `events`
- ✅ `event_divisions`
- ✅ `event_entries`
- ✅ `event_schedules`
- ✅ `rankings` (보조)
- ✅ `awards` (보조)

---

## 🎮 Event Type별 운영 방식

### 1. Ceremony (시무식/종무식)
- 경기 없음 또는 최소
- 공지/참석/사진 중심

### 2. Tournament (토너먼트)
- 토너먼트 대진
- 승/패 중심
- 우승/준우승/4강 기록

### 3. League (리그)
- 라운드 반복
- 순위표 필요
- 승점/득실/다득점 계산

### 4. Academy (유소년 아카데미)
- 연령 division 중요
- 선수 등록/참가 자격 중요

---

## 📊 상태 머신

### Event Status
```
draft
registration_open
registration_closed
scheduled
ongoing
completed
canceled
```

### Entry Status
```
pending
approved
rejected
withdrawn
```

### Match Status
```
scheduled
live
completed
postponed
canceled
```

### Report Status
```
draft
submitted
confirmed
```

---

## 🚀 다음 단계

### Phase 1: Event Core (즉시 구현)
1. ⭐ **onEventMatchCompleted Cloud Function** 구현
2. **eventService.ts** 확장 (event_entries, event_schedules)
3. **Firestore 인덱스 배포**

### Phase 2: Match Operation
1. **event_matches** 생성/수정
2. **event_schedules** 관리
3. **결과 입력** 시스템

### Phase 3: Derived Data
1. **team_games** 자동 생성
2. **rankings** 계산
3. **awards** 생성

### Phase 4: UI 구현
1. **Event 목록 페이지**
2. **Event 상세 페이지**
3. **Event 참가 신청**
4. **Event 일정 페이지**

---

## 🎯 실제 노원구 행사 구조 적용

### 2026 Season 예시

```
2026 Season

├ 시무식 (ceremony)
├ 협회장기 (tournament)
├ 구청장기 (tournament)
├ 스폰서컵 A (tournament)
├ 스폰서컵 B (tournament)
├ 생활체육 토너먼트 (tournament)
├ 유소년 대회 (academy)
├ K7 대회 (league)
└ 종무식 (ceremony)
```

**모든 것이 Event**

---

## 💡 핵심 포인트

### 기존 시스템 활용
- ✅ Team System
- ✅ Match System
- ✅ Stats System
- ✅ Ranking System
- ✅ League System
- ✅ Tournament System

### 추가한 것
- ⭐ **Event Layer** (events, event_divisions, event_entries, event_matches, event_schedules)

**결과**: 기존 시스템을 거의 그대로 활용하면서 Event 중심 플랫폼 완성

---

## 📝 참고 문서

- `docs/EVENT_PLATFORM_ARCHITECTURE.md` - Event Platform 아키텍처
- `docs/EVENT_PLATFORM_FIRESTORE_DESIGN.md` - Firestore 설계
- `docs/EVENT_TO_TEAM_GAMES_INTEGRATION.md` - 통합 가이드
- `docs/PLATFORM_ROADMAP.md` - 플랫폼 로드맵

---

## 🎉 평가

**현재 플랫폼 구조**: **Sports Platform Core Engine**

**Event Platform 전환**: ✅ **기존 시스템 활용 가능**

**다음 단계**: Cloud Function 구현 + Firestore 인덱스 배포

이 구조가 완성되면 **생활체육 Event Platform**이 됩니다. ⚽
