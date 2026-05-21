# 🔴 팀 생성 `FirebaseError: internal` 에러 디버깅

**생성일**: 2025-01-27  
**문제**: 팀 생성 시 `FirebaseError: internal` 반복 발생  
**상태**: 🔍 원인 분석 중

---

## 🔴 증상

콘솔에 반복적으로 나타나는 에러:
```
❌ [TeamCreateForm] 진짜 생성 실패: FirebaseError: internal
⚠️ [TeamCreateForm] 후속 동기화 실패 (하지만 팀 생성은 성공했을 수 있음)
```

---

## 🧠 원인 분석

### 가능한 원인 1: Firestore Rules 권한 문제

**확인 필요:**
- `teams/{teamId}` 컬렉션의 `create` 권한
- `teams/{teamId}/members/{memberId}` 서브컬렉션의 `create` 권한
- `team_members/{memberId}` 컬렉션의 `create` 권한
- `teams/{teamId}/usage/current` 서브컬렉션의 `create` 권한

**참고:**
- Cloud Functions는 Admin SDK를 사용하므로 Rules를 우회해야 함
- 하지만 Rules가 너무 엄격하면 문제가 될 수 있음

---

### 가능한 원인 2: 트랜잭션 내부 예외

**확인 필요:**
- `transaction.set()` 호출 시 데이터 검증 실패
- `transaction.get()` 호출 시 권한 문제
- 중복 생성 방지 가드에서 예외 발생

---

### 가능한 원인 3: Cloud Functions 로그 확인 필요

**확인 방법:**
1. Firebase Console → Functions → Logs
2. `createTeam` 함수의 상세 에러 로그 확인
3. 에러 메시지, 스택 트레이스 확인

---

## ✅ 즉시 확인 사항

### 1. Firestore Rules 확인

**확인 위치:** `firestore.rules`

**확인 항목:**
```javascript
match /teams/{teamId} {
  // ❌ allow create: if false; → Cloud Functions도 차단됨
  // ✅ Cloud Functions는 Admin SDK 사용하므로 Rules 우회해야 함
}
```

**참고:**
- Cloud Functions는 Admin SDK를 사용하므로 Rules를 우회함
- 하지만 Rules가 `allow create: if false;`로 설정되어 있어도 Admin SDK는 우회함
- 문제는 다른 곳에 있을 수 있음

---

### 2. Cloud Functions 로그 확인

**확인 방법:**
```bash
# Firebase CLI로 로그 확인
firebase functions:log --only createTeam

# 또는 Firebase Console에서 확인
# https://console.firebase.google.com/project/yago-vibe-spt/functions/logs
```

**확인 항목:**
- `❌ [createTeam] 팀 생성 실패` 로그
- `errorName`, `errorCode`, `errorMessage`, `errorStack`
- `fullError` JSON

---

### 3. 트랜잭션 내부 로직 확인

**확인 위치:** `functions/src/createTeam.ts`

**확인 항목:**
- 78번 라인: `db.runTransaction` 시작
- 114번 라인: `transaction.set(teamRef, teamData)`
- 122번 라인: `transaction.get(memberRef)`
- 155번 라인: `transaction.set(memberRef, memberData)`
- 164번 라인: `transaction.get(teamMemberRef)`
- 179번 라인: `transaction.set(teamMemberRef, teamMemberData)`
- 185번 라인: `transaction.set(usageRef, {...})`

**가능한 문제:**
- `transaction.get()` 호출 시 문서가 이미 존재하는 경우
- `transaction.set()` 호출 시 데이터 검증 실패
- 트랜잭션 타임아웃

---

## 🔧 임시 해결 방법

### 방법 1: Cloud Functions 로그 확인 후 수정

1. Firebase Console에서 로그 확인
2. 실제 에러 메시지 확인
3. 해당 에러에 맞는 수정 적용

### 방법 2: 에러 처리 개선

**현재 코드:**
```tsx
if (error?.code === "functions/internal") {
  // teamId가 있으면 step=2로 이동 시도
  const errorTeamId = error?.teamId || (error?.data?.teamId);
  if (errorTeamId) {
    navigate(`/sports/${sportType}/team/create?step=2&teamId=${errorTeamId}`, { replace: true });
  } else {
    toast.error("팀 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
  }
}
```

**개선:**
- 실제 에러 메시지를 사용자에게 표시
- Cloud Functions 로그 링크 제공 (디버깅용)

---

## 📋 체크리스트

- [ ] Firebase Console에서 `createTeam` 함수 로그 확인
- [ ] 실제 에러 메시지 확인
- [ ] Firestore Rules 확인 (Admin SDK 우회 확인)
- [ ] 트랜잭션 내부 로직 확인
- [ ] 에러 처리 개선

---

## 🔚 다음 단계

1. **Firebase Console 로그 확인** (가장 중요)
   - 실제 에러 메시지 확인
   - 스택 트레이스 확인

2. **에러 메시지에 따른 수정**
   - 권한 문제 → Rules 수정
   - 데이터 검증 실패 → 데이터 검증 로직 수정
   - 트랜잭션 타임아웃 → 트랜잭션 로직 최적화

3. **에러 처리 개선**
   - 사용자에게 더 명확한 에러 메시지 표시
   - 디버깅 정보 제공

---

**작성일**: 2025-01-27  
**상태**: 🔍 원인 분석 중  
**다음 단계**: Firebase Console 로그 확인 필요
