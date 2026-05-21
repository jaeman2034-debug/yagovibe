# 🏗️ YAGO SPORTS 팀 시스템 최종 구조 (안정화)

## 📊 현재 구조 확인 결과

### ✅ **둘 다 사용 중 (정상)**

#### 1️⃣ team_members (Global Collection)
**위치**: `team_members/{teamId}_{userId}`

**용도**: 역인덱스 (조회 최적화)
- ✅ "내가 속한 팀 목록" 빠른 조회
- ✅ `useMyTeams` 훅에서 사용
- ✅ 팀 생성/가입 시 자동 생성
- ✅ 팀 삭제/탈퇴 시 자동 삭제

**사용 위치**:
- `src/hooks/useMyTeams.ts` - 내가 속한 팀 목록 조회
- `src/lib/team/createTeamSimple.ts` - 팀 생성 시 인덱스 생성
- `src/lib/team/deleteTeam.ts` - 팀 삭제 시 정리
- `src/lib/team/teamInviteLink.ts` - 초대 링크 처리
- `src/lib/team/teamJoinRequest.ts` - 팀 가입 시 인덱스 생성
- `src/lib/team/teamLeave.ts` - 팀 탈퇴 시 인덱스 삭제

---

#### 2️⃣ teams/{teamId}/members (Subcollection)
**위치**: `teams/{teamId}/members/{uid}`

**용도**: 권한의 단일 진실 소스 (Source of Truth)
- ✅ 권한 체크는 여기서만 수행
- ✅ 문서 ID = uid (절대 규칙)
- ✅ 서버에서만 생성/수정 가능

**사용 위치**:
- `src/context/TeamContext.tsx` - 팀 권한 체크
- `src/pages/team/TeamManagePageNew.tsx` - 팀원 목록 조회
- `src/components/me/persona/PersonaP3TeamCaptain.tsx` - 팀원 수 조회
- `src/lib/team/permissions.ts` - 권한 체크
- `src/lib/team/deleteTeam.ts` - 팀 삭제 시 정리
- `src/lib/team/createTeamSimple.ts` - 팀 생성 시 owner 추가

---

## 🔥 핵심 원칙 (절대 규칙)

### Source of Truth
```
teams/{teamId}/members/{uid}
```
- ✅ **권한 체크는 오직 여기서만**
- ✅ 문서 ID = uid (절대 규칙)
- ✅ 서버에서만 생성/수정

### 역인덱스
```
team_members/{teamId}_{userId}
```
- ✅ 조회 최적화용
- ❌ 권한 판단에 사용 안 함
- ⚠️ 없어도 서비스는 정상 동작해야 함

---

## 🛠 해결된 문제

### 1. Ghost team 자동 정리
**파일**: `src/hooks/useMyTeams.ts`

**로직**:
```typescript
// teams 문서 없으면 team_members 자동 삭제
if (!teamDoc.exists()) {
  await deleteDoc(doc(db, "team_members", doc.id));
  return null;
}
```

### 2. Firestore import 수정
**변경 전**: `doc2` (존재하지 않는 함수)
**변경 후**: `doc` (올바른 함수)

**수정 위치**: `src/hooks/useMyTeams.ts`
```typescript
import { doc, getDoc, deleteDoc } from "firebase/firestore";
```

### 3. 에러 처리 강화
- 권한 오류는 team_members 삭제 시도 안 함
- 조회 실패 시에도 Ghost team 정리 시도

---

## 📋 동기화 보장

### 팀 생성 시
```typescript
// 1. teams/{teamId} 생성
// 2. teams/{teamId}/members/{uid} 생성 (owner)
// 3. team_members/{uid}_{teamId} 생성 (역인덱스)
```

### 팀 삭제 시
```typescript
// 1. teams/{teamId} 삭제
// 2. teams/{teamId}/members/* 전체 삭제
// 3. team_members/* (teamId로 필터링) 전체 삭제
```

### 멤버 추가 시
```typescript
// 1. teams/{teamId}/members/{uid} 생성
// 2. team_members/{teamId}_{uid} 생성
```

### 멤버 삭제 시
```typescript
// 1. teams/{teamId}/members/{uid} 삭제
// 2. team_members/{teamId}_{uid} 삭제
```

---

## ✅ 안정화 완료

| 문제 | 상태 | 해결 방법 |
|------|------|----------|
| doc2 오류 | ✅ 해결 | `doc` 함수 사용 |
| Ghost team | ✅ 해결 | 자동 정리 로직 추가 |
| 동기화 | ✅ 보장 | 양쪽 모두 생성/삭제 |

---

## 🎯 최종 구조 (안정화)

### team_members (역인덱스)
- **용도**: 조회 최적화
- **생성**: 팀 생성/가입 시 자동
- **삭제**: 팀 삭제/탈퇴 시 자동 + Ghost team 감지 시 자동
- **정리**: `useMyTeams`에서 자동 정리

### teams/{teamId}/members (권한 소스)
- **용도**: 권한 체크
- **생성**: 서버에서만 생성
- **삭제**: 서버에서만 삭제
- **규칙**: 문서 ID = uid (절대 규칙)

---

## 📝 결론

**현재 구조는 안정적입니다.**

- ✅ `team_members`: 조회 최적화 (필요)
- ✅ `teams/{teamId}/members`: 권한 소스 (필수)
- ✅ Ghost team 자동 정리 (완료)
- ✅ 동기화 보장 (완료)

**추가 작업 불필요**: 현재 구조로 안정적으로 운영 가능
