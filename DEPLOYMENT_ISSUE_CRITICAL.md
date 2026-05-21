# 🚨 배포 화면 위반 사항 (긴급)

## ⚠️ 현재 상황

**배포된 화면**: 관리자 대시보드 화면

**문제**: Phase 3에서 합의한 **AssociationOfficialPage**가 배포되지 않았습니다.

---

## ✅ 정상이어야 할 화면 (Phase 3 합의 사항)

### AssociationOfficialPage 구조

**URL**: `/association/:associationId`

**구성 섹션 (6개 고정)**:
1. HeroSection - 협회명/슬로건, 현재 시즌/대회 하이라이트
2. NoticeSection - 공지 리스트 (최신 3~5)
3. TournamentSection - 구청장기 등 주요 대회 카드
4. FacilitySection (대관) - 날짜 선택, 시간 슬롯 그리드
5. StorySection - 사진/스토리 카드
6. ClubSummarySection - 가맹 클럽 리스트 (읽기 전용)

**Edit Mode (`?mode=admin`)**:
- 기존 공식 페이지 위에 hover-only Edit 기능만 주입
- UI 레이아웃 변화 없음
- 편집 버튼은 hover 시에만 표시 (아이콘만)
- public 사용자에게는 DOM 자체가 없음

---

## ❌ 현재 배포된 화면의 문제점

### 위반 사항

1. **별도의 관리자 페이지 존재** ❌
   - Phase 3 범위 위반
   - 관리자 전용 페이지/라우트 생성 금지

2. **운영 현황/회원 관리 화면 포함** ❌
   - Phase 3 범위 위반
   - Phase 4 기능 (로그인/클럽/회계) 포함

3. **공식 페이지 구조 아님** ❌
   - AssociationOfficialPage가 아닌 대시보드 구조

---

## 🎯 즉시 수정 필요 사항

### 필수 조치

1. **AssociationOfficialPage 구현 확인**
   - `/association/:associationId` 라우트
   - 6개 섹션 구조
   - public 화면 = 협회 공식 페이지

2. **Edit Mode 확인**
   - `?mode=admin` 추가 시에만 편집 기능 활성화
   - hover-only 버튼 (아이콘만)
   - 기존 UI 레이아웃 변경 없음

3. **별도 관리자 페이지 제거**
   - `/admin` 라우트 제거
   - 관리자 전용 대시보드 제거
   - 운영 현황/회원 관리 화면 제거

---

## 📋 Phase 3 범위 재확인

### ✅ Phase 3에 포함되는 것

- 협회 공식 페이지 (AssociationOfficialPage)
- 6개 섹션 (Hero, Notice, Tournament, Facility, Story, ClubSummary)
- 관리자 Edit Mode (`?mode=admin`, hover-only)
- Firestore 연동 (notices, tournaments, facilities, stories)

### ❌ Phase 3에 포함되지 않는 것

- 로그인 일반화
- 클럽별 계정
- 회계
- 결제
- 유소년 등록
- **관리자 전용 대시보드**
- **운영 현황 화면**
- **회원 관리 화면**

---

## 🔍 확인 결과

### 현재 상황

1. **AssociationOfficialPage 컴포넌트**: ❌ 존재하지 않음

2. **현재 라우팅**:
   - `/association/:associationId` → `AssociationHome` 컴포넌트 렌더링
   - 파일 위치: `src/pages/AssociationHome.tsx`

3. **문제 원인**:
   - Phase 3에서 합의한 `AssociationOfficialPage`가 구현되지 않음
   - 대신 `AssociationHome`이 사용되고 있으며, 이 컴포넌트가 관리자 대시보드를 렌더링하는 것으로 추정

### 즉시 확인 필요

**AssociationHome.tsx 파일 내용 확인**:
- 이 컴포넌트가 무엇을 렌더링하는지
- 관리자 대시보드인지, 아니면 공식 페이지인지

---

## 🧠 중요 원칙

**Phase 3 목표**: 노원구 축구협회가 '공식적으로 운영 가능한 최소 기능 웹' 상태

**현재 배포된 화면**: 관리자 대시보드 = Phase 4 범위 기능 포함 = 범위 위반

**즉시 조치 필요**: AssociationOfficialPage로 교체 후 재배포

---

**이 문서를 Cursor/개발자에게 전달하여 즉시 수정 요청**

