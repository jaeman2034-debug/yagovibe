# 🚀 8주 구현 백로그 – 축구 허브 플랫폼

**목표 상태 (Week 8 End)**
- 스토리 존 + 혼합D + 시즌 자동 → 실데이터 동작
- 구장 예약/결제 → 실결제
- 커뮤니티(팀/리그) 기본
- AB·로그·대시보드 v2
- 지역 멀티 허브 1개(서울) 오픈

---

## 🔵 Week 1 – 기반 & 데이터 계약

**목표**: FE/BE 인터페이스 확정, Story 코어 API

### BE 작업

#### STORY-101: Story CRUD API 구현
- [ ] `GET /api/stories` - 목록 조회 (region, status, 기간 필터)
- [ ] `POST /api/stories` - 생성 (기본 7일 자동)
- [ ] `PATCH /api/stories/:id` - 수정 (우선순위, 기간)
- [ ] `DELETE /api/stories/:id` - 삭제 (soft delete)
- [ ] 기간 정책 적용 (startAt/endAt 검증)
- [ ] 상태 머신 (DRAFT → PUBLISHED → EXPIRED)

**예상 시간**: 2일

#### STORY-102: 혼합D 엔진 서버 이식
- [ ] `mixStoriesD` 로직 서버 이식
- [ ] source별 우선순위 정렬
- [ ] 최대 5개 슬롯 제한
- [ ] seed 폴백 로직

**예상 시간**: 1일

#### LOG-103: 이벤트 표준 10개 적용
- [ ] 이벤트 수집 API (`POST /api/analytics/events`)
- [ ] 중복 제거 (sessionId + timestamp + hash)
- [ ] 오프라인 큐 지원
- [ ] 이벤트 타입: hub_view, story_impression, story_click, story_route, ground_view, slot_select, reserve_create, payment_success, payment_fail, api_error

**예상 시간**: 1.5일

### FE 작업

#### STORY-201: StoryZone API 연결
- [ ] `useStoriesForZone` 훅 수정 (API 호출)
- [ ] seed → api 전환 로직
- [ ] 로딩/에러 상태 처리
- [ ] 캐시 전략 적용 (10분 TTL)

**예상 시간**: 1일

#### STORY-202: StoryZone UI 완성
- [ ] 캐러셀 동작 확인
- [ ] CTA 라우팅 연결
- [ ] 인디케이터/네비게이션
- [ ] 반응형 대응

**예상 시간**: 0.5일

### 산출물
- ✅ 스토리 실노출
- ✅ 로그 발생

**Week 1 총 예상 시간**: 6일

---

## 🔵 Week 2 – 시즌 자동화 + Admin

**목표**: 대회 유무로 시즌 전환, 관리자가 스토리 등록

### BE 작업

#### SEASON-101: 협회 어댑터 구현
- [ ] `GET /api/assoc/leagues` - 대회 목록
- [ ] `GET /api/assoc/notices` - 공지 목록
- [ ] `GET /api/assoc/recruitments` - 모집 목록
- [ ] 어댑터 함수 (leagueToStory, noticeToStory, recruitmentToStory)
- [ ] 자동 스토리 생성 (cron job)

**예상 시간**: 2일

#### SEASON-102: Season Detector 구현
- [ ] `detectSeasonDecision` 로직
- [ ] 대회 존재 확인 (진행 중, 7일 이내)
- [ ] 협회 스토리 카운트 (2개 이상)
- [ ] decisionReason 기록

**예상 시간**: 1일

#### ADMIN-103: Admin Story API
- [ ] `GET /api/admin/stories` - 관리자 목록
- [ ] `POST /api/admin/stories` - 생성 (권한 체크)
- [ ] `PATCH /api/admin/stories/:id/priority` - 우선순위 수정
- [ ] `PATCH /api/admin/stories/:id/extend` - 기간 연장

**예상 시간**: 1일

### FE 작업

#### ADMIN-201: Admin Story 폼
- [ ] 제목/서브 입력 (40/60자 제한)
- [ ] 카테고리 선택
- [ ] 출처 선택 (운영/협회/사용자)
- [ ] 기간 피커 (기본 7일)
- [ ] 우선순위 슬라이더 (0-100)
- [ ] 미리보기

**예상 시간**: 1.5일

