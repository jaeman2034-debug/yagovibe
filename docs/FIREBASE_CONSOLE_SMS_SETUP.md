# 🔥 Firebase Console SMS 설정 완벽 가이드

## 📋 필수 체크리스트 (순서대로)

### 1️⃣ 테스트 번호 완전 제거 (가장 중요!)

**경로:**
```
Firebase Console
→ Authentication
→ Sign-in method
→ Phone (전화번호)
→ "테스트 전화번호" 섹션
```

**액션:**
- [ ] 모든 테스트 번호 삭제
- [ ] 테스트 코드도 제거
- [ ] 저장 버튼 클릭

**⚠️ 중요:**
- 테스트 번호가 **하나라도 있으면** 실제 SMS가 발송되지 않습니다
- 코드에서 `PROD MODE`로 보여도 Firebase Console 설정이 우선합니다

---

### 2️⃣ Phone Auth 활성화 확인

**경로:**
```
Firebase Console
→ Authentication
→ Sign-in method
→ Phone (전화번호)
```

**확인 사항:**
- [ ] Phone 번호 인증이 **활성화**되어 있는지 확인
- [ ] 비활성화되어 있으면 **활성화** 버튼 클릭

---

### 3️⃣ App Check 비활성화 (선택사항, 권장)

**경로:**
```
Firebase Console
→ App Check
→ Authentication
```

**액션:**
- [ ] Enforcement: **OFF**로 설정
- [ ] 또는 `.env` 파일에 `VITE_USE_APP_CHECK=false` 추가

**이유:**
- Phone Auth는 App Check 없어도 정상 작동
- 지금은 보안보다 **가입 성공이 우선**

---

### 4️⃣ Google Cloud Billing 확인

**경로:**
```
Google Cloud Console
→ 결제
→ 프로젝트: yago-vibe-spt
```

**확인 사항:**
- [ ] 결제 계정이 **ACTIVE** 상태인지 확인
- [ ] 결제 수단이 등록되어 있는지 확인
- [ ] Blaze 요금제가 활성화되어 있는지 확인

**⚠️ 중요:**
- Firebase Phone Auth SMS는 **GCP Billing 기준**입니다
- Blaze 표시만으로는 부족하고, 실제 결제 계정이 ACTIVE여야 합니다

---

### 5️⃣ SMS 쿼터 확인

**경로:**
```
Firebase Console
→ Authentication
→ Usage
→ Phone Auth
```

**확인 사항:**
- [ ] SMS sent 개수 확인
- [ ] Quota 초과 여부 확인
- [ ] 잠금 상태 확인

---

## 🎯 성공 확인 방법

### 콘솔 로그 확인

성공 시 반드시 나와야 할 로그:
```
✅ [authPhone] SMS 인증번호 전송 성공
```

실패 시 나오는 로그:
```
❌ [authPhone] SMS 전송 실패 상세
```

### 실제 SMS 수신 확인

- 실제 전화번호로 테스트
- SMS 수신 확인
- 인증번호 입력 화면으로 전환 확인

---

## 🚨 자주 발생하는 문제

### 문제 1: "전송 중..." 상태로 멈춤

**원인:**
- Firebase Console에 테스트 번호가 등록되어 있음 (90% 확률)

**해결:**
1. Firebase Console → Authentication → Sign-in method → Phone
2. 테스트 전화번호 섹션에서 모든 번호 삭제
3. 저장
4. 페이지 새로고침 후 다시 시도

---

### 문제 2: "SMS 전송 타임아웃" 에러

**원인:**
- Firebase Console 설정 문제
- 네트워크 문제
- SMS Gateway 지연

**해결:**
1. Firebase Console 설정 확인 (테스트 번호 삭제)
2. Google Cloud Billing 확인
3. 다른 브라우저에서 테스트
4. 다른 네트워크에서 테스트

---

### 문제 3: "auth/quota-exceeded" 에러

**원인:**
- SMS 쿼터 초과

**해결:**
1. Firebase Console → Authentication → Usage 확인
2. 쿼터 초과 시 Firebase 지원팀에 문의
3. 또는 다음 날까지 대기

---

## 📞 추가 도움

문제가 계속되면:
1. 브라우저 콘솔의 **전체 에러 메시지** 복사
2. Network 탭에서 `signInWithPhoneNumber` 요청 확인
3. Firebase Console → Authentication → Users에서 사용자 생성 여부 확인
