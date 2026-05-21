# 🔥 팀 삭제 및 데이터 일관성 개선 (v1)

## 📋 개요

팀 삭제 시 관련된 모든 데이터를 완전히 삭제하고, Ghost team 문제를 해결하여 데이터 일관성을 보장합니다.

---

## ✅ 완료된 작업

### 1️⃣ 완전한 팀 삭제 함수 작성

**파일**: `src/lib/team/deleteTeam.ts`

**삭제 대상**:
1. ✅ `teams/{teamId}` 문서
2. ✅ `teams/{teamId}/members/*` 전체
3. ✅ `activities` where `refId == teamId` (팀 관련 활동)
4. ✅ `inviteLinks` where `teamId == teamId`
5. ✅ `team_members` 역인덱스 (`${teamId}_${uid}`)

**특징**:
- 배치 작업으로 원자적 삭제
- owner 권한 확인
- 상세한 로그 출력

**사용 예시**:
```typescript
import { deleteTeam } from "@/lib/team/deleteTeam";

await deleteTeam(teamId, userId);
```

---

### 2️⃣ Ghost team 제거 로직 추가

**파일**: `src/hooks/useMyTeams.ts`

**문제**:
- `team_members` 컬렉션만 보고 팀을 찾는 구조
- `teams` 문서가 삭제되어도 `team_members`에 남아있으면 Ghost team 발생

**해결**:
- `teams` 문서 존재 여부 확인
- 존재하지 않는 팀은 자동으로 필터링
- 콘솔에 경고 로그 출력

**코드**:
```typescript
// 🔥 Ghost team 제거: teams 문서 존재 여부 확인
const teamRef = doc(db, "teams", teamId);
const teamDoc = await getDoc(teamRef);

if (!teamDoc.exists()) {
  console.warn("⚠️ [useMyTeams] Ghost team 감지 및 제거:", {
    teamId,
    teamMemberDocId: doc.id,
    reason: "teams 문서가 존재하지 않음"
  });
  return null; // Ghost team 제거
}
```

---

### 3️⃣ TeamSettingsModal 업데이트

**파일**: `src/components/team/TeamSettingsModal.tsx`

**변경 사항**:
- 기존: `deleteDoc(teamRef)` 단순 삭제
- 변경: `deleteTeam(teamId, userId)` 완전 삭제 함수 사용

**사용자 경험**:
- 삭제 확인 다이얼로그에 삭제되는 데이터 목록 표시
- 더 명확한 에러 메시지

---

## 🔍 데이터 일관성 보장

### 삭제 전 체크리스트

1. ✅ Owner 권한 확인
2. ✅ 팀 문서 존재 확인
3. ✅ 관련 데이터 일괄 삭제

### 삭제 후 상태

- `teams/{teamId}` → 삭제됨
- `teams/{teamId}/members/*` → 모두 삭제됨
- `team_members/*` → 관련 문서 삭제됨
- `activities` → 팀 관련 활동 삭제됨
- `inviteLinks` → 팀 관련 초대 링크 삭제됨

---

## 🚨 주의사항

### 1. 물리 삭제

이 함수는 **물리 삭제**를 수행합니다. 되돌릴 수 없습니다.

### 2. 권한 확인

반드시 **owner** 권한이 있어야 합니다.

### 3. 배치 작업

모든 삭제 작업은 배치로 처리되어 원자성을 보장합니다.

---

## 📊 성능 고려사항

### useMyTeams Ghost team 체크

- 각 팀마다 `getDoc` 호출 필요
- 팀이 많을 경우 성능 저하 가능
- 하지만 데이터 일관성을 위해 필수

**최적화 방안** (향후):
- 캐싱 사용
- 배치 조회
- 인덱스 최적화

---

## 🔄 마이그레이션 가이드

### 기존 Ghost team 정리

기존에 생성된 Ghost team을 정리하려면:

```typescript
// 1. team_members에서 모든 문서 조회
const teamMembersRef = collection(db, "team_members");
const teamMembersSnap = await getDocs(teamMembersRef);

// 2. 각 teamId에 대해 teams 문서 존재 확인
for (const memberDoc of teamMembersSnap.docs) {
  const teamId = memberDoc.data().teamId;
  const teamRef = doc(db, "teams", teamId);
  const teamDoc = await getDoc(teamRef);
  
  // 3. 존재하지 않으면 team_members 문서 삭제
  if (!teamDoc.exists()) {
    await deleteDoc(memberDoc.ref);
    console.log("Ghost team 제거:", teamId);
  }
}
```

---

## ✅ 체크리스트

- [x] 완전한 팀 삭제 함수 작성
- [x] Ghost team 제거 로직 추가
- [x] TeamSettingsModal 업데이트
- [x] 배치 작업으로 원자성 보장
- [x] 권한 확인 로직 추가
- [x] 상세한 로그 출력

---

## 📝 다음 단계

1. **기존 Ghost team 정리** (수동)
   - Firestore에서 Ghost team 찾아서 정리

2. **성능 최적화** (향후)
   - useMyTeams Ghost team 체크 최적화
   - 캐싱 도입

3. **모니터링** (향후)
   - Ghost team 발생 빈도 추적
   - 삭제 실패 케이스 모니터링

---

## 📚 관련 파일

- `src/lib/team/deleteTeam.ts`: 완전한 팀 삭제 함수
- `src/hooks/useMyTeams.ts`: Ghost team 제거 로직
- `src/components/team/TeamSettingsModal.tsx`: 팀 설정 모달 (삭제 기능)
