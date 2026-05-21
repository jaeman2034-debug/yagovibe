# 🧪 QR 로그인 실전 테스트 리포트

## 📊 테스트 케이스별 구현 상태 검토

---

## ✅ L1. 정상 플로우

### TC-1: 기본 성공 시나리오 ✅ **구현 완료**

**구현 확인:**
- ✅ PC에서 `/login/qr-phone` 접속 → QR 세션 생성 (`createQRLoginSession`)
- ✅ QR 코드 정상 표시 (`QRCodeSVG`)
- ✅ 모바일로 QR 스캔 → `/qr-login?sessionId=xxx` 이동
- ✅ 전화번호 입력 → SMS 인증 (`signInWithPhoneNumber`)
- ✅ SMS 인증 성공 → `bindUserToQRSession` 호출
- ✅ PC에서 새로고침 없이 자동 로그인 (`signInWithCustomToken`)
- ✅ `loginSuccess` 이벤트 기록 (`trackQRLogin.loginSuccess`)
- ✅ `status: consumed` 처리 (`consumeQRSession`)

**검증 포인트:**
- ✅ `eventLogs`에 `qr_login_success` 기록
- ✅ `qrSessions/{sessionId}`의 `status`가 `consumed`로 변경
- ✅ Slack 알림 ❌ (정상 시 알림 없음)

**결과:** ✅ **통과 예상**

---

### TC-2: 재로그인 ⚠️ **부분 확인 필요**

**구현 확인:**
- ✅ 같은 전화번호로 다시 QR 로그인 시도
- ⚠️ Firebase Auth가 자동으로 기존 계정 재사용하는지 확인 필요

**검증 포인트:**
- ⚠️ 같은 전화번호 → 같은 `userId` 반환되는지 확인
- ⚠️ 신규 계정 생성 ❌ 확인

**결과:** ⚠️ **테스트 필요** (Firebase Auth 동작 확인)

---

## ✅ L2. 실패/에러 내구성

### TC-3: SMS 인증 실패 ✅ **구현 완료**

**구현 확인:**
- ✅ 인증 코드 오입력 시 에러 핸들링 (`handleVerifyCode`)
- ✅ `smsFailed` 이벤트 기록 (`trackQRLogin.smsFailed`)
- ✅ UX 깨지지 않음 (에러 메시지 표시)
- ✅ 세션 유지 (재시도 가능)

**검증 포인트:**
- ✅ `eventLogs`에 `qr_login_sms_failed` 기록
- ✅ 에러 메시지 표시 ("인증번호가 올바르지 않습니다.")
- ✅ 세션 유지 (다시 시도 가능)

**결과:** ✅ **통과 예상**

---

### TC-4: QR 세션 만료 ✅ **구현 완료**

**구현 확인:**
- ✅ QR 생성 후 5분 타이머 (`timerRef`)
- ✅ 만료 시 `expireQRSession` 호출
- ✅ `sessionExpired` 이벤트 기록 (`trackQRLogin.sessionExpired`)
- ✅ 모바일/PC 모두 만료 안내
- ✅ QR 재생성 가능 (`handleRegenerate`)

**검증 포인트:**
- ✅ `eventLogs`에 `qr_login_session_expired` 기록
- ✅ PC에서 만료 안내 표시
- ✅ 모바일에서 만료된 세션 스캔 시 에러 표시
- ✅ QR 재생성 버튼 동작

**결과:** ✅ **통과 예상**

---

## ⚠️ L3. 동시성/경합

### TC-5: QR 중복 스캔 ⚠️ **부분 구현**

**구현 확인:**
- ✅ 중복 토큰 발급 방지 (`duplicate_token_prevented` 로깅)
- ⚠️ **2대 모바일에서 동시 스캔 시 차단 로직 확인 필요**

**현재 구현:**
```typescript
// issueCustomTokenForQrSession.ts
if (after.customToken) {
  await logQREvent("duplicate_token_prevented", sessionId, {
    userId,
  });
  return;
}
```

**문제점:**
- ⚠️ 이미 `customToken`이 있으면 차단하지만, **2대 모바일이 동시에 `bindUserToQRSession`을 호출하면** 둘 다 성공할 수 있음
- ⚠️ **Race Condition 가능성**

**검증 포인트:**
- ⚠️ 2대 모바일 동시 스캔 → 1대만 성공하는지 확인
- ✅ `duplicate_token_prevented` 기록 확인

**결과:** ⚠️ **테스트 필요** (Race Condition 확인)

**권장 수정:**
```typescript
// bindUserToQRSession에서 트랜잭션 사용
const sessionRef = doc(db, "qrSessions", sessionId);
await runTransaction(db, async (transaction) => {
  const sessionSnap = await transaction.get(sessionRef);
  const data = sessionSnap.data();
  if (data?.status === "verified" || data?.status === "token_ready") {
    throw new Error("이미 인증된 세션입니다.");
  }
  transaction.update(sessionRef, {
    status: "verified",
    userId,
  });
});
```

