# 🎯 YAGO SPORTS 플랫폼 로드맵

**생성일**: 2025-01-XX  
**플랫폼 방향**: 지역 아마추어 스포츠 플랫폼 → 학교/클럽 리그 → 스포츠 SNS

---

## 📊 플랫폼 확장 전략

```
1️⃣ 지역 아마추어 스포츠 플랫폼 (Core) ⭐ 현재
   ↓
2️⃣ 학교 / 클럽 리그 플랫폼 (Expansion)
   ↓
3️⃣ 스포츠 SNS + 커뮤니티 (Growth)
```

이 구조는 실제로 **세계 스포츠 플랫폼들이 사용하는 확장 전략**입니다.
예: **TeamSnap / Hudl / GameChanger / PlayHQ**

---

## 1단계: 지역 아마추어 스포츠 플랫폼 ⭐ CORE

### 현재 상태: **MVP 완성 단계**

#### 완성된 시스템
- ✅ Auth (인증)
- ✅ Team (팀)
- ✅ Team Members (팀원)
- ✅ Match (경기 매칭)
- ✅ Team Games (경기 기록)
- ✅ Stats (통계)
- ✅ Ranking (랭킹)
- ✅ Player Stats (선수 기록)
- ✅ League (리그)
- ✅ Tournament (토너먼트)
- ✅ Schedule (일정)

#### 사용 흐름
```
팀 생성
↓
경기 생성
↓
경기 기록
↓
통계
↓
랭킹
↓
리그
```

#### 핵심 기능
- 팀
- 경기
- 통계
- 랭킹
- 리그

---

### 지금 단계에서 추가할 것

#### ⭐ Season System (최우선)

**이유**: 
- 현재 stats는 **전체 누적**입니다
- 하지만 실제 스포츠는 **시즌별**로 관리됩니다
- 2024/2025/2026 시즌별 통계 분리 필요

**구현**:
- `team_games.seasonId` 필드 추가
- `teams/{teamId}/season_stats/{seasonId}` 컬렉션
- 시즌별 랭킹

**상태**: 📋 설계 완료, 구현 준비

---

## 2단계: 학교 / 클럽 리그 플랫폼

### 추가될 시스템

#### Division System
- 1부/2부/3부 리그 구조
- 실력별 분리

#### Promotion / Relegation
- 승격/강등 시스템
- 시즌 종료 시 자동 처리

#### Tournament Expansion
- 학교 대항전
- 동호회 컵
- 지역 컵

#### Team Profile 강화
- 팀 페이지 (`/teams/:teamId`)
- 팀 소개
- 전적
- 선수
- 최근 경기

---

## 3단계: 스포츠 SNS 플랫폼

### 추가될 시스템

#### Activity Feed
- 경기 결과 공유
- 선수 기록 공유
- 리그 순위 공유
- 컬렉션: `activities`

#### Player Profile
- 선수 페이지 (`/players/:playerId`)
- 선수 기록
- 팀
- 랭킹
- 최근 경기

#### Highlight / Media
- 골 영상
- 경기 사진
- 컬렉션: `media`

#### Follow System
- 팀 팔로우
- 선수 팔로우
- 리그 팔로우

---

## 최종 플랫폼 구조

### 경기 레이어
```
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
Player Stats
   ↓
Ranking
```

### SNS 레이어
```
Activities
Media
Follow
```

---

## 현재 프로젝트 수준

### 현재 상태
**Sports Platform Engine**

### 이미 구현된 것
- Team System
- Game System
- Stats
- Ranking
- Player Stats
- League
- Tournament

**평가**: 초기 스타트업 MVP 수준을 넘었습니다.

---

## 지금 딱 해야 하는 것 (추천)

### 순서
1. ⭐ **Season System** (최우선)
2. **Team Profile Page**
3. **Activity Feed**

이 3개만 추가하면 **진짜 서비스 플랫폼 구조**가 됩니다.

---

## 종목 중심 전략

### 현재 지원 종목
- 축구 (football/soccer)
- 농구 (basketball)
- 야구 (baseball)
- 배구 (volleyball)
- 풋살 (futsal)
- 기타 다수

### 추천 시작 종목
**풋살 (Futsal)** 또는 **축구 (Football)**

**이유**:
- 지역 아마추어 리그에서 가장 활발
- 팀 구성이 상대적으로 작음 (5~11명)
- 경기 빈도가 높음
- 통계/랭킹 시스템 활용도 높음

---

## 다음 단계

### 즉시 구현 (Season System)
1. Season 컬렉션 생성
2. team_games에 seasonId 추가
3. 시즌별 통계 분리
4. 시즌별 랭킹

### 중기 구현 (Team Profile + Activity Feed)
1. Team Profile Page
2. Activity Feed 시스템
3. Follow System

### 장기 구현 (Division + Promotion)
1. Division System
2. Promotion/Relegation
3. Tournament Expansion

---

## 참고 문서

- `docs/SEASON_SYSTEM_DESIGN.md` - Season System 설계
- `docs/PLATFORM_DIRECTION_ANALYSIS.md` - 플랫폼 방향 분석
- `docs/TEAM_GAME_SYSTEM_IMPLEMENTATION.md` - 경기 시스템 구현