#### LOG-202: Season Reason 로그 기록
- [ ] 로그에 mode, decisionReason 포함
- [ ] 대시보드 표시 준비

**예상 시간**: 0.5일

### 산출물
- ✅ 대회 유무로 시즌 전환
- ✅ 관리자가 스토리 등록

**Week 2 총 예상 시간**: 6일

---

## 🔵 Week 3 – 구장 도메인

**목표**: 예약 준비 단계

### BE 작업

#### GROUND-101: Ground/Slot 모델
- [ ] Ground 스키마 (id, name, region, lat, lng, address, capacity)
- [ ] Slot 스키마 (id, groundId, start, end, price, status)
- [ ] `GET /api/grounds` - 목록 (region 필터)
- [ ] `GET /api/grounds/:id` - 상세
- [ ] `GET /api/grounds/:id/slots` - 슬롯 목록 (날짜 필터)

**예상 시간**: 2일

#### GROUND-102: 예약 생성 + 락
- [ ] `POST /api/reservations` - 예약 생성
- [ ] Slot 락 (5분 TTL)
- [ ] 중복 예약 방지
- [ ] 예약 만료 처리 (cron)

**예상 시간**: 1.5일

### FE 작업

#### GROUND-201: 구장 목록/상세
- [ ] 구장 목록 화면
- [ ] 구장 상세 화면
- [ ] 슬롯 선택 UI
- [ ] 예약 생성 폼

**예상 시간**: 2일

#### STORY-202: Story CTA → 구장 연결
- [ ] CTA 클릭 시 구장 목록으로 이동
- [ ] 딥링크 지원 (`/r/:region/ground/:id`)

**예상 시간**: 0.5일

#### LOG-203: 구장 이벤트 로깅
- [ ] `ground_view` 로그
- [ ] `slot_select` 로그

**예상 시간**: 0.5일

### 산출물
- ✅ 예약 준비 단계

**Week 3 총 예상 시간**: 6.5일

---

## 🔵 Week 4 – 결제 연동 (MVP)

**목표**: 실결제 1회 성공

### BE 작업

#### PAYMENT-101: PG 연동 (요청/웹훅)
- [ ] 토스페이 연동 (또는 선택한 PG)
- [ ] `POST /api/payments/request` - 결제 요청
- [ ] `POST /api/webhook/pay` - 웹훅 처리
- [ ] 결제 상태 업데이트 (REQUEST → APPROVED/FAILED)

**예상 시간**: 2.5일

#### PAYMENT-102: 결제 상태 머신
- [ ] 상태 전이 규칙
- [ ] 중복 결제 방지
- [ ] 환불 처리 (24h 전 100%, 6h 전 50%)

**예상 시간**: 1일

#### SETTLEMENT-103: 정산 기본 계산
- [ ] 수수료 계산 (플랫폼 10%, 구장 90%)
- [ ] 정산 항목 생성
- [ ] 정산 주기 계산 (주 1회)

**예상 시간**: 1일

### FE 작업

#### PAYMENT-201: 결제 플로우
- [ ] 결제 요청 화면
- [ ] PG 결제창 연동
- [ ] 결제 완료 화면
- [ ] 결제 실패 처리

**예상 시간**: 1.5일

#### LOG-202: 결제 이벤트 로깅
- [ ] `payment_request` 로그
- [ ] `payment_success` 로그
- [ ] `payment_fail` 로그

**예상 시간**: 0.5일

### 산출물
- ✅ 실결제 1회 성공

**Week 4 총 예상 시간**: 6.5일

---

## 🔵 Week 5 – 커뮤니티 (팀/리그)

**목표**: 팀 가입 → 스토리 노출

### BE 작업

#### TEAM-101: Team/League 모델
- [ ] Team 스키마 (id, name, region, level, members, recruitStatus)
- [ ] League 스키마 (id, name, region, teams, matches, status)
- [ ] `GET /api/teams` - 목록
- [ ] `POST /api/teams/:id/join` - 가입 신청
- [ ] `POST /api/teams/:id/join/approve` - 가입 승인

**예상 시간**: 2일

#### LEAGUE-102: 리그 일정
- [ ] `GET /api/leagues` - 목록
- [ ] `GET /api/leagues/:id` - 상세
- [ ] `POST /api/leagues/:id/matches` - 경기 생성
- [ ] `POST /api/matches/:id/result` - 결과 입력

