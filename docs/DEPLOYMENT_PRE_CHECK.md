# 🔥 Cloud Functions 배포 전 체크리스트

**생성일**: 2025-01-XX  
**목적**: Phase 1-5 완료 후 Cloud Functions 배포 전 최종 검증  
**상태**: ✅ 준비 완료

---

## 📋 배포 대상 함수

### 1. createTeam
- **타입**: Callable Function (v2)
- **경로**: `functions/src/createTeam.ts`
- **역할**: 팀 생성 (membership, memberCount, regionCode 포함)
- **Export 확인**: ✅ `functions/src/index.ts`에 export됨

### 2. onTeamMemberCreate
- **타입**: Firestore Trigger (v1)
- **경로**: `functions/src/team/syncTeamMembers.ts`
- **역할**: 멤버 생성 시 team_members 인덱스 생성 + memberCount 증가
- **Export 확인**: ✅ `functions/src/index.ts`에 export됨

### 3. onTeamMemberDelete
- **타입**: Firestore Trigger (v1)
- **경로**: `functions/src/team/syncTeamMembers.ts`
- **역할**: 멤버 삭제 시 team_members 인덱스 삭제 + memberCount 감소
- **Export 확인**: ✅ `functions/src/index.ts`에 export됨

### 4. onTeamMemberUpdate
- **타입**: Firestore Trigger (v1)
- **경로**: `functions/src/team/syncTeamMembers.ts`
- **역할**: 멤버 업데이트 시 team_members 인덱스 동기화
- **Export 확인**: ✅ `functions/src/index.ts`에 export됨

---

## ✅ 배포 전 필수 확인사항

### 1. 코드 검증
- [ ] `functions/src/index.ts`에 모든 함수 export 확인
- [ ] `functions/src/team/syncTeamMembers.ts` 컴파일 오류 없음
- [ ] `functions/src/createTeam.ts` 컴파일 오류 없음
- [ ] TypeScript 타입 오류 없음

### 2. 의존성 확인
- [ ] `functions/package.json`에 필요한 패키지 모두 설치됨
- [ ] `firebase-admin` 버전 호환성 확인
- [ ] `firebase-functions` 버전 확인

### 3. Firebase 설정
- [ ] `firebase.json`에 functions 설정 확인
- [ ] Firebase 프로젝트 선택 확인 (`firebase use`)
- [ ] 배포 권한 확인

### 4. 환경 변수 (필요시)
- [ ] 필요한 환경 변수 설정 확인
- [ ] Secrets 설정 확인 (필요시)

---

## 🚀 배포 명령어

### 전체 Functions 배포
```bash
firebase deploy --only functions
```

### 선택적 배포 (권장)
```bash
firebase deploy --only functions:createTeam,functions:onTeamMemberCreate,functions:onTeamMemberDelete,functions:onTeamMemberUpdate
```

### 특정 함수만 배포 (테스트용)
```bash
# createTeam만 배포
firebase deploy --only functions:createTeam

# syncTeamMembers만 배포
firebase deploy --only functions:onTeamMemberCreate,functions:onTeamMemberDelete,functions:onTeamMemberUpdate
```

---

## 📊 배포 후 확인사항

### 1. Firebase Console 확인
1. Firebase Console → Functions 메뉴
2. 배포된 함수 목록 확인:
   - [ ] `createTeam` (Callable)
   - [ ] `onTeamMemberCreate` (Firestore Trigger)
   - [ ] `onTeamMemberDelete` (Firestore Trigger)
   - [ ] `onTeamMemberUpdate` (Firestore Trigger)

### 2. 함수 상태 확인
- [ ] 모든 함수가 "Active" 상태
- [ ] 에러 없음
- [ ] 트리거 경로 확인:
  - `onTeamMemberCreate`: `teams/{teamId}/members/{uid}` onCreate
  - `onTeamMemberDelete`: `teams/{teamId}/members/{uid}` onDelete
  - `onTeamMemberUpdate`: `teams/{teamId}/members/{uid}` onUpdate

### 3. 로그 확인
- [ ] 배포 로그에 에러 없음
- [ ] 함수 초기화 성공 메시지 확인

---

## 🧪 배포 후 즉시 테스트

### 테스트 1: createTeam
```typescript
// 클라이언트에서
const createTeamFn = httpsCallable(functions, "createTeam");
const result = await createTeamFn({
  name: "테스트 팀",
  sport: "soccer",
  region: "서울시 노원구",
});

// Firestore에서 확인
// teams/{teamId}
// - memberCount = 1 ✅
// - membership = "non-member" ✅
// - regionCode 존재 ✅
```

### 테스트 2: 멤버 추가 트리거
```typescript
// teams/{teamId}/members/{newUid} 생성
await setDoc(doc(db, "teams", teamId, "members", newUid), {
  userId: newUid,
  role: "member",
  status: "active",
  joinedAt: serverTimestamp(),
});

// 확인
// 1. team_members/{newUid}_{teamId} 생성됨 ✅
// 2. teams/{teamId}.memberCount 증가 ✅
// 3. Cloud Functions 로그 확인
```

---

## ⚠️ 주의사항

### 1. 배포 중단
배포 중 문제 발생 시:
- `Ctrl+C`로 중단
- Firebase Console에서 함수 상태 확인
- 필요시 롤백

### 2. 트리거 충돌
기존에 같은 경로를 트리거하는 함수가 있다면:
- 기존 함수 비활성화 또는 삭제
- 새 함수 배포

### 3. 권한 확인
- Firestore Rules에서 `teams/{teamId}/members/{uid}` 쓰기 권한 확인
- Cloud Functions는 admin 권한이므로 Rules 우회

---

## 🔄 롤백 계획

문제 발생 시:

### 1. 함수 삭제
```bash
firebase functions:delete createTeam
firebase functions:delete onTeamMemberCreate
firebase functions:delete onTeamMemberDelete
firebase functions:delete onTeamMemberUpdate
```

### 2. 수동 동기화 (필요시)
- `memberCount` 수동 계산
- `team_members` 인덱스 수동 생성

---

## 📝 배포 실행 로그

배포 실행 후 아래 형식으로 기록:

```markdown
## 배포 일시
2025-01-XX XX:XX

## 배포 명령어
firebase deploy --only functions:createTeam,functions:onTeamMemberCreate,functions:onTeamMemberDelete,functions:onTeamMemberUpdate

## 결과
- [ ] 성공
- [ ] 실패 (에러 메시지 기록)

## 배포된 함수
- [ ] createTeam
- [ ] onTeamMemberCreate
- [ ] onTeamMemberDelete
- [ ] onTeamMemberUpdate

## 발견된 이슈
(없으면 "없음" 기록)

## 다음 단계
- [ ] 통합 테스트 실행
- [ ] Step 2 진행 가능
```

---

## ✅ 배포 준비 완료

모든 체크리스트를 확인한 후 배포를 진행하세요.

**다음 단계**: 배포 완료 후 `docs/PHASE_1-5_VERIFICATION_CHECKLIST.md`의 통합 테스트 실행
