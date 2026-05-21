# 🔍 팀 시스템 구조 분석 (team_members vs teams/{teamId}/members)

## 📊 현재 사용 현황

### 1️⃣ team_members (Global Collection)
**위치**: `team_members/{teamId}_{userId}`

**사용 위치**:
- ✅ `src/hooks/useMyTeams.ts` - 내가 속한 팀 목록 조회
- ✅ `src/lib/team/deleteTeam.ts` - 팀 삭제 시 정리
- ✅ `src/lib/team/createTeamSimple.ts` - 팀 생성 시 인덱스 생성
- ✅ `src/lib/team/teamInviteLink.ts` - 초대 링크 처리 시

**역할**: 역인덱스 (조회 최적화)

---

### 2️⃣ teams/{teamId}/members (Subcollection)
**위치**: `teams/{teamId}/members/{uid}`

**사용 위치**:
- ✅ `src/context/TeamContext.tsx` - 팀 권한 체크
- ✅ `src/pages/team/TeamManagePageNew.tsx` - 팀원 목록 조회
- ✅ `src/components/me/persona/PersonaP3TeamCaptain.tsx` - 팀원 수 조회
- ✅ `src/lib/team/deleteTeam.ts` - 팀 삭제 시 정리
- ✅ `src/lib/team/createTeamSimple.ts` - 팀 생성 시 owner 추가

**역할**: 권한의 단일 진실 소스 (Source of Truth)

---

## 🔥 핵심 원칙 (문서화됨)

### Source of Truth
```
teams/{teamId}/members/{uid}
```
- ✅ 권한 체크는 여기서만 수행
- ✅ 문서 ID = uid (절대 규칙)

### 역인덱스
```
team_members/{teamId}_{userId}
```
- ✅ 조회 최적화용
- ❌ 권한 판단에 사용 안 함
- ⚠️ 없어도 서비스는 정상 동작해야 함

---

## ✅ 현재 구조 상태

### 정상 사용
- ✅ `team_members`: 조회 최적화 (useMyTeams)
- ✅ `teams/{teamId}/members`: 권한 체크 (TeamContext)

### 문제점
- ⚠️ Ghost team 발생 가능 (team_members는 있는데 teams 문서 없음)
- ⚠️ 동기화 문제 (한쪽만 삭제되면 불일치)

---

## 🛠 해결 방안

### 1. Ghost team 자동 정리
- `useMyTeams.ts`에서 teams 문서 없으면 team_members 자동 삭제

### 2. 동기화 보장
- 팀 삭제 시 양쪽 모두 삭제 (이미 구현됨)
- 멤버 추가/삭제 시 양쪽 모두 업데이트

### 3. 데이터 일관성 체크
- 주기적으로 Ghost team 정리 스크립트 실행

---

## 📋 권장 구조 (현재 유지)

### team_members (역인덱스)
- **용도**: "내가 속한 팀 목록" 빠른 조회
- **생성**: 팀 생성/가입 시 자동 생성
- **삭제**: 팀 삭제/탈퇴 시 자동 삭제
- **정리**: Ghost team 감지 시 자동 삭제

### teams/{teamId}/members (권한 소스)
- **용도**: 권한 체크, 팀원 관리
- **생성**: 팀 생성/가입 시 서버에서 생성
- **삭제**: 팀 삭제/탈퇴 시 서버에서 삭제
- **규칙**: 문서 ID = uid (절대 규칙)

---

## ✅ 결론

**현재 구조는 정상입니다.**

- ✅ `team_members`: 조회 최적화 (필요)
- ✅ `teams/{teamId}/members`: 권한 소스 (필수)

**문제는 Ghost team 정리 로직만 추가하면 됩니다.**