**예상 시간**: 1.5일

#### STORY-103: 모집 자동 생성
- [ ] 팀 모집 → 스토리 변환
- [ ] 리그 일정 → 시즌 스토리
- [ ] 경기 임박 → 우선 노출

**예상 시간**: 1일

### FE 작업

#### TEAM-201: 팀 찾기/가입
- [ ] 팀 목록 화면
- [ ] 팀 상세 화면
- [ ] 가입 신청 폼
- [ ] 가입 승인 알림

**예상 시간**: 1.5일

#### LEAGUE-202: 리그 일정
- [ ] 리그 목록 화면
- [ ] 리그 상세 (대진표, 랭킹)
- [ ] 경기 결과 입력 (운영자)

**예상 시간**: 1일

### 산출물
- ✅ 팀 가입 → 스토리 노출

**Week 5 총 예상 시간**: 6.5일

---

## 🔵 Week 6 – AB + 개인화

**목표**: A/B 측정

### BE 작업

#### AB-101: 실험 할당
- [ ] `POST /api/experiments/assign` - 사용자 할당
- [ ] 일관성 보장 (userId 또는 localStorage seed)
- [ ] variant 저장 (A/B)

**예상 시간**: 1일

#### AB-102: CTR 집계
- [ ] Daily CTR 계산
- [ ] variant별 CTR 비교
- [ ] 통계적 유의성 검정

**예상 시간**: 1.5일

#### PERSONAL-103: Re-rank 1.0
- [ ] 사용자 관심사 기반 정렬
- [ ] 클릭 이력 반영
- [ ] 지역 우선순위

**예상 시간**: 1일

### FE 작업

#### AB-201: Variant 분기
- [ ] StoryZone variant 적용
- [ ] ActionGrid variant 적용
- [ ] 로그에 variant 포함

**예상 시간**: 1일

#### ANALYTICS-202: CTR 집계 화면
- [ ] 실험 목록
- [ ] variant별 CTR 표시
- [ ] 승자 추천

**예상 시간**: 1일

### 산출물
- ✅ A/B 측정

**Week 6 총 예상 시간**: 5.5일

---

## 🔵 Week 7 – 대시보드 v2

**목표**: 운영 대시보드

### BE 작업

#### DASHBOARD-101: Daily KPI 롤업
- [ ] `GET /api/admin/dashboard/kpi` - Daily KPI
- [ ] Story CTR 계산
- [ ] Booking CR 계산
- [ ] Revenue 집계
- [ ] Health Score 계산

**예상 시간**: 2일

#### DASHBOARD-102: Funnel 분석
- [ ] `GET /api/admin/dashboard/funnel` - Funnel 분석
- [ ] 단계별 전환률 계산
- [ ] 지역별 비교

**예상 시간**: 1일

### FE 작업

#### DASHBOARD-201: 관제 홈
- [ ] 지역별 상태 카드
- [ ] KPI 트렌드
- [ ] 위험 알림
- [ ] 건강 점수

**예상 시간**: 1.5일

#### DASHBOARD-202: AB 패널
- [ ] 실험 목록
- [ ] variant CTR 비교
- [ ] 승자 추천
- [ ] 강제 전환 버튼

**예상 시간**: 1일

#### DASHBOARD-203: 정산 화면
- [ ] 정산 목록
- [ ] 정산 상세
- [ ] 수수료 내역

**예상 시간**: 1일

### 산출물
- ✅ 운영 대시보드

**Week 7 총 예상 시간**: 6.5일

---

## 🔵 Week 8 – 지역 허브 오픈

**목표**: 서울 허브 정식 오픈

### BE 작업

#### REGION-101: Region 라우팅
- [ ] `GET /api/stories?region=seoul` - 지역 필터
- [ ] `GET /api/grounds?region=seoul` - 지역 필터
- [ ] `GET /api/teams?region=seoul` - 지역 필터

**예상 시간**: 1일

#### ONBOARDING-102: 지역 선택 API
- [ ] `POST /api/onboarding/region` - 지역 선택
- [ ] 온보딩 상태 저장
- [ ] 지역별 콘텐츠 세트

**예상 시간**: 0.5일

### FE 작업

#### REGION-201: Region 라우팅
- [ ] `/r/:region` 라우트
- [ ] RegionContext 적용
- [ ] 지역별 데이터 필터링

