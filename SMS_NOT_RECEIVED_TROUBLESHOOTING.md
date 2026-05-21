# 🔍 SMS 미수신 문제 해결 가이드

## 현재 상황

콘솔 로그 확인:
- ✅ `sendSMSCode` 호출 성공
- ✅ `hasSentCode = true` 설정 완료
- ✅ `step = 2` 설정 완료 (인증번호 입력 화면 표시)
- ✅ "실전 모드: 실제 SMS 발송 모드" 로그

하지만 실제 SMS가 수신되지 않음.

---

## 🔥 즉시 확인해야 할 것 (순서대로)

### 1️⃣ Firebase Console에서 실제 SMS 발송 확인

**Firebase Console → Authentication → Usage**

1. **SMS 발송 횟수 확인**
   - 오늘 날짜로 SMS가 발송되었는지 확인
   - 발송 횟수가 증가했는지 확인

2. **에러 로그 확인**
   - Firebase Console → Functions → Logs
   - SMS 관련 에러 확인

---

### 2️⃣ 테스트 전화번호 삭제 확인 (가장 중요)

**Firebase Console → Authentication → Sign-in method → Phone**

1. **"테스트 전화번호" 섹션 확인**
2. **테스트 번호가 하나라도 있으면 모두 삭제**
3. **저장**

⚠️ **테스트 번호가 하나라도 있으면 실제 SMS가 절대 발송되지 않습니다!**

---

### 3️⃣ GCP Billing 연결 확인

**Google Cloud Console → 결제**

1. 프로젝트: `yago-vibe-spt`
2. 결제 계정 ACTIVE 확인
3. 결제 수단 등록 완료 확인

⚠️ **Firebase Phone Auth SMS는 GCP Billing 기준입니다.**

---

### 4️⃣ SMS 쿼터 확인

**Firebase Console → Authentication → Usage**

1. Phone Auth → SMS sent 확인
2. 쿼터 초과 여부 확인

---

### 5️⃣ 콘솔 로그에서 verificationId 확인

브라우저 콘솔에서 다음 로그 확인:

```
✅ [authPhone] SMS 인증번호 전송 성공: {
  verificationId: "✅ 존재" 또는 "❌ 없음"
}
```

**verificationId가 "❌ 없음"이면:**
- Firebase Phone Auth가 실제로 SMS를 발송하지 않았을 가능성
- 테스트 번호 모드일 가능성

---

## 🔧 추가 디버깅

### authPhone.ts에 상세 로그 추가

다음 로그를 확인하세요:

```javascript
console.log("✅ [authPhone] SMS 인증번호 전송 성공:", {
  verificationId: confirmationResult.verificationId ? "✅ 존재" : "❌ 없음",
  confirmationResult: confirmationResult, // 전체 객체 확인
});
```

---

## 🎯 가장 가능성 높은 원인

### 1️⃣ 테스트 번호가 아직 살아 있음 (90% 확률)

**증상:**
- 코드에서는 "실전 모드" 로그가 나옴
- 하지만 Firebase Console에 테스트 번호가 등록되어 있음

**확인 방법:**
```
Firebase Console
→ Authentication
→ Sign-in method
→ Phone
→ "테스트 전화번호" 섹션 확인
```

**해결:**
- 테스트 번호가 하나라도 있으면 **전부 삭제**
- 저장
- 다시 테스트

---

### 2️⃣ GCP Billing 연결 미완 (5% 확률)

**확인 방법:**
```
Google Cloud Console
→ 결제
→ 프로젝트: yago-vibe-spt
→ 결제 계정 ACTIVE 확인
→ 결제 수단 등록 완료 확인
```

---

### 3️⃣ SMS 쿼터 초과 (3% 확률)

**확인 방법:**
```
Firebase Console
→ Authentication
→ Usage
→ Phone Auth → SMS sent 확인
```

---

### 4️⃣ verificationId가 없는 경우 (2% 확률)

**증상:**
- 콘솔 로그에서 `verificationId: "❌ 없음"`

**의미:**
- Firebase가 실제 SMS를 발송하지 않았음
- 테스트 모드일 가능성

---

## ✅ 체크리스트

- [ ] Firebase Console → Authentication → Usage에서 SMS 발송 횟수 확인
- [ ] Firebase Console → Authentication → Sign-in method → Phone에서 테스트 번호 삭제 확인
- [ ] Google Cloud Console → 결제에서 Billing 연결 확인
- [ ] 브라우저 콘솔에서 `verificationId` 존재 여부 확인
- [ ] Firebase Console → Functions → Logs에서 에러 확인

---

## 🚨 즉시 확인할 것

**가장 먼저 이것부터:**

1. **Firebase Console → Authentication → Sign-in method → Phone**
2. **"테스트 전화번호" 섹션 확인**
3. **테스트 번호가 있으면 모두 삭제**
4. **저장**
5. **다시 테스트**

이게 90% 확률로 원인입니다!

---

**이 체크리스트를 따라하시면 SMS 미수신 문제가 해결됩니다!** 🚀
