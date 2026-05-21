# 🗺 YAGO VIBE SPORTS - 노원구 축구협회 전체 화면 IA (Information Architecture)

> **작성일**: 2024년  
> **목적**: 노원구 축구협회 운영 시스템의 전체 화면 구조 및 네비게이션 설계

---

## 📋 목차

1. [최상위 IA](#1-최상위-ia)
2. [사용자용 화면 IA](#2-사용자용-화면-ia)
3. [관리자용 IA](#3-관리자용-ia)
4. [라우팅 구조](#4-라우팅-구조)
5. [컴포넌트 표준](#5-컴포넌트-표준)

---

## 1️⃣ 최상위 IA

### 플랫폼 4개 영역

```
1. 협회 운영
2. 리그/시즌 운영
3. 팀 운영
4. 경기 운영
```

### 최상위 메뉴 구조

```
노원구 축구협회
├ 협회 홈
├ 공지사항
├ 리그
├ 시즌
├ 참가신청
├ 팀
├ 선수
├ 경기센터
├ 순위/기록
├ 행사/이벤트
├ 유소년
└ 관리자
```

### 사용자용 메뉴

```
[협회 홈] [공지] [리그] [경기일정] [순위] [팀] [선수] [유소년]
```

### 관리자용 메뉴

```
[운영대시보드] [리그관리] [시즌관리] [참가승인] [경기관리] [공지관리]
```

---

## 2️⃣ 사용자용 화면 IA

### A. 협회 홈

**경로**: `/federations/nowon-football`

**섹션 구성**:
```
- 상단 협회 소개
- 오늘의 공지
- 진행중 리그
- 이번주 경기
- 최근 경기 결과
- 현재 순위 TOP
- 참가 팀 바로가기
- 유소년/행사 배너
```

**카드 기준**:
```
공지 카드
리그 카드
경기 카드
순위 카드
팀 카드
```

---

### B. 공지사항

**경로**: 
- `/federations/nowon-football/notices`
- `/federations/nowon-football/notices/[noticeId]`

**구성**:
```
- 중요 공지
- 일반 공지
- 대회 공문
- 일정 변경 안내
- 행사 안내
```

**필터**:
```
전체 / 중요 / 리그별 / 행사
```

---

### C. 리그 목록

**경로**: `/federations/nowon-football/leagues`

**구성**:
```
- 노원구 K7 리그
- 노원구 주말리그
- 노원구 유소년리그
- 노원구 여성리그
```

**각 카드 표시**:
```
리그명
진행 시즌
참가 팀 수
경기 수
상태(모집중/진행중/종료)
```

---

### D. 리그 상세

**경로**: `/federations/nowon-football/leagues/[leagueId]`

**구성**:
```
- 리그 소개
- 운영 방식
- 현재 시즌
- 지난 시즌
- 최근 공지
- 참가 신청 버튼
```

---

### E. 시즌 상세 대시보드

**경로**: `/leagues/[leagueId]/seasons/[seasonId]`

**핵심 탭 구조**:
```
개요
참가팀
경기일정
결과
순위
기록
공지
징계
```

#### 개요 탭
```
시즌명
운영 기간
참가 팀 수
전체 경기 수
진행률
최근 결과
다음 경기
```

#### 참가팀 탭
```
팀 목록
팀별 기본 정보
승/무/패 요약
팀 상세 이동
```

#### 경기일정 탭
```
라운드별 일정
경기장
시간
홈/원정
상태
```

#### 결과 탭
```
종료 경기
스코어
득점자
경기 리포트
```

#### 순위 탭
```
순위
승점
승
무
패
득실차
득점
실점
```

#### 기록 탭
```
득점 랭킹
도움 랭킹
경고/퇴장
출전 수
```

#### 징계 탭
```
누적 경고
퇴장
출전 정지
비고
```

---

### F. 참가 신청

**경로**: `/leagues/[leagueId]/apply`

**입력 항목**:
```
팀명
대표자명
연락처
팀 소개
홈구장
참가 리그
선수 예상 인원
서류 업로드
```

**상태**:
```
접수
검토중
보완요청
승인
반려
```

---

### G. 팀 상세

**경로**: `/teams/[teamId]`

**구성**:
```
팀 소개
감독/대표
선수 수
참가 시즌
최근 경기
팀 공지
팀 이벤트
```

**탭**:
```
개요 / 선수명단 / 경기기록 / 공지 / 이벤트
```

---

### H. 팀 명단

**경로**: `/teams/[teamId]/roster`

**표 구성**:
```
선수명
등번호
포지션
생년월일
등록상태
출전가능
경고누적
비고
```

**액션**:
```
선수 추가
수정
비활성화
삭제
출전 가능 상태 변경
```

---

### I. 경기센터

**경로**: `/matches/[matchId]`

**탭 구조**:
```
개요
라인업
경기기록
팀통계
선수기록
결과보고
```

#### 개요
```
홈팀/원정팀
일시
경기장
주심
상태
최종 스코어
```

#### 라인업
```
선발
교체명단
등번호
포지션
주장 표시
```

#### 경기기록
```
득점
도움
경고
퇴장
교체
부상
기타 특이사항
```

#### 팀통계
```
점유율
슈팅
유효슈팅
파울
코너킥
경고
퇴장
```

---

### J. 순위/기록

**경로**: 
- `/seasons/[seasonId]/standings`
- `/seasons/[seasonId]/stats`

시즌 상세 내부 탭으로 통합 가능.

---

### K. 유소년

**경로**: 
- `/federations/nowon-football/youth`
- `/federations/nowon-football/youth/academy`

MVP 이후 확장용.

---

## 3️⃣ 관리자용 IA

### 관리자 최상위 메뉴

```
/admin
├ 운영 대시보드
├ 협회 관리
├ 리그 관리
├ 시즌 관리
├ 참가 신청 관리
├ 팀 관리
├ 선수 등록 관리
├ 경기 일정 관리
├ 경기 결과 관리
├ 순위/기록 관리
├ 공지/팝업 관리
├ 행사 관리
├ 징계 관리
└ 권한 관리
```

### 노원구 축구협회 실전 URL

```
/federations/nowon-football/admin
```

**하위**:
```
/federations/nowon-football/admin/leagues
/federations/nowon-football/admin/seasons
/federations/nowon-football/admin/registrations
/federations/nowon-football/admin/matches
```

---

## 4️⃣ 라우팅 구조

### Public 라우팅

```
/federations/nowon-football
/federations/nowon-football/notices
/federations/nowon-football/notices/[noticeId]
/federations/nowon-football/leagues
/federations/nowon-football/leagues/[leagueId]
/leagues/[leagueId]/seasons/[seasonId]
/leagues/[leagueId]/apply
/teams/[teamId]
/teams/[teamId]/roster
/matches/[matchId]
```

### Admin 라우팅

```
/federations/nowon-football/admin
/federations/nowon-football/admin/leagues
/federations/nowon-football/admin/leagues/[leagueId]
/federations/nowon-football/admin/seasons
/federations/nowon-football/admin/seasons/[seasonId]
/federations/nowon-football/admin/registrations
/federations/nowon-football/admin/teams
/federations/nowon-football/admin/players
/federations/nowon-football/admin/matches
/federations/nowon-football/admin/results
/federations/nowon-football/admin/standings
/federations/nowon-football/admin/notices
/federations/nowon-football/admin/discipline
```

---

## 5️⃣ 컴포넌트 표준

### 공통 UI 컴포넌트

```
StatCard
SectionHeader
FilterBar
DataTable
StatusBadge
LeagueCard
SeasonCard
TeamCard
MatchCard
StandingTable
PlayerTable
NoticeList
ApprovalDrawer
ResultEntryPanel
```

### 상태 배지 표준

```
모집중
접수
검토중
승인
반려
진행중
종료
연기
취소
확정
```

---

## ✅ IA 요약

```
사용자 화면 = 협회 포털
관리자 화면 = 협회 운영 백오피스
핵심 흐름 = 리그 → 시즌 → 팀승인 → 명단 → 일정 → 결과 → 순위
```

---

**작성일**: 2024년  
**상태**: ✅ 노원구 축구협회 전체 화면 IA 완료
