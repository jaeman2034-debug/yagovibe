# 🚀 YAGO 30일 MVP 개발 로드맵

> **작성일**: 2024년  
> **목적**: 지금까지 설계한 YAGO 플랫폼을 30일 내에 MVP로 완성하는 단계별 계획

---

## 📋 목차

1. [MVP 목표](#1-mvp-목표)
2. [전체 타임라인](#2-전체-타임라인)
3. [주차별 상세 계획](#3-주차별-상세-계획)
4. [일일 작업 체크리스트](#4-일일-작업-체크리스트)
5. [우선순위](#5-우선순위)

---

## 1️⃣ MVP 목표

### MVP 완성 기준

```
✅ 협회 생성 및 홈페이지 자동 생성
✅ 팀 등록 및 리그 참가
✅ 리그 생성 및 자동 일정 생성
✅ 경기 결과 입력 및 순위 계산
✅ 팀 디렉토리 및 탐색
✅ 기본 관리자 대시보드
```

### 제외 기능 (Post-MVP)

```
❌ AI Match Reporter (Phase 2)
❌ 고급 통계 분석 (Phase 2)
❌ 모바일 앱 (Phase 3)
❌ 실시간 경기 중계 (Phase 3)
```

---

## 2️⃣ 전체 타임라인

### 30일 MVP 타임라인

```
Week 1 (1-7일): 기반 구조 + Federation 시스템
Week 2 (8-14일): Team 시스템 + Directory
Week 3 (15-21일): League Engine + Match 시스템
Week 4 (22-30일): 통합 + 테스트 + 배포
```

---

## 3️⃣ 주차별 상세 계획

### Week 1: 기반 구조 + Federation 시스템

#### Day 1-2: 프로젝트 설정 및 기반 구조

**목표**: 개발 환경 구축 및 기본 구조 생성

**작업 내용**:
- [ ] Next.js 프로젝트 설정 (이미 완료)
- [ ] Firebase 설정 (Auth, Firestore, Storage)
- [ ] 기본 폴더 구조 생성
- [ ] 공통 컴포넌트 라이브러리 구축
  - [ ] Button, Input, Card, Select
  - [ ] Header, Footer
  - [ ] Loading, Error 상태 컴포넌트
- [ ] 라우팅 구조 설정
- [ ] 타입 정의 (TypeScript)
  - [ ] Federation 타입
  - [ ] Team 타입
  - [ ] League 타입
  - [ ] Match 타입

**완료 기준**:
- ✅ 프로젝트 실행 가능
- ✅ Firebase 연결 확인
- ✅ 기본 컴포넌트 사용 가능

---

#### Day 3-4: Federation Create Wizard

**목표**: 협회 생성 마법사 구현

**작업 내용**:
- [ ] `/platform/federations/create` 라우트 생성
- [ ] Wizard 컴포넌트 구조
  - [ ] Step 1: 기본 정보
  - [ ] Step 2: 운영 범위
  - [ ] Step 3: 브랜드 설정
  - [ ] Step 4: 관리자 계정
  - [ ] Step 5: 생성 확인
- [ ] Progress Bar 컴포넌트
- [ ] 폼 유효성 검사
- [ ] Federation 생성 API
- [ ] 기본 페이지 자동 생성 로직
- [ ] 기본 메뉴 자동 생성 로직

**완료 기준**:
- ✅ 협회 생성 마법사 완전 작동
- ✅ 협회 생성 후 기본 구조 자동 생성
- ✅ `/federations/{slug}` 페이지 접근 가능

**참고 문서**: `YAGO_FEDERATION_CREATE_WIZARD.md`

---

#### Day 5-6: Federation Public Homepage

**목표**: 협회 공개 홈페이지 구현

**작업 내용**:
- [ ] `/federations/{slug}` 페이지 구현
- [ ] Hero Section
- [ ] Quick Stats (팀 수, 선수 수, 리그 수)
- [ ] Upcoming Matches 섹션
- [ ] League Standings 섹션
- [ ] Teams Section
- [ ] Announcements Section
- [ ] Navigation Menu
- [ ] Federation 데이터 조회 API

**완료 기준**:
- ✅ 협회 홈페이지 완전 렌더링
- ✅ 모든 섹션 데이터 표시
- ✅ 반응형 디자인 적용

**참고 문서**: `YAGO_FEDERATION_PUBLIC_HOMEPAGE_COMPLETE.md`

---

#### Day 7: Federation Admin Dashboard 기본 구조

**목표**: 협회 관리자 대시보드 기본 구조

**작업 내용**:
- [ ] `/federations/{slug}/admin` 라우트 생성
- [ ] Admin Layout (Sidebar + Topbar)
- [ ] Dashboard 메인 페이지
- [ ] KPI 카드 (팀 수, 선수 수, 경기 수)
- [ ] Quick Actions
- [ ] 기본 메뉴 구조
  - [ ] 팀 관리
  - [ ] 선수 관리
  - [ ] 리그 관리
  - [ ] 경기 관리
  - [ ] 공지 관리

**완료 기준**:
- ✅ 관리자 대시보드 접근 가능
- ✅ 기본 레이아웃 완성
- ✅ 메뉴 네비게이션 작동

**참고 문서**: `YAGO_FEDERATION_ADMIN_DASHBOARD.md`

---

### Week 2: Team 시스템 + Directory

#### Day 8-9: Team Create & Team Page

**목표**: 팀 생성 및 팀 페이지 구현

**작업 내용**:
- [ ] `/sports/teams/create` 페이지
- [ ] 팀 생성 폼
- [ ] 협회 선택 기능
- [ ] 팀 등록 API
- [ ] `/sports/teams/{slug}` 페이지
- [ ] Team Hero Section
- [ ] Team Stats
- [ ] Participating Leagues
- [ ] Recent Matches
- [ ] Players Section

**완료 기준**:
- ✅ 팀 생성 완전 작동
- ✅ 팀 페이지 완전 렌더링
- ✅ 팀 정보 표시

**참고 문서**: `YAGO_TEAM_PAGE_COMPLETE.md`

---

#### Day 10-11: Team Directory (/sports Redesign)

**목표**: `/sports` 페이지를 팀 디렉토리로 재구성

**작업 내용**:
- [ ] `/sports` 페이지 리팩토링
- [ ] Hero Section 추가
- [ ] Search Bar 구현
- [ ] Filter Panel 구현
- [ ] TeamCard 컴포넌트
- [ ] 섹션별 팀 표시
  - [ ] 인기 팀
  - [ ] 최근 등록 팀
  - [ ] 대회 참가 팀
  - [ ] 유소년 팀
- [ ] 팀 검색 API
- [ ] 팀 필터 API

**완료 기준**:
- ✅ `/sports` 페이지 완전 재구성
- ✅ 검색 및 필터 작동
- ✅ 팀 카드 클릭 시 팀 페이지 이동

**참고 문서**: `YAGO_SPORTS_PAGE_REDESIGN.md`, `YAGO_TEAM_DIRECTORY_COMPLETE.md`

---

#### Day 12-13: Team Join Flow

**목표**: 팀 리그 참가 시스템 구현

**작업 내용**:
- [ ] 팀 페이지에 "리그 참가 신청" 버튼
- [ ] `/sports/teams/{slug}/leagues/join` 페이지
- [ ] 리그 선택 화면
- [ ] 참가 신청 폼
- [ ] 참가 신청 API
- [ ] 협회 관리자 승인 페이지
- [ ] 승인/거절 API
- [ ] 자동 리그 등록 로직

**완료 기준**:
- ✅ 팀이 리그 참가 신청 가능
- ✅ 협회 관리자가 승인/거절 가능
- ✅ 승인 시 자동으로 리그 등록

**참고 문서**: `YAGO_TEAM_JOIN_FLOW_COMPLETE.md`

---

#### Day 14: FAB (Floating Action Button) 개선

**목표**: FAB 메뉴 완성 및 연결

**작업 내용**:
- [ ] FAB 메뉴 UI 개선
- [ ] 모든 생성 페이지 연결
  - [ ] 협회 생성
  - [ ] 팀 생성
  - [ ] 대회 생성
  - [ ] 이벤트 생성
  - [ ] 선수 등록
- [ ] FAB 애니메이션 개선
- [ ] 모바일 반응형 확인

**완료 기준**:
- ✅ FAB 모든 링크 작동
- ✅ UI/UX 개선 완료

---

### Week 3: League Engine + Match 시스템

#### Day 15-16: League Engine - 리그 생성

**목표**: 리그 생성 및 기본 구조

**작업 내용**:
- [ ] `/federations/{slug}/admin/leagues/create` 페이지
- [ ] 리그 생성 폼
- [ ] 리그 데이터 구조
- [ ] 리그 생성 API
- [ ] 리그 목록 페이지
- [ ] 리그 상세 페이지

**완료 기준**:
- ✅ 리그 생성 완전 작동
- ✅ 리그 목록 표시
- ✅ 리그 상세 정보 표시

**참고 문서**: `YAGO_LEAGUE_ENGINE_COMPLETE.md`

---

#### Day 17-18: League Engine - 자동 일정 생성

**목표**: Round Robin 알고리즘 구현

**작업 내용**:
- [ ] Round Robin 알고리즘 구현
- [ ] 홈앤어웨이 옵션
- [ ] 경기 일정 자동 생성 API
- [ ] 경기 일정 표시
- [ ] 경기장 배정 로직 (기본)
- [ ] 일정 최적화 (기본)

**완료 기준**:
- ✅ 팀 등록 시 자동 일정 생성
- ✅ 일정 표시 완전 작동

**참고 문서**: `YAGO_LEAGUE_ENGINE_COMPLETE.md`, `YAGO_AUTO_SCHEDULE_GENERATOR.md`

---

#### Day 19-20: Match Result System

**목표**: 경기 결과 입력 및 순위 계산

**작업 내용**:
- [ ] 경기 결과 입력 페이지
- [ ] 득점자 입력
- [ ] 경고/퇴장 입력
- [ ] 결과 저장 API
- [ ] 순위 자동 계산 로직
- [ ] 순위표 표시
- [ ] 득점 랭킹 표시

**완료 기준**:
- ✅ 경기 결과 입력 완전 작동
- ✅ 순위 자동 계산 및 표시
- ✅ 득점 랭킹 표시

**참고 문서**: `YAGO_LEAGUE_ENGINE_COMPLETE.md`

---

#### Day 21: Standings & Statistics

**목표**: 순위표 및 통계 완성

**작업 내용**:
- [ ] 순위표 페이지 완성
- [ ] 통계 대시보드
- [ ] 팀별 통계
- [ ] 선수별 통계
- [ ] 리그 통계

**완료 기준**:
- ✅ 모든 통계 표시 완료

---

### Week 4: 통합 + 테스트 + 배포

#### Day 22-23: 통합 테스트

**목표**: 전체 플로우 테스트 및 버그 수정

**작업 내용**:
- [ ] 전체 사용자 플로우 테스트
  - [ ] 협회 생성 → 홈페이지 확인
  - [ ] 팀 생성 → 리그 참가
  - [ ] 리그 생성 → 일정 생성
  - [ ] 경기 결과 입력 → 순위 계산
- [ ] 버그 수정
- [ ] UI/UX 개선
- [ ] 성능 최적화

**완료 기준**:
- ✅ 모든 주요 플로우 작동
- ✅ 버그 없음

---

#### Day 24-25: 데이터 마이그레이션 및 샘플 데이터

**목표**: 테스트용 샘플 데이터 생성

**작업 내용**:
- [ ] 샘플 협회 생성
- [ ] 샘플 팀 생성
- [ ] 샘플 리그 생성
- [ ] 샘플 경기 생성
- [ ] 샘플 결과 입력
- [ ] 데이터 검증

**완료 기준**:
- ✅ 샘플 데이터로 전체 플랫폼 테스트 가능

---

#### Day 26-27: 보안 및 권한

**목표**: 보안 규칙 및 권한 시스템 완성

**작업 내용**:
- [ ] Firestore Security Rules 작성
- [ ] 권한 체크 로직
- [ ] 관리자 권한 검증
- [ ] 팀 소유권 검증
- [ ] API 보안 강화

**완료 기준**:
- ✅ 보안 규칙 완성
- ✅ 권한 체크 완전 작동

---

#### Day 28-29: 배포 준비

**목표**: 프로덕션 배포 준비

**작업 내용**:
- [ ] 환경 변수 설정
- [ ] Firebase 프로젝트 설정
- [ ] 도메인 연결
- [ ] SEO 최적화
- [ ] 에러 핸들링 개선
- [ ] 로깅 시스템
- [ ] 모니터링 설정

**완료 기준**:
- ✅ 프로덕션 배포 가능 상태

---

#### Day 30: MVP 배포 및 문서화

**목표**: MVP 배포 및 문서 작성

**작업 내용**:
- [ ] 프로덕션 배포
- [ ] 배포 후 테스트
- [ ] 사용자 가이드 작성
- [ ] 관리자 가이드 작성
- [ ] API 문서 작성
- [ ] README 업데이트

**완료 기준**:
- ✅ MVP 프로덕션 배포 완료
- ✅ 문서화 완료

---

## 4️⃣ 일일 작업 체크리스트

### 매일 확인 사항

```
□ 오늘 작업 목표 확인
□ 전날 작업 완료 여부 확인
□ 버그 트래커 확인
□ 코드 리뷰 (필요시)
□ 일일 스탠드업 (팀 작업 시)
□ 작업 완료 후 커밋 및 푸시
```

---

## 5️⃣ 우선순위

### P0 (필수 - MVP 완성을 위해 반드시 필요)

1. ✅ Federation Create Wizard
2. ✅ Federation Public Homepage
3. ✅ Team Create & Team Page
4. ✅ Team Directory (/sports)
5. ✅ League Engine (기본)
6. ✅ Match Result System
7. ✅ Standings 계산

### P1 (중요 - MVP 품질 향상)

1. ✅ Federation Admin Dashboard (기본)
2. ✅ Team Join Flow
3. ✅ 검색 및 필터
4. ✅ FAB 개선

### P2 (선택 - Post-MVP)

1. ❌ AI Match Reporter
2. ❌ 고급 통계 분석
3. ❌ 실시간 알림
4. ❌ 모바일 앱

---

## 📊 진행 상황 추적

### Week 1 진행률

```
Day 1-2: [ ] 프로젝트 설정
Day 3-4: [ ] Federation Create Wizard
Day 5-6: [ ] Federation Public Homepage
Day 7:   [ ] Federation Admin Dashboard
```

### Week 2 진행률

```
Day 8-9:   [ ] Team Create & Team Page
Day 10-11: [ ] Team Directory
Day 12-13: [ ] Team Join Flow
Day 14:    [ ] FAB 개선
```

### Week 3 진행률

```
Day 15-16: [ ] League Engine - 리그 생성
Day 17-18: [ ] League Engine - 일정 생성
Day 19-20: [ ] Match Result System
Day 21:    [ ] Standings & Statistics
```

### Week 4 진행률

```
Day 22-23: [ ] 통합 테스트
Day 24-25: [ ] 샘플 데이터
Day 26-27: [ ] 보안 및 권한
Day 28-29: [ ] 배포 준비
Day 30:    [ ] MVP 배포
```

---

## 🎯 MVP 완성 기준

### 기능 완성도

```
✅ 협회 생성 및 홈페이지 자동 생성
✅ 팀 등록 및 리그 참가
✅ 리그 생성 및 자동 일정 생성
✅ 경기 결과 입력 및 순위 계산
✅ 팀 디렉토리 및 탐색
✅ 기본 관리자 대시보드
```

### 품질 기준

```
✅ 모든 주요 플로우 작동
✅ 버그 없음
✅ 반응형 디자인 적용
✅ 보안 규칙 완성
✅ 프로덕션 배포 가능
```

---

## 🚀 Post-MVP 계획 (Phase 2)

### 31-60일: 고급 기능

- [ ] AI Match Reporter
- [ ] 고급 통계 분석
- [ ] 실시간 알림
- [ ] 모바일 앱 (React Native)

### 61-90일: 확장

- [ ] 다중 종목 지원
- [ ] 국제화 (i18n)
- [ ] 고급 AI 기능
- [ ] API 공개

---

**작성일**: 2024년  
**상태**: ✅ YAGO 30일 MVP 개발 로드맵 완료