---

### TC-6: PC 다중 탭 ⚠️ **부분 구현**

**구현 확인:**
- ✅ 탭 비활성화 감지 (`visibilitychange` 이벤트)
- ⚠️ **같은 PC에서 2개 탭 열기 시 처리 확인 필요**

**현재 구현:**
- 각 탭이 독립적으로 세션 생성
- 둘 다 같은 세션을 구독할 수 있음

**문제점:**
- ⚠️ 2개 탭에서 각각 다른 세션 생성 → 혼란 가능
- ⚠️ 하나의 세션을 여러 탭에서 구독 → 중복 로그인 가능

**검증 포인트:**
- ⚠️ 2개 탭 열기 → 하나만 성공하는지 확인
- ⚠️ 다른 탭 자동 종료 or 무효 처리 확인

**결과:** ⚠️ **테스트 필요** (다중 탭 처리 확인)

**권장 수정:**
```typescript
// localStorage로 세션 ID 공유
const existingSessionId = localStorage.getItem("qrLoginSessionId");
if (existingSessionId) {
  // 기존 세션 사용
} else {
  // 새 세션 생성 후 localStorage에 저장
}
```

---

## ⚠️ L4. 보안/악용 방지

### TC-7: QR URL 직접 접근 ✅ **구현 완료**

**구현 확인:**
- ✅ `sessionId` 검증 (`useSearchParams`)
- ✅ `sessionId` 없으면 에러 표시
- ⚠️ **랜덤 sessionId로 접근 시 Firestore 검증 확인 필요**

**검증 포인트:**
- ✅ `/qr-login?sessionId=invalid` → 에러 표시
- ⚠️ `/qr-login?sessionId=랜덤값` → Firestore에서 존재하지 않으면 에러

**결과:** ✅ **통과 예상** (Firestore rules 확인 필요)

---

### TC-8: Custom Token 재사용 시도 ✅ **구현 완료**

**구현 확인:**
- ✅ `consumeQRSession` 호출 후 `status: consumed` 설정
- ✅ `customToken` null 처리 (코드에서 확인 필요)
- ⚠️ **consumed 세션의 토큰 재사용 시도 차단 확인 필요**

**현재 구현:**
```typescript
// QRLoginDesktopPage.tsx
await consumeQRSession(newSessionId);
// customToken은 이미 사용됨
```

**검증 포인트:**
- ✅ `status: consumed` 확인
- ⚠️ consumed 세션의 토큰으로 재로그인 시도 → 실패 확인

**결과:** ⚠️ **테스트 필요** (토큰 재사용 차단 확인)

**권장 수정:**
```typescript
// consumeQRSession에서 customToken 삭제
await updateDoc(sessionRef, {
  status: "consumed",
  customToken: null, // 명시적 삭제
  consumedAt: serverTimestamp(),
});
```

---

## ✅ L5. 운영 자동화 검증

### TC-9: 인위적 장애 시뮬레이션 ✅ **구현 완료**

**구현 확인:**
- ✅ SMS 실패율 높임 → `qrLoginAlert` 감지
- ✅ Slack 알림 전송 (`sendSlackAlert`)
- ✅ 원인 요약 + 추천 액션 표시 (`analyzeRootCause`)
- ✅ Critical 레벨 시 자동 완화 플래그 ON (`applyAutoMitigationFlags`)

**검증 포인트:**
- ✅ SMS 실패율 > 5% → Slack ⚠️ 또는 🚨 알림
- ✅ 원인 요약 표시
- ✅ 추천 액션 표시
- ✅ Critical 시 자동 완화 플래그 ON

**결과:** ✅ **통과 예상**

---

### TC-10: 자동 완화 → 실험 → 제안 ✅ **구현 완료**

**구현 확인:**
- ✅ 자동 완화 TTL 종료 → 실험 분석 (`analyzeQRLoginExperiments`)
- ✅ 실험 결과 생성 (`experimentResults`)
- ✅ Positive 판정 시 영구 개선 제안 생성 (`createImprovementProposal`)
- ✅ Slack에 제안 알림 (`sendImprovementProposalNotification`)

**검증 포인트:**
- ✅ TTL 종료 후 실험 결과 생성
- ✅ Positive 판정 시 제안 생성
- ✅ Slack에 제안 알림

**결과:** ✅ **통과 예상**

---

## 🚨 발견된 문제점 및 권장 수정

### 1. ⚠️ **TC-5: QR 중복 스캔 Race Condition**

**문제:**
- 2대 모바일이 동시에 `bindUserToQRSession` 호출 시 둘 다 성공 가능