**예상 시간**: 1일

#### ONBOARDING-202: 지역 선택
- [ ] 위치 기반 감지
- [ ] 지역 선택 바텀시트
- [ ] 온보딩 플로우

**예상 시간**: 1.5일

#### MAP-203: 구장 지도
- [ ] 지도 연동 (카카오/네이버)
- [ ] 구장 마커 표시
- [ ] 길찾기 기능

**예상 시간**: 1.5일

#### SHARE-204: SNS 딥링크
- [ ] 공유 기능
- [ ] 딥링크 라우팅
- [ ] OG 메타 태그

**예상 시간**: 1일

### 산출물
- ✅ 서울 허브 정식 오픈

**Week 8 총 예상 시간**: 6.5일

---

## 📦 우선 구현 티켓 (예시)

### STORY-101: Story CRUD + 기간 정책
**우선순위**: P0 (필수)  
**예상 시간**: 2일  
**담당**: BE  
**수용 기준**:
- [ ] Story 생성/수정/삭제 가능
- [ ] 기본 7일 자동 적용
- [ ] 상태 머신 동작
- [ ] 기간 검증

### GROUND-201: Slot Lock + 중복결제 차단
**우선순위**: P0 (필수)  
**예상 시간**: 1.5일  
**담당**: BE  
**수용 기준**:
- [ ] Slot 락 5분 TTL
- [ ] 중복 예약 방지
- [ ] 중복 결제 차단
- [ ] 만료 자동 해제

### EXP-301: AB 할당/로그/CTR 계산
**우선순위**: P1 (중요)  
**예상 시간**: 2일  
**담당**: BE + FE  
**수용 기준**:
- [ ] 일관성 있는 할당
- [ ] 로그에 variant 포함
- [ ] CTR 계산 정확
- [ ] 통계적 유의성 검정

---

## 👥 인력 구성 (권장)

- **FE**: 1명 (풀타임)
- **BE**: 1명 (풀타임)
- **PM**: 0.5명 (파트타임)
- **디자인**: 0.3명 (파트타임)

**총 인력**: 2.8명

---

## ⚠️ 위험 관리

### 위험 1: PG 지연
**대응**: 모의결제로 먼저 플로우 검증

### 위험 2: 협회 미연동
**대응**: seed 데이터로 대체, 수동 입력 가능

### 위험 3: 트래픽 급증
**대응**: 캐시 전략, CDN, 오프라인 우선

---

## 📊 진행률 추적

### Week 1 체크리스트
- [ ] Story CRUD API
- [ ] 혼합D 엔진
- [ ] 이벤트 표준
- [ ] StoryZone API 연결

### Week 2 체크리스트
- [ ] 협회 어댑터
- [ ] Season Detector
- [ ] Admin Story 폼

### Week 3 체크리스트
- [ ] Ground/Slot 모델
- [ ] 예약 생성
- [ ] 구장 UI

### Week 4 체크리스트
- [ ] PG 연동
- [ ] 결제 플로우
- [ ] 정산 계산

### Week 5 체크리스트
- [ ] Team/League 모델
- [ ] 팀 가입
- [ ] 리그 일정

### Week 6 체크리스트
- [ ] AB 할당
- [ ] CTR 집계
- [ ] Re-rank

### Week 7 체크리스트
- [ ] Daily KPI
- [ ] 관제 홈
- [ ] AB 패널

### Week 8 체크리스트
- [ ] Region 라우팅
- [ ] 지역 선택
- [ ] 지도 연동
- [ ] SNS 딥링크

---

## 🎯 마일스톤

- **M1 (Week 2)**: 스토리 존 실데이터 동작
- **M2 (Week 4)**: 실결제 성공
- **M3 (Week 5)**: 커뮤니티 기본 기능
- **M4 (Week 7)**: 운영 대시보드
- **M5 (Week 8)**: 서울 허브 오픈

---

## 다음 단계

원하면 다음도 바로 내려줄 수 있습니다:

1. **Jira 티켓 형식** (JSON export)
2. **API 스펙 문서** (OpenAPI/Swagger)
3. **ERD 초안** (데이터베이스 스키마)

👉 어떤 포맷으로 받을래?
**A. Jira 티켓**  
**B. Notion 스펙**  
**C. 코드 우선 (API stub)**
