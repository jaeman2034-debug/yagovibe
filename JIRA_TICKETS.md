# 🎫 YAGO 개발 Jira 티켓 템플릿

> Jira / Notion / Linear 등에 바로 복사해서 사용

---

## 📋 Epic: YAGO Movement OS MVP

**Description:**
러닝 크루를 위한 상태 중심 네비게이션 시스템 MVP 개발

**Acceptance Criteria:**
- [ ] Idle → Listening → Navigating → Arrived 플로우 완성
- [ ] Figma 디자인 100% 구현
- [ ] 상태 전환이 자연스럽게 작동

---

## 🎯 Story: FE-1. 앱 기본 구조 세팅

**Type:** Story  
**Priority:** Highest  
**Estimate:** 4h  
**Sprint:** Week 1

**Description:**
Mobile 기준 레이아웃, Safe Area 대응, Status Bar / Bottom Bar 고정

**Acceptance Criteria:**
- [ ] iOS Safe Area 적용
- [ ] Android Safe Area 적용
- [ ] 헤더/바텀바 고정
- [ ] 화면 회전 대응 (Portrait only)

**Deliverables:**
- `src/layout/AppShell.tsx`
- `src/layout/HomeLayout.tsx`
- `src/layout/constants.ts`

**Labels:** `frontend`, `foundation`, `p0`

---

## 🎯 Story: FE-2. StatusHeader 컴포넌트

**Type:** Story  
**Priority:** Highest  
**Estimate:** 3h  
**Sprint:** Week 1

**Description:**
Figma `StatusHeader` 그대로 구현, Variant 처리 (Idle / Navigating / Arrived)

**Acceptance Criteria:**
- [ ] 4개 Variant 모두 구현
- [ ] Gradient 배경 정확히 매칭
- [ ] 텍스트 길이 대응 (Ellipsis)
- [ ] Figma 디자인 100% 일치

**Deliverables:**
- `src/components/movement/StatusHeader.tsx`

**Dependencies:**
- FE-1

**Labels:** `frontend`, `component`, `p0`

---

## 🎯 Story: FE-3. MapContainer 컴포넌트

**Type:** Story  
**Priority:** Highest  
**Estimate:** 6h  
**Sprint:** Week 1

**Description:**
지도 SDK 연동, 사용자 위치 점 표시, UI 오버레이 금지

**Acceptance Criteria:**
- [ ] 지도 로딩 성공
- [ ] 사용자 위치 표시 (파란 점)
- [ ] 지도 위 UI 오버레이 없음
- [ ] 줌/드래그 정상 작동
- [ ] 지도 숨김/표시 토글 가능

**Deliverables:**
- `src/components/map/MapContainer.tsx`
- `src/components/map/GoogleMapCanvas.tsx`
- `src/components/map/UserLocationDot.tsx`

**Dependencies:**
- FE-1

**Labels:** `frontend`, `component`, `map`, `p0`

---

## 🎯 Story: FE-4. StateBar 컴포넌트

**Type:** Story  
**Priority:** Highest  
**Estimate:** 2h  
**Sprint:** Week 1

**Description:**
하단 고정, 터치 이벤트 없음 (버튼 아님), 상태 표시만

**Acceptance Criteria:**
- [ ] 3개 Variant 모두 구현
- [ ] 터치 이벤트 없음 (pointer-events: none)
- [ ] 하단 고정 (position: fixed)
- [ ] Figma 디자인 100% 일치

**Deliverables:**
- `src/components/movement/StateBar.tsx`

**Dependencies:**
- FE-1

**Labels:** `frontend`, `component`, `p0`

---

## 🎯 Story: FE-5. ActionCue 컴포넌트

**Type:** Story  
**Priority:** High  
**Estimate:** 3h  
**Sprint:** Week 2

**Description:**
네비게이션 중 하단 액션 표시, 단일 행동만 표시

**Acceptance Criteria:**
- [ ] 4개 방향 Variant 구현
- [ ] 하단 96px 위치 (BottomNav 위)
- [ ] 텍스트 길이 대응 (20자 제한)
- [ ] 네비게이션 중에만 표시

**Deliverables:**
- `src/components/movement/ActionCue.tsx`

**Dependencies:**
- FE-3, FE-7

**Labels:** `frontend`, `component`, `p1`

---

## 🎯 Story: FE-6. ArrivalPanel 화면

