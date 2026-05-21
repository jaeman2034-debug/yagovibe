# 🚀 빠른 테스트 실행 가이드

## ✅ 준비 완료 상태

- [x] Cloud Functions 배포 완료
- [x] 테스트 스크립트 준비 완료
- [x] `tsx` 설치 완료

---

## 📝 3단계 실행 순서

### 1️⃣ 브라우저에서 팀 생성

**URL**: `/sports/soccer/team/create`

**생성 후 확인**:
- Firestore Console에서 `teams/{teamId}` 확인
- `memberCount = 1` 확인
- `teams/{teamId}/members/{uid}` 확인
- `role = "owner"` 확인

---

### 2️⃣ teamId / ownerUid 복사

Firestore Console에서:
- `teamId`: `teams` 컬렉션의 문서 ID
- `ownerUid`: `teams/{teamId}/members` 서브컬렉션의 문서 ID

---

### 3️⃣ PowerShell에서 테스트 실행

```powershell
# functions 디렉토리로 이동
cd functions

# 환경 변수 설정 (실제 값으로 교체)
$env:TEST_TEAM_ID="your-team-id"
$env:TEST_OWNER_UID="your-owner-uid"

# 테스트 실행
npm run test:integration
```

**예시**:
```powershell
cd functions
$env:TEST_TEAM_ID="team_abc123"
$env:TEST_OWNER_UID="uid_98765"
npm run test:integration
```

---

## 📊 예상 결과

### 정상 실행 시

```
🔥 Phase 1-5 통합 테스트 시작
==================================================

🧪 테스트 1: 팀 생성 검증
==================================================
팀 문서 검증: { memberCount: 1, membership: 'non-member', ... }
멤버 문서 검증: { role: 'owner', status: 'active', ... }
✅ 테스트 1 통과

🧪 테스트 2: team_members 인덱스 확인
==================================================
인덱스 문서 검증: { teamId: '...', userId: '...', role: 'owner', ... }
✅ 테스트 2 통과

⚠️ TEST_MEMBER_UID가 설정되지 않아 테스트 3-5를 건너뜁니다.

==================================================
📊 테스트 결과 요약
==================================================
통과: 2/5

상세 결과:
  테스트 1 (팀 생성): ✅
  테스트 2 (인덱스): ✅
  테스트 3 (멤버 추가): ❌ (건너뜀)
  테스트 4 (멤버 삭제): ❌ (건너뜀)
  테스트 5 (Role 변경): ❌ (건너뜀)
```

---

## 🔍 로그 모니터링 (별도 터미널)

```bash
firebase functions:log --limit 50
```

**정상 로그 예**:
```
✅ [onTeamMemberCreate] team_members 인덱스 생성 완료
✅ [onTeamMemberCreate] memberCount 증가 완료
```

---

## ❌ 문제 발생 시

### 에러: "환경 변수 설정 필요"
- `$env:TEST_TEAM_ID`와 `$env:TEST_OWNER_UID` 확인
- PowerShell에서 변수 설정 후 같은 세션에서 실행

### 에러: "팀 문서가 존재하지 않습니다"
- `teamId` 값 확인
- Firestore에서 팀이 실제로 생성되었는지 확인

### 에러: "team_members 인덱스가 존재하지 않습니다"
- Cloud Functions 로그 확인
- `onTeamMemberCreate` 트리거 확인
- 멤버 `status = "active"` 확인

---

## ✅ 테스트 완료 후

**결과를 알려주세요**:
1. `npm run test:integration` 출력 로그
2. PASS / FAIL 상태
3. 에러 메시지 (있다면)

---

## 🎯 다음 단계

모든 테스트 통과 시:
- ✅ Step 1 완료 (운영 안정화)
- 🚀 Step 2 시작: 팀 경기 기록 시스템 구현
