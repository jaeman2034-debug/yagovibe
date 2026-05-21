# Phase 4-2 (Step 2) 권한·접근 가드 확정 규칙표

**목적: "누가, 어디까지, 무엇을 할 수 있는지"를 개발자·사무국·이용자 모두가 헷갈리지 않게 고정**

---

## 1️⃣ 사용자 역할 정의 (고정)

| 역할 | 설명 |
|------|------|
| **Public** | 로그인 안 한 일반 사용자 |
| **Member** | 협회 소속 팀/회원 |
| **Admin** | 협회 사무국 (공식 운영자) |
| **SuperAdmin** | 시스템 운영 (당분간 내부용) |

---

## 2️⃣ 화면별 접근 권한

### 🔹 협회 공식 페이지

**URL**: `/association/:associationId`

| 항목 | Public | Member | Admin |
|------|--------|--------|-------|
| Hero / Notice / Tournament / Facility | 읽기 | 읽기 | 읽기 |
| 공지 수정 버튼 | ❌ | ❌ | ⭕ |
| 대관 상태 토글 | ❌ | ❌ | ⭕ |
| 편집 UI 표시 | ❌ | ❌ | ⭕ (Edit Mode) |

### 🔹 공지 관리 (Admin 전용)

**URL**: `/association/:associationId/admin/notices`

| 기능 | Admin |
|------|-------|
| 목록 조회 | ⭕ |
| 작성 / 수정 | ⭕ |
| 예약 게시 | ⭕ |
| 삭제 | ⭕ |

**❗ Public / Member 접근 시 → 404 또는 접근 불가 화면**

### 🔹 축구 허브 카드 (SportHub)

| 카드 | 노출 |
|------|------|
| 노원구 축구협회 | 항상 노출 |
| 우리 팀 관리 | 로그인 + Pro |
| 팀 / FC 찾기 | 모두 |
| 일정 / 시설 / 장터 | 모두 |

---

## 3️⃣ Edit Mode 진입 규칙 (아주 중요)

### 조건 (모두 만족해야 함)

1. URL에 `?mode=admin`
2. 로그인 상태
3. `useIsAssociationAdmin === true`

**→ 이 3가지 모두 만족 시에만 ✏️ 아이콘 / 수정 UI 렌더링**

### ❌ 절대 금지

- Public에게 수정 버튼 노출
- URL만 바꿔서 수정 가능
- Firestore write 권한 우회

---

## 4️⃣ Firestore Write 원칙 (기억용)

- **쓰기 가능**: Admin only
- **Cloud Function 경유**
- **Client direct write ❌**
- **로그 남김** (who / when / what)

---

## ✅ 지금 상태 요약 (천재 기준)

- ✅ 협회 카드 노출 완료
- ✅ 공식 → 참여 → 활동 IA 정합
- ✅ Hero 문구가 "전화 대신 기준 페이지" 역할 수행

**다음 질문이 나오면 자동 Phase 4-2 계속 진행**

---

## ⏭ 다음 자동 전환 트리거 (다시 한 번)

다음 중 **하나라도** 나오면 Phase 4-2 (Step 3: 실제 입력 자동화) 바로 들어갑니다:

1. **"공지 수정은 누가 해요?"**
2. **"이거 엑셀 안 써도 되겠네요?"**
3. **"사무국 말고 다른 사람이 만지면 안 되죠?"**

---

## 📋 구현 체크리스트

### Edit Mode 가드
- [ ] URL 쿼리 `?mode=admin` 확인
- [ ] 로그인 상태 확인
- [ ] `useIsAssociationAdmin` 훅으로 권한 확인
- [ ] 3가지 모두 만족 시에만 편집 UI 표시

### 공지 관리 접근 가드
- [ ] Admin 전용 라우트 보호
- [ ] Public/Member 접근 시 404 또는 접근 불가 화면

### Firestore Rules
- [ ] Admin만 write 가능
- [ ] Cloud Function 경유 원칙
- [ ] 로그 기록 (who / when / what)

---

**작성일**: 2025-01-XX  
**버전**: v1.0  
**상태**: 권한 규칙표 완료

