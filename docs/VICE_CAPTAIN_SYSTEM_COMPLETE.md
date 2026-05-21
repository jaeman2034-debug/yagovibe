# 🔥 다중 관리자(부팀장) 시스템 완성

**생성일**: 2025-01-27  
**목적**: 팀장이 모든 걸 혼자 하지 않게 하고, 권한은 나누되 질서는 유지하기  
**상태**: ✅ 완료

---

## ✅ 완료된 개선 사항

### 1. 부팀장 임명 Cloud Function

**파일**: `functions/src/appointViceCaptain.ts`

**기능**:
- 팀장이 팀원을 부팀장으로 임명
- 부팀장은 운영 보조 권한 (가입 승인, 공지 관리 등)
- 팀장 단일성 유지 (teams.ownerUid 변경 안 함)

**규칙**:
- 팀장만 부팀장 임명 가능
- 대상은 MEMBER여야 함
- 부팀장은 여러 명 가능

---

### 2. 부팀장 해제 Cloud Function

**파일**: `functions/src/removeViceCaptain.ts`

**기능**:
- 팀장이 부팀장을 일반 팀원으로 되돌림
- 부팀장 권한 제거

**규칙**:
- 팀장만 부팀장 해제 가능

---

### 3. 부팀장 임명/해제 UI

**파일**: `src/pages/team/tabs/MembersTab.tsx`

**추가된 기능**:
- 부팀장 목록 별도 표시 (팀장과 팀원 사이)
- 팀원에게 "부팀장 임명" 버튼 추가
- 부팀장에게 "부팀장 해제" 버튼 추가
- 부팀장 임명/해제 확인 모달

**UI 구조**:
- 팀장 (상단 고정, 황금색 배경)
- 부팀장 (보라색 배경, Shield 아이콘)
- 팀원 (일반 배경)

---

### 4. 부팀장 권한 체크 업데이트

**파일**: `src/pages/team/TeamManagePage.tsx`

**변경 내용**:
- 부팀장도 팀 관리 페이지 접근 가능
- 부팀장 권한 확인 로직 추가

**권한 체크**:
```ts
const userIsViceCaptain = 
  role === 'vice' || 
  role === '부팀장' ||
  accessLevel === 'ADMIN';
```

---

### 5. MePage에서 부팀장 배지 표시

**파일**: `src/components/me/persona/PersonaP2TeamMember.tsx`

**추가된 기능**:
- 부팀장 배지 표시 (보라색, Shield 아이콘)
- 부팀장이면 "팀 관리하기" 버튼 표시
- 부팀장 권한 실시간 확인

---

## 🎯 권한 모델

### 역할 3단계

| 역할      | 코드               | 설명     |
| ------- | ---------------- | ------ |
| 팀장      | CAPTAIN          | 최종 책임자 |
| **부팀장** | **VICE_CAPTAIN** | 관리 보조  |
| 팀원      | MEMBER           | 일반 참여  |

---

## 1️⃣ 부팀장이 할 수 있는 것 / 없는 것

### ✅ 할 수 있음

* 가입 요청 승인/거절
* 팀 공지 작성
* 팀 정보 수정 (일부)
* 팀원 관리(추방 ❌, 승인 ⭕)

### ❌ 할 수 없음

* 팀장 위임
* 부팀장 임명/해제
* 협회 가입/탈퇴
* 팀 삭제

👉 **"운영 보조"까지만 허용**

---

## 2️⃣ UX: 부팀장 임명 플로우

### 위치

`/me/team/:teamId/manage → 팀원 관리`

### 팀원 카드 메뉴

```tsx
<Button onClick={appointViceCaptain}>
  <Shield /> 부팀장 임명
</Button>
```

**노출 조건**:
* 현재 사용자 = 팀장
* 대상 = MEMBER

---

## 3️⃣ 확인 모달

**부팀장 임명**:
```
부팀장 임명

{이름}님은:
- 가입 요청을 승인할 수 있어요
- 팀 공지를 관리할 수 있어요
- 팀 정보를 수정할 수 있어요

💡 팀장은 여전히 한 명입니다. 부팀장은 운영 보조 역할이에요.
```

**버튼**:
* ❌ 취소
* 🟣 임명하기 (보라색)

---

## 4️⃣ 서버 처리 (트랜잭션)

```ts
members[target].role = 'vice'
members[target].accessLevel = 'ADMIN'
```

* teams.ownerUid ❌ 변경 안 함
* owners 배열 ❌ 변경 안 함

👉 **팀장 단일성 유지**

---

## 5️⃣ 부팀장 UX 반응 (즉시 체감)

### 알림

```
🛡️ {팀명}의 부팀장으로 임명되었어요. 팀 운영을 도와주세요.
```

### `/me` 진입 시

* 배지: **부팀장** (보라색, Shield 아이콘)
* CTA: **팀 관리하기** (보라색 버튼)

---

## 6️⃣ 접근 가드

**팀 관리 페이지**:
```ts
const canAccessManagePage =
  role === 'CAPTAIN' || role === 'VICE_CAPTAIN';
```

**팀장 전용 기능**:
```ts
const canDelegateCaptain =
  role === 'CAPTAIN';
  
const canAppointViceCaptain =
  role === 'CAPTAIN';
```

👉 **권한 분리 명확**

---

## 7️⃣ 자동 위임과의 연결

**자동 위임 시 우선순위** (이미 구현됨):
1. **부팀장**
2. 일반 팀원

👉 부팀장은 **사실상 차기 리더 후보**

---

## ✅ 결과

### 해결된 문제
1. ✅ 부팀장 임명/해제 기능
2. ✅ 부팀장 권한 체크
3. ✅ 부팀장 UI 표시 (배지, 버튼)
4. ✅ 부팀장 접근 가드
5. ✅ 자동 위임과의 연결

### 개선된 시스템
- **책임 분산**: 팀장 과부하 감소
- **명확한 권한**: 할 수 있는 것/없는 것 구분
- **즉각적인 피드백**: 부팀장 배지 및 CTA
- **질서 유지**: 팀장 단일성 유지

---

## 🎯 UX 원칙

> 부팀장은 권력을 나누는 게 아니라  
> 책임을 분산시키는 장치다.

---

## 🔍 관련 파일

- `functions/src/appointViceCaptain.ts` - 부팀장 임명 Cloud Function
- `functions/src/removeViceCaptain.ts` - 부팀장 해제 Cloud Function
- `src/lib/team/appointViceCaptain.ts` - 프론트엔드 호출 함수
- `src/lib/team/removeViceCaptain.ts` - 프론트엔드 호출 함수
- `src/pages/team/tabs/MembersTab.tsx` - 부팀장 임명/해제 UI
- `src/pages/team/TeamManagePage.tsx` - 부팀장 접근 가드
- `src/components/me/persona/PersonaP2TeamMember.tsx` - 부팀장 배지 표시
- `functions/src/autoTransferInactiveCaptain.ts` - 자동 위임 (부팀장 우선순위)

---

## 🎉 시스템 완성도 체크리스트

이제 다음이 모두 완성되었습니다:

- ✅ 상태 머신
- ✅ 팀 생성/가입
- ✅ 승인/알림
- ✅ 협회 연동
- ✅ 자동 위임
- ✅ **부팀장**

👉 **실제 서비스 런칭 가능한 수준**

---

**작성일**: 2025-01-27  
**상태**: ✅ 완료  
**결과**: 팀 시스템이 실제 조직 운영 레벨로 완성됨