**Type:** Story  
**Priority:** High  
**Estimate:** 4h  
**Sprint:** Week 2

**Description:**
지도 완전 제거, 버튼 3개 배치, 이후 플로우는 stub

**Acceptance Criteria:**
- [ ] 지도 숨김 (z-index: 50)
- [ ] 버튼 3개 정확히 배치
- [ ] 클릭 시 navigate (stub)
- [ ] Figma 디자인 100% 일치

**Deliverables:**
- `src/components/movement/ArrivalPanel.tsx`

**Dependencies:**
- FE-7

**Labels:** `frontend`, `component`, `p1`

---

## 🎯 Story: FE-7. 상태 전환 로직 (중요)

**Type:** Story  
**Priority:** Highest  
**Estimate:** 8h  
**Sprint:** Week 1-2

**Description:**
화면 전환 ❌, 상태 변경만 (컴포넌트 교체), 애니메이션 최소

**Acceptance Criteria:**
- [ ] Idle → Listening 전환 (Auto / 3s)
- [ ] Listening → Navigating 전환 (Voice Trigger)
- [ ] Navigating → Arrived 전환 (Distance < 20m)
- [ ] Arrived → Idle 전환 (Button Click)
- [ ] 애니메이션 부드러움 (fade 300ms)

**Deliverables:**
- `src/pages/GeneralMapPage.tsx`
- `src/hooks/useMovementState.ts`

**Dependencies:**
- FE-2, FE-3, FE-4, FE-5, FE-6

**Labels:** `frontend`, `state-management`, `p0`

---

## 🎯 Story: FE-8. 음성 입력 UI 연결 (Stub)

**Type:** Story  
**Priority:** Medium  
**Estimate:** 4h  
**Sprint:** Week 2

**Description:**
실제 음성 인식 ❌ (초기엔 mock), Listening 상태 진입 트리거만 구현

**Acceptance Criteria:**
- [ ] Listening 상태 진입 가능
- [ ] Mock 응답으로 Navigating 전환
- [ ] 실제 음성 인식은 Phase 2

**Deliverables:**
- `src/hooks/useVoiceInput.ts` (Stub)

**Dependencies:**
- FE-7

**Labels:** `frontend`, `stub`, `p2`

---

## 🎯 Story: BE-1. 사용자 세션 모델

**Type:** Story  
**Priority:** Highest  
**Estimate:** 3h  
**Sprint:** Week 1

**Description:**
MovementSession 엔티티 정의, Firestore 컬렉션 구조 설계

**Acceptance Criteria:**
- [ ] Firestore 컬렉션 생성
- [ ] 타입 정의 완료
- [ ] 인덱스 설정 (userId, status)

**Deliverables:**
- `functions/src/models/MovementSession.ts`
- `functions/src/firestore/schemas.ts`

**Labels:** `backend`, `database`, `p0`

---

## 🎯 Story: BE-2. 러닝 크루 모델 (MVP)

**Type:** Story  
**Priority:** Highest  
**Estimate:** 2h  
**Sprint:** Week 1

**Description:**
RunningCrew 엔티티 정의, 크루 1개만 하드코딩 가능 (초기)

**Acceptance Criteria:**
- [ ] Firestore 컬렉션 생성
- [ ] Mock 데이터 1개 생성
- [ ] 타입 정의 완료

**Deliverables:**
- `functions/src/models/RunningCrew.ts`
- `functions/src/data/mockCrew.ts`

**Labels:** `backend`, `database`, `p0`

---

## 🎯 Story: BE-3. 상태 추론 API

**Type:** Story  
**Priority:** Highest  
**Estimate:** 6h  
**Sprint:** Week 1

**Description:**
현재 시간 / 위치 / 크루 시간 근접 여부로 상태 추론, 사용자 입력 없이 상태 반환

**Acceptance Criteria:**
- [ ] 시간 기반 상태 추론 정확
- [ ] 크루 정보 조회 성공
- [ ] 에러 핸들링 (크루 없음 등)

**Deliverables:**
- `functions/src/api/getMovementStatus.ts`

**Dependencies:**
- BE-1, BE-2

**Labels:** `backend`, `api`, `p0`

---

## 🎯 Story: BE-4. 네비게이션 상태 API (Stub)

**Type:** Story  
**Priority:** High  
**Estimate:** 4h  
**Sprint:** Week 2

**Description:**
네비게이션 시작/도착 상태 변경, 실제 경로 계산 ❌ (초기엔 stub)

