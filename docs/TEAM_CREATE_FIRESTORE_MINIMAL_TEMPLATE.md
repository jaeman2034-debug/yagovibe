# 🔧 팀 생성 Firestore Create 최소 템플릿

**생성일**: 2025-01-27  
**목적**: `FirebaseError: internal` 에러 없이 팀 생성이 가능한 최소 구조  
**상태**: ✅ 템플릿 작성 완료

---

## 🎯 핵심 원칙

> **Cloud Functions는 Admin SDK를 사용하므로 Rules를 우회해야 함**
> 하지만 실제로는 Rules 체크를 받을 수 있으므로, Rules도 올바르게 설정해야 함

---

## ✅ 최소 Rules 템플릿

### teams/{teamId} - 최소 허용 규칙

```javascript
match /teams/{teamId} {
  // 읽기: 로그인 사용자 모두 가능
  allow read: if isSignedIn();
  
  // 생성: 로그인 사용자 모두 가능
  // ⚠️ Cloud Functions는 Admin SDK를 사용하므로 이론적으로는 Rules를 우회해야 함
  // 하지만 실제로는 Rules 체크를 받을 수 있으므로, 최소한의 조건만 설정
  allow create: if isSignedIn();
  
  // 수정: 팀 소유자만
  allow update: if isSignedIn() && (
    resource.data.ownerUid == request.auth.uid ||
    request.auth.uid in resource.data.get('owners', [])
  );
  
  // 삭제: 금지
  allow delete: if false;
}
```

**핵심:**
- `allow create: if isSignedIn();`만 있으면 충분
- 추가 필드 검증 불필요 (Cloud Functions는 신뢰할 수 있음)

---

## ✅ 최소 Payload 템플릿

### 필수 필드만 포함

```typescript
const teamData = {
  // 🔑 필수 식별자
  name: name.trim(),                    // string
  ownerUid: uid,                        // string
  owners: [uid],                        // array<string>
  
  // 📊 기본 상태
  status: "active",                     // string
  plan: "free",                         // string
  
  // 🔥 타임스탬프 (서버에서 설정)
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
};
```

**선택 필드 (문제 없으면 포함 가능):**
```typescript
const teamData = {
  // ... 필수 필드 ...
  
  // 📍 지역 정보
  region: region.trim(),                 // string
  dataRegion: "us",                      // string
  
  // ⚽ 스포츠 정보
  sportType,                             // string
  sportKey: sportType,                   // string
  
  // 👥 멤버십 정보
  membership: "non-member",              // string
  associationId: null,                   // null
  
  // 💺 좌석 정보
  seatLimit: 5,                          // number
  seatUsed: 1,                           // number
  
  // ⚙️ 설정
  allowManualFee: true,                  // boolean
  isDeleted: false,                      // boolean
};
```

---

## 🚨 주의사항

### 1. serverTimestamp() 사용 시

**문제:**
- Rules에서 `createdAt` 필드를 체크하면 문제 발생 가능
- `serverTimestamp()`는 아직 값이 없어서 Rules 체크 시 실패할 수 있음

**해결:**
- Rules에서 `createdAt` 필드 검증하지 않기
- 또는 `createdAt` 필드를 선택적으로 처리

---

### 2. null 값 처리

**문제:**
- `associationId: null`이 Rules에서 문제가 될 수 있음

**해결:**
- Rules에서 null 값 허용
- 또는 필드를 아예 포함하지 않기

---

### 3. 배열 타입 처리

**문제:**
- `owners: [uid]` 배열이 Rules에서 문제가 될 수 있음

**해결:**
- Rules에서 배열 타입 허용
- 또는 `owners` 필드 검증하지 않기

---

## ✅ 디버깅용 Rules (임시)

### 완전히 열기 (디버깅용)

```javascript
match /teams/{teamId} {
  allow read: if true;
  allow create: if true; // ⚠️ 임시: 모든 사용자 허용 (디버깅용)
  allow update: if true; // ⚠️ 임시
  allow delete: if false;
}
```

**사용 방법:**
1. 이 Rules로 배포
2. 팀 생성 시도
3. 성공하면 → Rules 문제 확정
4. 여전히 실패하면 → payload 구조 문제

---

## 📋 체크리스트

- [ ] Rules에서 `allow create: if isSignedIn();` 확인
- [ ] Payload에 필수 필드만 포함
- [ ] `serverTimestamp()` 사용 시 Rules에서 검증하지 않기
- [ ] null 값 처리 확인
- [ ] 배열 타입 처리 확인

---

## 🔚 최종 권장 사항

### 1. Rules는 최소한으로

```javascript
allow create: if isSignedIn(); // ✅ 충분함
```

### 2. Payload는 필수 필드만

```typescript
{
  name: string,
  ownerUid: string,
  owners: [string],
  status: "active",
  plan: "free",
  createdAt: serverTimestamp(),
}
```

### 3. Cloud Functions 로그 확인

- 실제 에러 메시지 확인
- payload 로깅 확인
- Rules Simulator 테스트

---

**작성일**: 2025-01-27  
**상태**: ✅ 템플릿 작성 완료  
**다음 단계**: Firebase Console 로그 확인
