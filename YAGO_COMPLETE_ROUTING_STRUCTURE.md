# 🗺 YAGO VIBE SPORTS - 전체 플랫폼 라우팅 구조 (실제 서비스 수준)

> **작성일**: 2024년  
> **목적**: YAGO VIBE SPORTS 플랫폼의 완전한 라우팅 구조 정리

---

## 📋 목차

1. [플랫폼 전체 구조](#1-플랫폼-전체-구조)
2. [개인 스포츠 활동 영역](#2-개인-스포츠-활동-영역)
3. [협회 플랫폼 영역](#3-협회-플랫폼-영역)
4. [리그/시즌 영역](#4-리그시즌-영역)
5. [팀 시스템 영역](#5-팀-시스템-영역)
6. [경기 시스템 영역](#6-경기-시스템-영역)
7. [선수 시스템 영역](#7-선수-시스템-영역)
8. [마켓플레이스 영역](#8-마켓플레이스-영역)
9. [커뮤니티 영역](#9-커뮤니티-영역)
10. [관리자 영역](#10-관리자-영역)

---

## 1️⃣ 플랫폼 전체 구조

### 플랫폼 3대 영역

```
YAGO VIBE SPORTS
│
├─ 개인 스포츠 활동 (/sports)
├─ 협회 플랫폼 (/federations)
└─ 공통 기능 (/teams, /matches, /players)
```

### 핵심 원칙

```
/sports = 개인 스포츠 활동
/federations = 협회 SaaS
/teams, /matches, /players = 공통 도메인
```

---

## 2️⃣ 개인 스포츠 활동 영역

### 스포츠 활동 허브

```
/sports
```

**역할**: 개인/팀 중심 스포츠 활동 허브

**모듈**:
- 내 팀
- 경기
- 팀 이벤트
- 선수
- 통계
- 대회
- 유소년 아카데미
- 협회 (진입점)

### 종목별 허브

```
/sports/:sport
```

**예시**:
- `/sports/football` - 축구 허브
- `/sports/basketball` - 농구 허브

**탭**:
- 활동 피드
- 팀
- 이벤트

### 종목별 마켓

```
/sports/:sport/market
/sports/:sport/market/write
/sports/:sport/market/:postId
```

---

## 3️⃣ 협회 플랫폼 영역

### 협회 목록

```
/federations
```

**역할**: 협회 플랫폼 진입점

**표시**: 등록된 모든 협회 목록

### 협회 운영 대시보드

```
/federations/:federationId
```

**예시**:
- `/federations/nowon-football` - 노원구 축구협회

**구성**:
- 요약 카드 (리그 수, 팀 수, 경기 수)
- 진행중 리그
- 승인 대기
- 오늘 경기
- 최근 공지

### 협회 관리자

```
/federations/:federationId/admin
/federations/:federationId/admin/leagues
/federations/:federationId/admin/seasons
/federations/:federationId/admin/registrations
/federations/:federationId/admin/teams
/federations/:federationId/admin/matches
/federations/:federationId/admin/results
/federations/:federationId/admin/standings
/federations/:federationId/admin/notices
```

---

## 4️⃣ 리그/시즌 영역

### 리그 목록

```
/federations/:federationId/leagues
```

### 리그 상세

```
/leagues/:leagueId
```

**구성**:
- 리그 소개
- 운영 방식
- 현재 시즌
- 지난 시즌

### 시즌 대시보드

```
/leagues/:leagueId/seasons/:seasonId
```

**탭**:
- 개요
- 참가팀
- 경기일정
- 결과
- 순위
- 기록
- 공지
- 징계

### 시즌 관리

```
/leagues/:leagueId/seasons/:seasonId/admin
```

---

## 5️⃣ 팀 시스템 영역

### 팀 목록

```
/teams
/teams/search
```

### 팀 상세

```
/teams/:teamId
```

**탭**:
- 개요
- 선수명단
- 경기기록
- 공지
- 이벤트

### 팀 명단 관리

```
/teams/:teamId/roster
```

### 팀 워크스페이스

```
/sports/:sport/team
/sports/:sport/team/activity
/sports/:sport/team/schedule
/sports/:sport/team/members
/sports/:sport/team/records
/sports/:sport/team/notices
```

### 팀 관리

```
/team/:teamId/manage
```

---

## 6️⃣ 경기 시스템 영역

### 경기 목록

```
/matches
```

### 경기 센터 (Game Center)

```
/matches/:matchId
```

**탭**:
- 개요
- 라인업
- 타임라인
- 통계
- 미디어
- 댓글

### 경기 생성

```
/match/create
```

### 경기 결과 입력

```
/matches/:matchId/admin
/matches/:matchId/result
```

---

## 7️⃣ 선수 시스템 영역

### 선수 목록

```
/players
/players/search
```

### 선수 프로필

```
/players/:playerId
```

**구성**:
- 선수 정보
- 개인 기록
- 경기 이력
- 통계

### 선수 통계

```
/player/:playerId/stats
```

### 선수 랭킹

```
/ranking/player
/sports/:sportType/player-ranking
```

---

## 8️⃣ 마켓플레이스 영역

### 마켓 메인

```
/market
```

### 종목별 마켓

```
/sports/:sport/market
/sports/:sport/market/write
/sports/:sport/market/:postId
```

### 판매자 페이지

```
/market/seller
```

---

## 9️⃣ 커뮤니티 영역

### 활동 피드

```
/activity
/sports/:sport/activity
/activity/:postId
```

### 이벤트

```
/events
/events/:eventId
/activity/schedule/create
/activity/schedule/:scheduleId
```

### 채팅

```
/chat
/chat/:roomId
/chat/team/:teamId
```

### 모집

```
/recruit/create
/sports/:sport/recruit/:postId
```

---

## 🔟 관리자 영역

### 플랫폼 관리자

```
/admin
/admin/dashboard
/admin/members
/admin/organizations
/admin/analytics
```

### 협회 관리자

```
/federations/:federationId/admin
```

**하위 메뉴**:
- 운영 대시보드
- 리그 관리
- 시즌 관리
- 참가 신청 관리
- 팀 관리
- 선수 등록 관리
- 경기 일정 관리
- 경기 결과 관리
- 순위/기록 관리
- 공지 관리
- 징계 관리

---

## 📊 플랫폼 영역별 분류

### 개인 스포츠 활동

```
/sports
/sports/:sport
/sports/:sport/team
/sports/:sport/market
/sports/:sport/activity
```

### 협회 플랫폼

```
/federations
/federations/:federationId
/federations/:federationId/admin
/leagues/:leagueId
/leagues/:leagueId/seasons/:seasonId
```

### 공통 도메인

```
/teams
/teams/:teamId
/teams/:teamId/roster
/matches
/matches/:matchId
/players
/players/:playerId
```

### 커뮤니티

```
/activity
/events
/chat
/recruit
```

### 마켓플레이스

```
/market
/sports/:sport/market
```

---

## 🔄 사용자 흐름

### 개인 스포츠 활동 흐름

```
/sports
  ↓
/sports/football
  ↓
/sports/football/team
  ↓
/teams/:teamId
```

### 협회 플랫폼 흐름

```
/sports
  ↓ (협회 카드 클릭)
/federations
  ↓ (노원구 축구협회 선택)
/federations/nowon-football
  ↓ (리그 선택)
/leagues/:leagueId
  ↓ (시즌 선택)
/leagues/:leagueId/seasons/:seasonId
```

### 경기 흐름

```
/leagues/:leagueId/seasons/:seasonId
  ↓ (경기일정 탭)
/matches/:matchId
  ↓ (경기 센터)
```

---

## 🎯 URL 구조 원칙

### 1. 도메인 중심 구조

```
/teams/:teamId
/matches/:matchId
/players/:playerId
/leagues/:leagueId
```

### 2. 계층 구조

```
/federations/:federationId
  /leagues/:leagueId
    /seasons/:seasonId
      /matches/:matchId
```

### 3. 탭 구조

```
/leagues/:leagueId/seasons/:seasonId
  /overview (기본)
  /teams
  /matches
  /standings
  /stats
```

---

## ✅ 레거시 경로 리다이렉트

### 리다이렉트 규칙

```
/sports/federations/:federationId
  → /federations/:federationId

/trade
  → /sports/soccer/market

/app/market
  → /sports/soccer/market
```

---

## 📱 모바일 최적화

### 하단 네비게이션

```
홈 (/home)
활동 (/activity)
거래 (/sports/soccer/market)
지도 (/map)
채팅 (/chat)
마이 (/me)
```

---

## 🔐 권한별 접근 경로

### 일반 사용자

```
/sports
/teams
/matches
/players
/activity
```

### 팀 관리자

```
/sports/:sport/team
/team/:teamId/manage
/teams/:teamId/roster
```

### 협회 관리자

```
/federations/:federationId/admin
/federations/:federationId/admin/leagues
/federations/:federationId/admin/registrations
```

### 플랫폼 관리자

```
/admin
/admin/dashboard
/admin/organizations
```

---

## 🚀 최종 플랫폼 구조 요약

```
YAGO VIBE SPORTS

개인 스포츠 활동
  /sports
  /sports/:sport
  /sports/:sport/team
  /sports/:sport/market

협회 플랫폼
  /federations
  /federations/:federationId
  /federations/:federationId/admin
  /leagues/:leagueId
  /leagues/:leagueId/seasons/:seasonId

공통 도메인
  /teams/:teamId
  /matches/:matchId
  /players/:playerId

커뮤니티
  /activity
  /events
  /chat

마켓플레이스
  /market
  /sports/:sport/market
```

---

**작성일**: 2024년  
**상태**: ✅ YAGO 전체 플랫폼 라우팅 구조 완료