**권장 수정:**
```typescript
// src/lib/qrPhoneLogin.ts
export async function bindUserToQRSession(
  sessionId: string,
  userId: string
): Promise<void> {
  const sessionRef = doc(db, "qrSessions", sessionId);
  
  // 트랜잭션으로 원자적 업데이트
  await runTransaction(db, async (transaction) => {
    const sessionSnap = await transaction.get(sessionRef);
    if (!sessionSnap.exists()) {
      throw new Error("세션이 존재하지 않습니다.");
    }
    
    const data = sessionSnap.data() as QRLoginSession;
    
    // 이미 verified이면 차단
    if (data.status === "verified" || data.status === "token_ready") {
      throw new Error("이미 인증된 세션입니다.");
    }
    
    // 만료 체크
    if (data.expiresAt && data.expiresAt.toMillis() < Date.now()) {
      throw new Error("세션이 만료되었습니다.");
    }
    
    transaction.update(sessionRef, {
      status: "verified",
      userId,
    });
  });
}
```

---

### 2. ⚠️ **TC-6: PC 다중 탭 처리**

**문제:**
- 같은 PC에서 여러 탭 열기 시 각각 다른 세션 생성

**권장 수정:**
```typescript
// src/pages/qr-login/QRLoginDesktopPage.tsx
useEffect(() => {
  // localStorage로 세션 공유
  const existingSessionId = localStorage.getItem("qrLoginSessionId");
  if (existingSessionId) {
    // 기존 세션 사용
    setSessionId(existingSessionId);
    // ... 구독 시작
  } else {
    // 새 세션 생성
    const newSessionId = await createQRLoginSession(5);
    localStorage.setItem("qrLoginSessionId", newSessionId);
    // ...
  }
  
  // 다른 탭에서 세션 생성 시 감지
  window.addEventListener("storage", (e) => {
    if (e.key === "qrLoginSessionId" && e.newValue) {
      // 다른 탭에서 세션 생성됨 → 현재 탭 종료
      window.close();
    }
  });
}, []);
```

---

### 3. ⚠️ **TC-8: Custom Token 재사용 차단**

**문제:**
- `consumeQRSession`에서 `customToken` 명시적 삭제 필요

**권장 수정:**
```typescript
// src/lib/qrPhoneLogin.ts
export async function consumeQRSession(sessionId: string): Promise<void> {
  const sessionRef = doc(db, "qrSessions", sessionId);
  
  await updateDoc(sessionRef, {
    status: "consumed",
    customToken: null, // 명시적 삭제
    consumedAt: serverTimestamp(),
  });
}
```

---

## 📊 최종 검증 체크리스트

### 필수 로그 확인

- [ ] `eventLogs` - 모든 이벤트 기록 확인
- [ ] `qrLoginLogs` - 서버 로그 확인
- [ ] `experiments` - 실험 메타데이터 확인
- [ ] `experimentResults` - 실험 결과 확인
- [ ] `improvementProposals` - 개선 제안 확인
- [ ] `featureFlags/qrLoginAutoMitigation` - 자동 완화 플래그 확인

### 합격 기준

1. ❌ 크래시 없음 → ✅ **구현 확인**
2. ❌ 새로고침 필요 없음 → ✅ **구현 확인**
3. ❌ 중복 로그인 없음 → ⚠️ **테스트 필요** (TC-5, TC-6)
4. ❌ 보안 우회 없음 → ⚠️ **테스트 필요** (TC-8)
5. ✅ Slack 알림 "사람이 이해 가능" → ✅ **구현 확인**

---

## 🎯 최종 판정

### ✅ 통과 예상 (즉시 테스트 가능)
- TC-1: 기본 성공 시나리오
- TC-3: SMS 인증 실패
- TC-4: QR 세션 만료
- TC-9: 인위적 장애 시뮬레이션
- TC-10: 자동 완화 → 실험 → 제안

### ⚠️ 테스트 필요 (수정 권장 후 테스트)
- TC-2: 재로그인 (Firebase Auth 동작 확인)
- TC-5: QR 중복 스캔 (Race Condition 수정 필요)
- TC-6: PC 다중 탭 (다중 탭 처리 수정 필요)
- TC-7: QR URL 직접 접근 (Firestore rules 확인)
- TC-8: Custom Token 재사용 (토큰 삭제 수정 필요)

---

## 🚀 다음 액션

1. **우선 수정 권장 사항 적용** (TC-5, TC-6, TC-8)
2. **실제 테스트 진행** (각 TC별 로그 확인)
3. **문제 발견 시 즉시 리포트** (어떤 TC에서 / 어떤 로그가 / 어떻게 찍혔는지)

---

**현재 상태: 5/10 TC 통과 예상, 5/10 TC 테스트 필요**
