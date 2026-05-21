# Phase 3 롤백 후 정상 화면 체크리스트

## 🎯 목적

롤백 완료 후 Phase 3 MVP 설계 준수 여부를 확인한다.

---

## ✅ Phase 3 MVP 기준선 (재확인)

### 허용되는 화면

**단 하나**: `AssociationOfficialPage`

- URL: `/association/:associationId`
- 공개 페이지 (로그인 불필요)
- 6개 섹션 구조

### Edit Mode

- URL: `/association/:associationId?mode=admin`
- 기존 공식 페이지 위에 hover-only Edit 기능만 주입
- UI 레이아웃 변화 없음

---

## 📋 체크리스트

### 1️⃣ 구조 체크

- [ ] **단일 진입점**: `/association/:associationId`만 존재
- [ ] **6개 섹션 유지**: Hero, Notice, Tournament, Facility, Story, ClubSummary
- [ ] **새 페이지 추가 없음**: 관리자 페이지/설정 페이지 ❌
- [ ] **Header 변경 없음**: 기존 Header 구조 유지

### 2️⃣ Public 화면 체크

- [ ] **로그인 불필요**: 공개 페이지 접근 가능
- [ ] **관리자 UI 없음**: Edit 버튼/DOM 존재 ❌
- [ ] **읽기 전용**: 공지/대회/대관/스토리/클럽 리스트만 표시
- [ ] **6개 섹션 모두 표시**: 누락된 섹션 없음

### 3️⃣ Admin 모드 체크 (`?mode=admin`)

- [ ] **UI 구조 동일**: Public과 레이아웃 100% 동일
- [ ] **hover-only 버튼**: ✏️ 아이콘은 hover 시에만 표시
- [ ] **confirm 필수**: 모든 관리자 액션에 confirm 존재
- [ ] **public 영향 없음**: Edit Mode에서도 public 화면 구조 유지

### 4️⃣ FacilitySection 체크 (최중요)

- [ ] **슬롯 상태 3종만**: available | blocked | event
- [ ] **잠금/해제만 가능**: available ↔ blocked 전환만
- [ ] **event 슬롯 수정 불가**: 대회 일정 슬롯 클릭 불가
- [ ] **신청/예약/승인 없음**: 관련 UI/코드 모두 제거

### 5️⃣ 제거 확인

- [ ] **관리자 대시보드 제거**: "협회 운영 현황" 화면 없음
- [ ] **리포트 기능 제거**: 리포트 생성/다운로드 없음
- [ ] **회원 관리 제거**: 회원 신청/승인 관리 없음
- [ ] **설정 페이지 제거**: `/association/:id/settings` 없음

---

## 🎯 최종 판정 질문

### 질문 1 (롤백 성공 여부)

> "`?mode=admin`을 붙여도 협회 공식 페이지 하나만 보이고, 관리자 기능은 hover 시에만 보이는가?"

- **YES** → 롤백 성공 ✅
- **NO** → 추가 수정 필요 ❌

### 질문 2 (Phase 3 준수 여부)

> "이 화면을 구청·체육회에 보여줘도 되는가?"

- **YES** → Phase 3 재배포 승인 ✅
- **NO** → 즉시 수정 필요 ❌

---

## 📸 스크린샷 요청

롤백 완료 후 아래 스크린샷을 공유해 주세요:

1. **Public 화면** (`/association/:id`)
   - 전체 화면
   - 6개 섹션 모두 보이는 화면

2. **Admin 모드** (`/association/:id?mode=admin`)
   - hover 시 Edit 버튼 표시 화면
   - Public과 구조 동일한 화면

3. **FacilitySection 확대**
   - 슬롯 그리드 화면
   - Admin 모드에서 잠금/해제 동작 화면

---

**체크리스트 모두 통과 시 Phase 3 재배포 진행**


