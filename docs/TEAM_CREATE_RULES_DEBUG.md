# 🔴 팀 생성 Firebase internal 에러 - Rules 디버깅

**생성일**: 2025-01-27  
**문제**: 팀 생성 시 `FirebaseError: internal` 발생 - teams 컬렉션 create 단계에서 실패  
**상태**: 🔍 Rules vs Payload 매칭 확인 중

---

## 🔍 현재 상황

### ✅ 확인된 사실

1. **이번 팀 생성 시도는 실패함** (Firestore에 새 문서 없음)
2. **에러는 teams create 단계에서 발생**
3. **콘솔 로그**: `FirebaseError: internal`

---

## 📋 현재 Rules vs Payload 비교

### 1️⃣ Firestore Rules (현재)

```javascript
match /teams/{teamId} {
  // 읽기: 로그인 사용자 모두 가능
  allow read: if isSignedIn();
  
  // 생성: 로그인 사용자 모두 가능
  allow create: if isSignedIn(); // ⚠️ 단순 조건
  
  // 수정: 팀 소유자만
  allow update: if isSignedIn() && (
    resource.data.ownerUid == request.auth.uid ||
    request.auth.uid in resource.data.get('owners', [])
  );
  
  // 삭제: 금지
  allow delete: if false;
}
```

**문제점:**
- `allow create: if isSignedIn();`만 있음
- **payload 필드 검증 없음**
- 하지만 Cloud Functions는 Admin SDK를 사용하므로 **Rules를 우회해야 함**

---

### 2️⃣ createTeam 함수 Payload

```typescript
const teamData = {
  name: name.trim(),                    // string
  sportType,                            // string
  sportKey: sportType,                  // string
  region: region.trim(),                 // string
  dataRegion: "us",                     // string
  ownerUid: uid,                        // string
  owners: [uid],                        // array<string>
  plan: "free",                         // string
  seatLimit: 5,                         // number
  seatUsed: 1,                          // number
  allowManualFee: true,                 // boolean
  status: "active",                     // string
  membership: "non-member",            // string
  associationId: null,                  // null
  isDeleted: false,                     // boolean
  createdAt: serverTimestamp(),         // ⚠️ Timestamp (아직 값 없음)
};
```

---

## 🚨 문제 원인 후보

### 원인 1: Cloud Functions가 Rules 체크를 받고 있음 (가능성 낮음)

**이론:**
- Cloud Functions는 Admin SDK를 사용하므로 Rules를 우회해야 함
- 하지만 실제로는 Rules 체크를 받을 수 있음

**확인 방법:**
- Firebase Console → Functions → Logs
- 실제 에러 메시지 확인

---

### 원인 2: Transaction 내부에서 Rules 체크 (가능성 높음)

**이론:**
- `transaction.set()`이 Rules 체크를 받을 수 있음
- 특히 `serverTimestamp()`가 아직 값이 없어서 문제

**확인 방법:**
- Rules Simulator에서 테스트
- `createdAt` 필드 없이 테스트

---

### 원인 3: Payload 필드 타입 불일치 (가능성 중간)

**확인 필요:**
- `owners: [uid]` - 배열 타입
- `associationId: null` - null 값
- `createdAt: serverTimestamp()` - Timestamp

---

## ✅ 즉시 해결 방법

### 방법 1: Rules에서 teams create를 완전히 열기 (임시 디버깅용)

```javascript
match /teams/{teamId} {
  allow create: if true; // ⚠️ 임시: 모든 사용자 허용 (디버깅용)
}
```

**효과:**
- Rules 문제인지 즉시 확인 가능
- 성공하면 → Rules 문제 확정
- 여전히 실패 → payload 구조 문제

---

### 방법 2: Cloud Functions 로그 확인 (가장 중요)

**확인 방법:**
1. Firebase Console → Functions → Logs
2. `createTeam` 함수의 상세 에러 로그 확인
3. `errorName`, `errorCode`, `errorMessage`, `errorStack` 확인

---

### 방법 3: Payload에서 serverTimestamp() 제거 테스트 (임시)

```typescript
const teamData = {
  ...data,
  // createdAt: serverTimestamp(), // ⚠️ 임시 제거
  createdAt: admin.firestore.Timestamp.now(), // 임시: 현재 시간 사용
};
```

**효과:**
- `serverTimestamp()` 문제인지 확인 가능

---

## 🔧 권장 수정 사항

### 1. Rules는 그대로 유지 (Cloud Functions는 Rules 우회)

**현재 Rules:**
```javascript
allow create: if isSignedIn(); // ✅ 충분함 (Cloud Functions는 우회)
```

**이유:**
- Cloud Functions는 Admin SDK를 사용하므로 Rules를 우회해야 함
- Rules는 프론트엔드 접근 차단용

---

### 2. createTeam 함수에서 에러 로깅 강화

**현재:**
```typescript
catch (error: any) {
  logger.error("❌ [createTeam] 팀 생성 실패", {
    uid,
    errorName: error?.name,
    errorCode: error?.code,
    errorMessage: error?.message,
    errorStack: error?.stack,
  });
}
```

**개선:**
- payload도 로깅
- transaction 단계별 로깅

---

## 📋 체크리스트

- [ ] Firebase Console에서 `createTeam` 함수 로그 확인
- [ ] 실제 에러 메시지 확인
- [ ] Rules Simulator에서 테스트
- [ ] Payload 구조 확인

---

## 🔚 다음 단계

1. **Firebase Console 로그 확인** (가장 중요)
   - 실제 에러 메시지 확인
   - 스택 트레이스 확인

2. **에러 메시지에 따른 수정**
   - 권한 문제 → Rules 수정
   - 데이터 검증 실패 → Payload 수정
   - 트랜잭션 문제 → Transaction 로직 수정

---

**작성일**: 2025-01-27  
**상태**: 🔍 Rules vs Payload 매칭 확인 중  
**다음 단계**: Firebase Console 로그 확인 필요
