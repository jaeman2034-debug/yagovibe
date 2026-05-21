# 🔍 SMS 미수신 즉시 확인 체크리스트

## 🚨 가장 먼저 확인할 것 (90% 확률)

### Firebase Console → Authentication → Sign-in method → Phone

1. **"테스트 전화번호" 섹션 확인**
2. **테스트 번호가 하나라도 있으면 모두 삭제**
3. **저장**
4. **다시 테스트**

⚠️ **테스트 번호가 하나라도 있으면 실제 SMS가 절대 발송되지 않습니다!**

---

## 🔍 브라우저 콘솔에서 확인

다음 로그를 확인하세요:

```
✅ [authPhone] SMS 인증번호 전송 성공: {
  verificationId: "✅ 존재" 또는 "❌ 없음"
}
```

### verificationId가 "❌ 없음"인 경우

**의미:**
- Firebase가 실제 SMS를 발송하지 않았음
- 테스트 번호 모드일 가능성 90%

**해결:**
1. Firebase Console에서 테스트 번호 삭제
2. 다시 테스트

---

## 📊 Firebase Console에서 확인

### 1. SMS 발송 횟수 확인

**Firebase Console → Authentication → Usage**

1. 오늘 날짜로 SMS가 발송되었는지 확인
2. 발송 횟수가 증가했는지 확인

**발송 횟수가 증가하지 않았다면:**
- 실제로 SMS가 발송되지 않았음
- 테스트 번호 모드일 가능성

---

### 2. GCP Billing 연결 확인

**Google Cloud Console → 결제**

1. 프로젝트: `yago-vibe-spt`
2. 결제 계정 ACTIVE 확인
3. 결제 수단 등록 완료 확인

⚠️ **Firebase Phone Auth SMS는 GCP Billing 기준입니다.**

---

### 3. SMS 쿼터 확인

**Firebase Console → Authentication → Usage**

1. Phone Auth → SMS sent 확인
2. 쿼터 초과 여부 확인

---

## 🎯 문제 해결 순서

### 1단계: 테스트 번호 삭제 (가장 중요)

```
Firebase Console
→ Authentication
→ Sign-in method
→ Phone
→ "테스트 전화번호" 섹션
→ 모든 테스트 번호 삭제
→ 저장
```

### 2단계: 브라우저 콘솔 확인

```
✅ [authPhone] SMS 인증번호 전송 성공: {
  verificationId: "✅ 존재" 또는 "❌ 없음"
}
```

- "✅ 존재" → SMS는 발송되었을 가능성 (수신 지연 가능)
- "❌ 없음" → SMS가 발송되지 않음 (테스트 번호 확인 필요)

### 3단계: Firebase Console Usage 확인

```
Firebase Console
→ Authentication
→ Usage
→ Phone Auth
→ SMS sent 확인
```

- 발송 횟수가 증가했는지 확인
- 증가하지 않았다면 실제로 발송되지 않음

---

## ✅ 체크리스트

- [ ] Firebase Console → Authentication → Sign-in method → Phone → 테스트 번호 삭제 확인
- [ ] 브라우저 콘솔에서 `verificationId` 존재 여부 확인
- [ ] Firebase Console → Authentication → Usage에서 SMS 발송 횟수 확인
- [ ] Google Cloud Console → 결제에서 Billing 연결 확인
- [ ] Firebase Console → Authentication → Usage에서 SMS 쿼터 확인

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