**Acceptance Criteria:**
- [ ] MovementSession 상태 업데이트
- [ ] Firestore 업데이트 성공
- [ ] 실제 경로 계산은 Phase 2

**Deliverables:**
- `functions/src/api/startNavigation.ts`
- `functions/src/api/arriveNavigation.ts`

**Dependencies:**
- BE-1, BE-3

**Labels:** `backend`, `api`, `p1`

---

## 🎯 Story: BE-5. 출석 처리 로직

**Type:** Story  
**Priority:** High  
**Estimate:** 4h  
**Sprint:** Week 2

**Description:**
Arrived 상태 + 시간 ±10분 조건으로 출석 처리

**Acceptance Criteria:**
- [ ] 시간 범위 검증 정확
- [ ] 중복 출석 방지
- [ ] 출석 기록 생성 성공

**Deliverables:**
- `functions/src/api/checkInToCrew.ts`
- `functions/src/models/Attendance.ts`

**Dependencies:**
- BE-2, BE-4

**Labels:** `backend`, `api`, `p1`

---

## 🎯 Story: BE-6. 음성 의도 해석 (Phase 2 Stub)

**Type:** Story  
**Priority:** Medium  
**Estimate:** 2h  
**Sprint:** Week 2 (Stub만)

**Description:**
초기엔 하드코딩, 이후 LLM 연동 (Phase 2)

**Acceptance Criteria:**
- [ ] Stub 응답 반환
- [ ] 타입 정의 완료
- [ ] LLM 연동은 Phase 2

**Deliverables:**
- `functions/src/api/parseVoiceIntent.ts` (Stub)

**Labels:** `backend`, `stub`, `p2`

---

## 🎯 Story: C-1. 상태 머신 정의 (문서)

**Type:** Task  
**Priority:** Highest  
**Estimate:** 2h  
**Sprint:** Week 1 (초반)

**Description:**
상태 다이어그램 작성, FE/BE 공유 문서, 전환 조건 명확화

**Acceptance Criteria:**
- [ ] 상태 다이어그램 완성
- [ ] 전환 조건 명확
- [ ] FE/BE 팀 공유 완료

**Deliverables:**
- `docs/STATE_MACHINE.md`
- `docs/STATE_TRANSITIONS.md`

**Labels:** `documentation`, `shared`, `p0`

---

## 🎯 Story: C-2. Feature Flag

**Type:** Task  
**Priority:** High  
**Estimate:** 3h  
**Sprint:** Week 1

**Description:**
ArrivalPanel ON/OFF, Voice ON/OFF, 테스트 안정성 확보

**Acceptance Criteria:**
- [ ] Feature Flag 시스템 구축
- [ ] 런타임 토글 가능
- [ ] 환경변수 연동

**Deliverables:**
- `src/config/featureFlags.ts`
- `functions/src/config/featureFlags.ts`

**Labels:** `infrastructure`, `p1`

---

## 🎯 Story: C-3. 로그 수집 (중요)

**Type:** Story  
**Priority:** Highest  
**Estimate:** 4h  
**Sprint:** Week 2

**Description:**
DAU ❌, 행동 흐름만 수집, 상태 전환 이벤트 추적

**Acceptance Criteria:**
- [ ] 상태 전환 이벤트 수집
- [ ] Arrival 버튼 클릭 수집
- [ ] 네비게이션 완료율 수집
- [ ] Firestore / Analytics 연동

**Deliverables:**
- `src/utils/analytics.ts`
- `functions/src/utils/logMovementEvent.ts`

**Dependencies:**
- FE-7, BE-4

**Labels:** `analytics`, `p0`

---

## 📊 Sprint Planning

### Week 1
- FE-1, FE-2, FE-3, FE-4, FE-7 (기본)
- BE-1, BE-2, BE-3
- C-1, C-2

### Week 2
- FE-5, FE-6, FE-7 (완성), FE-8
- BE-4, BE-5, BE-6
- C-3

---

## 🏷️ Label 정의

- `frontend`: 프론트엔드 작업
- `backend`: 백엔드 작업
- `component`: UI 컴포넌트
- `api`: API 개발
- `database`: 데이터베이스 작업
- `state-management`: 상태 관리
- `documentation`: 문서화
- `analytics`: 분석/로깅
- `infrastructure`: 인프라
- `stub`: Stub 구현
- `p0`: Critical
- `p1`: High
- `p2`: Medium
