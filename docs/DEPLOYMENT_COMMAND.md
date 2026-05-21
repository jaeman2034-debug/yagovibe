# 🚀 Cloud Functions 배포 명령어 가이드

**생성일**: 2025-01-XX  
**목적**: Phase 1-5 완료 후 Cloud Functions 배포 실행 가이드

---

## ✅ 배포 전 확인 완료

- [x] TypeScript 빌드 성공
- [x] 모든 함수 export 확인
- [x] `firebase.json` 설정 확인
- [x] 함수 정의 확인

---

## 📋 배포 대상 함수

### 1. createTeam
- **타입**: Callable Function (v2)
- **경로**: `teams/{teamId}` 생성
- **기능**: membership, memberCount, regionCode 포함

### 2. onTeamMemberCreate
- **타입**: Firestore Trigger (v1)
- **트리거**: `teams/{teamId}/members/{uid}` onCreate
- **기능**: team_members 인덱스 생성 + memberCount 증가

### 3. onTeamMemberDelete
- **타입**: Firestore Trigger (v1)
- **트리거**: `teams/{teamId}/members/{uid}` onDelete
- **기능**: team_members 인덱스 삭제 + memberCount 감소

### 4. onTeamMemberUpdate
- **타입**: Firestore Trigger (v1)
- **트리거**: `teams/{teamId}/members/{uid}` onUpdate
- **기능**: team_members 인덱스 동기화

---

## 🚀 배포 명령어

### 옵션 1: 선택적 배포 (권장)

```bash
firebase deploy --only functions:createTeam,functions:onTeamMemberCreate,functions:onTeamMemberDelete,functions:onTeamMemberUpdate
```

**장점**:
- 필요한 함수만 배포
- 배포 시간 단축
- 다른 함수에 영향 없음

---

### 옵션 2: 전체 Functions 배포

```bash
firebase deploy --only functions
```

**주의**: 모든 Functions가 배포되므로 시간이 오래 걸릴 수 있습니다.

---

### 옵션 3: 단계별 배포 (테스트용)

```bash
# 1단계: createTeam만 배포
firebase deploy --only functions:createTeam

# 2단계: syncTeamMembers 배포
firebase deploy --only functions:onTeamMemberCreate,functions:onTeamMemberDelete,functions:onTeamMemberUpdate
```

---

## 📊 배포 실행 순서

### Step 1: 현재 디렉토리 확인
```bash
# 루트 디렉토리에서 실행
pwd
# 예상: C:\Users\samsung256g\Desktop\yago-vibe-spt
```

### Step 2: Firebase 프로젝트 확인
```bash
firebase use
# 또는
firebase projects:list
```

### Step 3: 배포 실행
```bash
firebase deploy --only functions:createTeam,functions:onTeamMemberCreate,functions:onTeamMemberDelete,functions:onTeamMemberUpdate
```

### Step 4: 배포 결과 확인
- Firebase Console에서 함수 목록 확인
- 배포 로그 확인
- 함수 상태가 "Active"인지 확인

---

## 🔍 배포 후 확인사항

### 1. Firebase Console
1. https://console.firebase.google.com 접속
2. 프로젝트 선택
3. Functions 메뉴 클릭
4. 배포된 함수 확인:
   - `createTeam` (Callable)
   - `onTeamMemberCreate` (Firestore Trigger)
   - `onTeamMemberDelete` (Firestore Trigger)
   - `onTeamMemberUpdate` (Firestore Trigger)

### 2. 함수 트리거 경로 확인
- `onTeamMemberCreate`: `teams/{teamId}/members/{uid}` onCreate
- `onTeamMemberDelete`: `teams/{teamId}/members/{uid}` onDelete
- `onTeamMemberUpdate`: `teams/{teamId}/members/{uid}` onUpdate

### 3. 로그 확인
- Functions → Logs 메뉴
- 최근 배포 로그 확인
- 에러 없음 확인

---

## ⚠️ 주의사항

### 1. 배포 중단
배포 중 문제 발생 시:
- `Ctrl+C`로 중단
- Firebase Console에서 상태 확인
- 필요시 재배포

### 2. 트리거 충돌
기존에 같은 경로를 트리거하는 함수가 있다면:
- 기존 함수 비활성화 또는 삭제
- 새 함수 배포

### 3. 권한 확인
- Firestore Rules 확인
- Cloud Functions는 admin 권한이므로 Rules 우회

---

## 🧪 배포 후 즉시 테스트

배포 완료 후 다음 테스트를 실행하세요:

1. **팀 생성 테스트**
   - `createTeam` 호출
   - `teams/{teamId}` 확인 (memberCount, membership, regionCode)

2. **멤버 추가 테스트**
   - `teams/{teamId}/members/{uid}` 생성
   - `team_members` 인덱스 생성 확인
   - `memberCount` 증가 확인

3. **멤버 삭제 테스트**
   - `teams/{teamId}/members/{uid}` 삭제
   - `team_members` 인덱스 삭제 확인
   - `memberCount` 감소 확인

4. **Role 변경 테스트**
   - `teams/{teamId}/members/{uid}.role` 변경
   - `team_members.role` 동기화 확인

---

## 📝 배포 로그 기록

배포 실행 후 아래 형식으로 기록:

```markdown
## 배포 일시
2025-01-XX XX:XX

## 배포 명령어
firebase deploy --only functions:createTeam,functions:onTeamMemberCreate,functions:onTeamMemberDelete,functions:onTeamMemberUpdate

## 결과
- [ ] 성공
- [ ] 실패

## 배포된 함수
- [ ] createTeam
- [ ] onTeamMemberCreate
- [ ] onTeamMemberDelete
- [ ] onTeamMemberUpdate

## 다음 단계
- [ ] 통합 테스트 실행 (docs/PHASE_1-5_VERIFICATION_CHECKLIST.md)
- [ ] Step 2 진행 가능
```

---

## ✅ 배포 준비 완료

모든 준비가 완료되었습니다. 위 명령어를 실행하여 배포를 진행하세요.

**다음 단계**: 배포 완료 후 `docs/PHASE_1-5_VERIFICATION_CHECKLIST.md`의 통합 테스트 실행
