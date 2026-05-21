# ⚽ YAGO VIBE SPORTS - 노원구 축구협회 실전 적용 가이드

> **작성일**: 2024년  
> **목적**: 노원구 축구협회 운영 시스템으로 실전 제품화

---

## 📋 목차

1. [실전 적용 기준](#1-실전-적용-기준)
2. [노원구 축구협회 도메인 구조](#2-노원구-축구협회-도메인-구조)
3. [실전 홈 구조](#3-실전-홈-구조)
4. [우선순위별 페이지](#4-우선순위별-페이지)
5. [MVP 범위](#5-mvp-범위)
6. [권한 구조](#6-권한-구조)
7. [Firestore 구조](#7-firestore-구조)
8. [실전 메뉴 구조](#8-실전-메뉴-구조)
9. [개발 순서](#9-개발-순서)

---

## 1️⃣ 실전 적용 기준

### 노원구 축구협회 플랫폼 구조

```
노원구 축구협회
 ├ 협회 관리자
 ├ 리그/시즌 운영
 ├ 참가 팀 등록
 ├ 팀 선수 명단
 ├ 경기 일정
 ├ 경기 결과
 ├ 순위/통계
 ├ 공지/행사
 └ 팀 커뮤니케이션
```

### 플랫폼 성격

```
협회 운영 시스템 + 팀 운영 시스템
```

이건 그냥 앱이 아니라, **실제 협회 운영 도구**입니다.

---

## 2️⃣ 노원구 축구협회 도메인 구조

### 상위 엔티티

```
협회
리그
시즌
팀
선수
경기
순위
공지
행사
채팅
```

### 실제 구조

```
노원구 축구협회
   ↓
리그
   ├ 노원구 K7 리그
   ├ 노원구 생활축구 주말리그
   ├ 노원구 유소년 리그
   └ 노원구 여성 리그

각 리그
   ↓
시즌
   ├ 2025 전반기
   ├ 2025 하반기
   └ 2026 시즌

시즌
   ↓
팀
   ├ 참가 신청
   ├ 승인
   ├ 선수 명단 등록
   ├ 경기 일정
   ├ 결과 입력
   └ 순위 반영
```

---

## 3️⃣ 실전 홈 구조

### 노원구 축구협회 메인 진입 화면

```
노원구 축구협회
축구 리그 및 팀 운영 플랫폼

[ 협회 공지 ]
[ 리그/시즌 ]
[ 참가 팀 ]
[ 경기 일정 ]
[ 순위 ]
[ 선수 등록 ]
[ 팀 이벤트 ]
[ 유소년 아카데미 ]
```

기존 `/sports`를 **노원구 축구협회 전용 협회 허브**로 재해석합니다.

---

## 4️⃣ 우선순위별 페이지

### 1) 협회 대시보드

**경로**: `/federations/nowon-football`

**구성**:
```
협회 공지
진행중 리그
참가 팀 수
예정 경기
최근 결과
승인 대기 팀
```

### 2) 리그 목록

**경로**: `/federations/nowon-football/leagues`

**예시**:
```
노원구 K7 리그
노원구 주말리그
노원구 유소년리그
노원구 여성리그
```

### 3) 시즌 상세

**경로**: `/leagues/{leagueId}/seasons/{seasonId}`

**구성**:
```
시즌 개요
참가 팀
일정
순위
득점 랭킹
징계/경고
공지
```

### 4) 참가 신청 관리

**경로**: `/leagues/{leagueId}/registrations`

**구성**:
```
신청 팀 목록
승인/반려
등록 상태
비고
```

### 5) 팀 명단 관리

**경로**: `/teams/{teamId}/roster`

**구성**:
```
선수 등록
등번호
포지션
상태
출전 가능 여부
```

### 6) 경기 센터

**경로**: `/matches/{matchId}`

**구성**:
```
라인업
실시간 기록
득점
카드
교체
결과
팀 통계
선수 기록
```

---

## 5️⃣ MVP 범위

### MVP 1단계 (최우선)

```
협회 대시보드
리그 생성
시즌 생성
팀 참가 신청/승인
팀 명단 등록
경기 일정 생성
경기 결과 입력
순위 자동 계산
공지
```

이 단계만 돼도 **노원구 축구협회 운영툴**로 바로 쓸 수 있습니다.

### MVP 2단계

```
팀 이벤트
팀 채팅
활동 피드
선수 개인 기록
득점 랭킹
실시간 경기 센터
```

### MVP 3단계

```
유소년 아카데미
AI 경기 분석
커뮤니티 피드
스폰서/마켓
```

---

## 6️⃣ 권한 구조

### 협회 관리자

```
리그 생성
시즌 생성
팀 승인
일정 생성
결과 수정
순위 관리
공지 작성
징계 관리
```

### 리그 운영자

```
해당 리그 경기 일정 관리
결과 확인
공지 작성
참가팀 관리
```

### 팀 관리자

```
팀 등록
선수 명단 등록
경기 확인
이벤트 생성
팀 공지
```

### 선수/일반 사용자

```
경기 일정 보기
결과 보기
랭킹 보기
팀 정보 보기
```

---

## 7️⃣ Firestore 구조

### 노원구 축구협회 기준 고정 구조

```
federations/{federationId}
  - name: "노원구 축구협회"
  - slug: "nowon-football"
  - region: "서울 노원구"

federations/{federationId}/leagues/{leagueId}
  - name: "노원구 K7 리그"
  - sport: "soccer"
  - format: "round_robin"

leagues/{leagueId}/seasons/{seasonId}
  - seasonId: "2025-spring"
  - name: "2025 전반기"
  - startDate, endDate
  - status: "active"

leagues/{leagueId}/registrations/{registrationId}
  - teamId
  - status: "pending" | "approved" | "rejected"

seasons/{seasonId}/teams/{teamId}
  - teamId
  - joinedAt

seasons/{seasonId}/matches/{matchId}
  - matchId
  - round
  - scheduledDate

seasons/{seasonId}/standings/{teamId}
  - teamId
  - points
  - rank

teams/{teamId}
  - name
  - region
  - membership: "member"

teams/{teamId}/roster/{playerId}
  - playerId
  - position
  - number
  - status: "active"

matches/{matchId}
  - homeTeamId
  - awayTeamId
  - seasonId
  - status: "scheduled" | "live" | "finished"

matches/{matchId}/lineups/{playerId}
  - playerId
  - isStarter: true

matches/{matchId}/events/{eventId}
  - type: "goal" | "card" | "substitution"
  - playerId
  - minute

players/{playerId}
  - name
  - teamId
  - position

players/{playerId}/stats/{seasonId}
  - goals
  - assists
  - matches
```

---

## 8️⃣ 실전 메뉴 구조

### 노원구 축구협회용 실제 메뉴

```
노원구 축구협회

├ 협회 홈
├ 공지사항
├ 리그
│   ├ 진행중 리그
│   ├ 시즌
│   ├ 참가 신청
│   ├ 경기 일정
│   ├ 결과
│   └ 순위
├ 팀
│   ├ 참가 팀
│   ├ 팀 상세
│   ├ 팀 명단
│   └ 팀 공지/이벤트
├ 선수
│   ├ 선수 등록
│   ├ 선수 명단
│   └ 개인 기록
├ 경기센터
│   ├ 경기 상세
│   ├ 라인업
│   ├ 기록 입력
│   └ 경기 통계
└ 유소년
    ├ 유소년 리그
    ├ 아카데미
    └ 코치
```

---

## 9️⃣ 개발 순서

### 노원구 축구협회 실전 적용 순서

```
1. federation 생성
2. league 생성
3. season 생성
4. team registration 붙이기
5. roster 붙이기
6. scheduler 붙이기
7. standings 붙이기
8. game center 붙이기
9. notices/events 붙이기
```

---

## 🔟 Cursor용 실전 지시문

```text
We are now turning the YAGO Sports architecture into a real association-league product for "Nowon-gu Football Association" (노원구 축구협회).

Build the platform as a football association operating system.

Core structure:

Federation
→ League
→ Season
→ Team Registration
→ Team Roster
→ Match Schedule
→ Match Result
→ Standings
→ Notices / Events

Create the following priority pages:

1. /federations/nowon-football
Association dashboard

2. /federations/nowon-football/leagues
League list page

3. /leagues/[leagueId]/seasons/[seasonId]
Season dashboard with:
- teams
- matches
- standings
- notices

4. /leagues/[leagueId]/registrations
Team registration approval page

5. /teams/[teamId]/roster
Team roster management page

6. /matches/[matchId]
Game Center page

Use football-specific terminology.

Important:
- This is not a generic sports app anymore.
- This is a real football association league management product.
- Prioritize association admin workflow first.
- Team workspace and communication can be connected after the league operation flow works.

Use TailwindCSS and reusable admin dashboard UI components.
```

---

## ✅ 결론

이제부터 YAGO는:

```
범용 스포츠 설계 단계 종료
↓
노원구 축구협회 실전 제품화 시작
```

다음 작업은 더 이상 추상 설계가 아니라:

```
협회 관리자 화면
리그 운영 화면
시즌 운영 화면
팀 신청/승인 화면
경기 운영 화면
```

이 5개를 실제로 만드는 단계입니다.

---

**작성일**: 2024년  
**상태**: ✅ 노원구 축구협회 실전 적용 가이드 완료
