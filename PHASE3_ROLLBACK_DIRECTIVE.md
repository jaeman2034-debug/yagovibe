# 🔴 Phase 3 MVP 롤백 지시문 (공식)

## 목적

현재 배포된 화면은 Phase 3 MVP 설계와 불일치하며, 관리자 대시보드(UI)가 혼입되어 아키텍처를 위반함. 따라서 Phase 3 기준선으로 즉시 롤백한다.

---

## ❌ 현재 상태 판정 (WHY ROLLBACK)

### 확인된 위반 사항

1. **별도의 관리자 페이지 UI 존재**
   - "협회 운영 현황"
   - "리포트 생성"
   - "회원 신청 관리"
   - 설정(⚙️), internal 표시

2. **Edit Mode 규칙 위반**
   - `?mode=admin`이 기존 공식 페이지 위에 hover-only 편집을 주입하는 방식이 아님
   - public 화면과 구조 불일치

3. **Phase 3 금지 기능 노출**
   - 회원 관리
   - 리포트
   - 운영 대시보드

**👉 위 항목 중 하나라도 존재 시 Phase 3 FAIL**

**→ 현재 상태는 명백한 FAIL**

---

## ✅ 롤백 목표 (TO-BE)

Phase 3 MVP에서 허용되는 화면은 **단 하나**:

**AssociationOfficialPage**

### URL 규칙

- **Public**: `/association/:associationId`
- **Admin (Edit Mode 주입)**: `/association/:associationId?mode=admin`

---

## 🧱 롤백 후 반드시 충족해야 할 UI 조건

### 1️⃣ 공통

- 별도의 관리자 페이지 ❌
- 관리자 전용 레이아웃 ❌
- 대시보드 / 운영 현황 ❌

### 2️⃣ Public 화면

- 공지 / 대회 / 대관 / 스토리 / 클럽
- 읽기 전용
- **관리자 관련 UI DOM 자체가 없음**

### 3️⃣ Admin (Edit Mode)

- Public 화면과 구조 100% 동일
- hover 시에만 ✏️ 아이콘 등장
- confirm 없는 액션 ❌
- FacilitySection:
  - `available ↔ blocked`만 가능
  - event 슬롯 수정 ❌

---

## 🔧 구체적 롤백 작업 지시

### 1️⃣ 제거 대상 (즉시)

- 관리자 대시보드 페이지
- 운영 현황 / 리포트 / 회원 관리 관련 컴포넌트
- 관련 라우트 전부

**현재 확인된 문제 파일**:
- `src/pages/AssociationHome.tsx` (관리자 대시보드)
- `src/components/association/AssociationDashboardCards.tsx` (대시보드 카드)
- `src/components/association/MembershipRequestList.tsx` (회원 관리)
- `/association/:associationId/settings` 라우트 (설정 페이지)

### 2️⃣ 유지 대상

- AssociationOfficialPage
- 6개 섹션 구조
- Firestore read/write 로직
- Edit Mode hover-only 로직

### 🚫 금지 사항 (롤백 과정 중)

- "나중에 쓸 수도 있으니 주석 처리" ❌
- TODO 남기기 ❌
- Phase 4 기능 일부 유지 ❌

**👉 전부 제거**

---

## ✅ 롤백 완료 판정 기준 (CHECK)

이 질문에 **YES**면 롤백 성공:

> "`?mode=admin`을 붙여도 협회 공식 페이지 하나만 보이고, 관리자 기능은 hover 시에만 보이는가?"

---

## 📌 다음 단계 (롤백 후)

1. 롤백된 화면 스크린샷 공유
2. 이 질문에 답:
   > "이 화면을 구청·체육회에 보여줘도 되는가?"

- **YES** → Phase 3 재배포
- **NO** → 즉시 수정

---

## 🧠 천재 모드 최종 한 줄

지금 롤백은 실패가 아니라, 설계를 지켜낸 **'정답 행동'**이다.

---

**이 문서를 개발자/Cursor/팀에게 그대로 전달하여 즉시 롤백 실행**


