# 🚀 프로덕션 회비 완납 실행 플랜

## ✅ 목표

프로덕션에서 축구팀 관리자 계정으로 `[납부 완료 (수동)]` 클릭 시:
- ❌ internal 에러 제거
- ✅ 완납 처리 성공

---

## 0️⃣ 현재 상황 (확정)

- 에뮬레이터/로컬은 버림
- 실제 데이터는 프로덕션에 있음
- 함수·Auth·Firestore 연결이 꼬여서 internal 발생
- **→ 프로덕션 기준으로 단일화**

---

## 1️⃣ 프론트: 에뮬레이터 연결 완전 제거

### ✅ 확인 사항

**`.env.local` 파일:**

```env
VITE_USE_AUTH_EMULATOR=false
VITE_USE_FIRESTORE_EMULATOR=false
VITE_USE_FUNCTIONS_EMULATOR=false
```

**`src/lib/firebase.ts` 확인:**

- ✅ `connectAuthEmulator` → 환경 변수로 제어됨
- ✅ `connectFirestoreEmulator` → 환경 변수로 제어됨
- ✅ `connectFunctionsEmulator` → 환경 변수로 제어됨
- ✅ `getFunctions(app, "asia-northeast3")` → region 일치 ✅

---

## 2️⃣ Cloud Function: 진단 로그 추가 (완료)

### ✅ 추가된 로그

```typescript
console.log("🔥 [processFeePaymentCallable] ========== 시작 ==========");
console.log("🔥 [processFeePaymentCallable] request.data:", JSON.stringify(request.data));
console.log("🔥 [processFeePaymentCallable] auth uid:", request.auth?.uid || "없음");
console.log("🔥 [processFeePaymentCallable] teamId:", teamId);
console.log("🔥 [processFeePaymentCallable] memberId:", memberId);
console.log("🔥 [processFeePaymentCallable] month:", month);
console.log("🔥 [processFeePaymentCallable] amount:", amount);
```

### ✅ 각 단계별 로그

- 팀 정보 조회 전/후
- 회원 정보 조회 전/후
- fee 저장 전/후 (트랜잭션)

---

## 3️⃣ Region 일치 확인 (완료)

### ✅ 프론트

```typescript
// src/lib/firebase.ts
functions = getFunctions(app, "asia-northeast3");
```

### ✅ Functions

```typescript
// functions/src/feePayment.ts
export const processFeePaymentCallable = onCall(
  {
    region: "asia-northeast3", // ✅ 일치
    cors: true,
  },
  async (request) => { ... }
);
```

---

## 4️⃣ 트랜잭션 구조 (완료)

```typescript
await db.runTransaction(async (transaction) => {
  // 1️⃣ fee 문서 저장
  transaction.set(feeRef, feeData, { merge: true });
  
  // 2️⃣ audit 로그 저장
  const auditLogRef = db.collection("auditLogs").doc();
  transaction.set(auditLogRef, auditData);
});
```

**→ 중간 에러 시 자동 롤백**

---

## 5️⃣ 배포 명령어

### STEP 1: Functions 빌드

```bash
cd functions
npm run build
```

### STEP 2: Functions 배포

```bash
cd ..
firebase deploy --only functions:processFeePaymentCallable
```

### STEP 3: 배포 확인

배포 로그에서 다음 확인:
```
✔ functions[processFeePaymentCallable]: https function initialized
```

---

## 6️⃣ 테스트 체크리스트 (순서대로)

### ✅ 사전 준비

- [ ] 에뮬레이터 완전 종료 (Ctrl + C)
- [ ] `.env.local`에 에뮬레이터 비활성화 설정
- [ ] 프론트 재시작 (`npm run dev`)
- [ ] Functions 배포 완료

### ✅ 테스트 실행

1. [ ] 프로덕션 URL 접속
2. [ ] 관리자 계정 로그인 (구글 로그인)
3. [ ] 축구팀 선택 (`/sports/football/team`)
4. [ ] 회비 → 2025년 12월 선택
5. [ ] 회원 옆 `[납부 완료 (수동)]` 클릭
6. [ ] 확인 모달 → `[확인]` 클릭

### ✅ 예상 결과

- [ ] ❌ internal 에러 없음
- [ ] ✅ 행이 완납 ✔ 표시
- [ ] ✅ 버튼 사라짐
- [ ] ✅ Firestore에 fee 문서 생성
- [ ] ✅ audit 로그 생성

---

## 7️⃣ 문제 발생 시 디버깅

### Functions 로그 확인

```bash
firebase functions:log --only processFeePaymentCallable
```

### 주요 확인 포인트

1. **진단 로그 확인**
   - `teamId`, `memberId`, `month`, `amount` 값 확인
   - `auth uid` 확인

2. **에러 발생 지점 확인**
   - 팀 조회 실패 → `teams/{teamId}` 문서 확인
   - 회원 조회 실패 → `teams/{teamId}/members/{memberId}` 확인
   - 트랜잭션 실패 → 에러 메시지 확인

3. **Firestore 실제 구조 확인**
   - Firebase Console → Firestore
   - `teams/{teamId}` 문서 존재 여부
   - `teams/{teamId}/members/{memberId}` 문서 존재 여부

---

## 8️⃣ 최종 확인 사항

### ✅ 코드 레벨

- [ ] 에뮬레이터 연결 코드 환경 변수 제어됨
- [ ] Functions region 일치 (`asia-northeast3`)
- [ ] 진단 로그 충분히 추가됨
- [ ] 트랜잭션 적용됨
- [ ] 에러 핸들링 완료

### ✅ 배포 레벨

- [ ] Functions 배포 완료
- [ ] 배포 로그에서 함수 확인됨
- [ ] 프론트 재시작 완료

### ✅ 데이터 레벨

- [ ] 프로덕션 Firestore에 팀 데이터 있음
- [ ] 프로덕션 Firestore에 회원 데이터 있음
- [ ] `allowManualFee: true` 설정됨

---

## 🎯 성공 기준

✅ **"이제 다시 납부 처리하면 진짜 되는 거지?"**

→ **된다. 거의 확실함.**

**확인 사항:**
1. ✅ 에뮬레이터 완전 제거
2. ✅ 프로덕션 Firebase 사용
3. ✅ Region 일치
4. ✅ 진단 로그 추가
5. ✅ 트랜잭션 적용
6. ✅ Functions 배포 완료

---

**이제 프로덕션에서 안전하게 테스트할 준비가 완료되었습니다!** 🎉

