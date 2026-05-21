# 🔥 팀 생성 `functions/internal` 에러 진단 가이드

**생성일**: 2025-01-27  
**목적**: `functions/internal` 에러의 실제 원인 찾기  
**상태**: 🔍 진단 중

---

## ✅ 현재 상황 정리

### 에러 코드
- **에러 타입**: `functions/internal`
- **의미**: Cloud Function 내부에서 예상치 못한 에러 발생
- **Rules 문제 아님**: Rules가 막으면 `permission-denied` / `failed-precondition` 등으로 떨어짐

---

## 🔍 진단 포인트 (우선순위 순)

### 1️⃣ Firebase Functions 로그 확인 (최우선)

**경로**: Firebase Console → Functions → Logs

**확인 사항**:
1. **에러 발생 시간**: 방금 팀 생성 시도한 시간
2. **Function 이름**: `createTeam`
3. **에러 메시지**: `❌ [createTeam] 팀 생성 실패` 로그 찾기
4. **상세 정보**:
   - `errorName`
   - `errorCode`
   - `errorMessage`
   - `errorStack`
   - `fullError`

**예상되는 에러 메시지**:
- `PERMISSION_DENIED: Missing or insufficient permissions`
- `Cannot read properties of undefined (reading 'uid')`
- `FAILED_PRECONDITION: The query requires an index`
- `invalid-argument: ...`
- `Transaction failed: ...`

---

### 2️⃣ 트랜잭션 내부 에러 가능성

**코드 위치**: `functions/src/createTeam.ts:98-218`

**가능한 실패 지점**:
1. **`transaction.set(teamRef, teamData)`** (134줄)
   - Firestore Rules 체크 실패 (하지만 Admin SDK는 Rules 우회해야 함)
   - 필드 타입 불일치
   - `serverTimestamp()` 문제

2. **`transaction.get(memberRef)`** (142줄)
   - 문서 읽기 실패

3. **`transaction.set(memberRef, memberData)`** (175줄)
   - Firestore Rules 체크 실패
   - 필드 타입 불일치

4. **`transaction.set(teamMemberRef, teamMemberData)`** (199줄)
   - Firestore Rules 체크 실패
   - 필드 타입 불일치

5. **`transaction.set(usageRef, ...)`** (206줄)
   - Usage 서브컬렉션 생성 실패 (하지만 try-catch로 감싸져 있음)

---

### 3️⃣ 가장 흔한 원인 TOP 5

#### 1) 트랜잭션 내부에서 Firestore Rules 체크 실패

**증상**:
- `PERMISSION_DENIED` 또는 `internal` 에러
- Admin SDK는 Rules를 우회해야 하지만, 트랜잭션 내부에서 평가 실패 가능

**해결**:
- Rules 단순화 (이미 완료)
- 트랜잭션 구조 재검토

---

#### 2) `serverTimestamp()` 문제

**증상**:
- `invalid-argument` 또는 `internal` 에러
- Rules에서 `createdAt` 타입 검사 실패 가능

**해결**:
- Rules에서 `createdAt` 타입 검사 제거 (이미 `allow create: if isSignedIn();`만 있음)

---

#### 3) 필드 타입 불일치

**증상**:
- `invalid-argument` 또는 `internal` 에러
- 예: `owners: [uid]`가 배열이 아닌 경우

**해결**:
- Payload 구조 확인 (이미 로깅됨)

---

#### 4) `writeAuditLog` 실패 (하지만 try-catch로 감싸져 있음)

**코드 위치**: `functions/src/createTeam.ts:224-247`

**확인**:
- `writeAuditLog`는 try-catch로 감싸져 있어서 실패해도 팀 생성은 성공해야 함
- 하지만 내부에서 throw하면 전체 실패 가능

---

#### 5) `extractRequestInfo` 실패

**코드 위치**: `functions/src/createTeam.ts:225`

**확인**:
- `extractRequestInfo`는 단순 헬퍼 함수이므로 에러 발생 가능성 낮음
- 하지만 `request.rawRequest`가 없으면 문제 가능

---

## ✅ 응급 패치 (이미 적용됨)

### 1️⃣ 실패 시 /me로 보내지 않기

**코드 위치**: `src/pages/team/TeamCreateForm.tsx:140-186`

**현재 상태**:
- ✅ `navigate("/me")` 제거됨
- ✅ 에러 메시지만 표시하고 페이지 유지

---

### 2️⃣ "후속 동기화 실패"와 "진짜 생성 실패" 분리

**코드 위치**: `src/pages/team/TeamCreateForm.tsx:146-178`

**현재 상태**:
- ✅ `functions/internal` 에러에서 `teamId` 추출 시도
- ✅ `teamId`가 있으면 step=2로 이동
- ✅ `teamId`가 없으면 에러 메시지만 표시

---

## 🔍 다음 단계

### 1️⃣ Firebase Functions 로그 확인

**명령어**:
```bash
# Firebase CLI로 로그 확인
firebase functions:log --only createTeam --limit 50
```

**또는**:
- Firebase Console → Functions → Logs
- `createTeam` 함수 필터링
- 최근 에러 로그 확인

---

### 2️⃣ 로그에서 확인할 정보

1. **에러 메시지**: `errorMessage` 필드
2. **에러 코드**: `errorCode` 필드
3. **스택 트레이스**: `errorStack` 필드
4. **Payload**: `payload` 필드 (Rules 디버깅용)

---

### 3️⃣ 로그 기반 해결책

**로그에서 나온 에러 메시지에 따라**:
- `PERMISSION_DENIED` → Rules 문제 (하지만 이미 단순화됨)
- `invalid-argument` → Payload 구조 문제
- `Transaction failed` → 트랜잭션 내부 에러
- `Cannot read properties of undefined` → null/undefined 체크 필요

---

## 📋 체크리스트

- [ ] Firebase Functions 로그 확인
- [ ] 에러 메시지 정확히 파악
- [ ] 에러 코드 확인
- [ ] 스택 트레이스 확인
- [ ] Payload 구조 확인
- [ ] 해결책 적용

---

**작성일**: 2025-01-27  
**상태**: 🔍 진단 가이드 작성 완료  
**다음 단계**: Firebase Functions 로그 확인
