# ✅ SMS 발송 문제 해결 체크리스트

> **순서대로 확인하세요**

---

## ✅ 1️⃣ Firestore 규칙 수정 (완료)

- [x] `firestore.rules` 파일 수정 완료
- [x] `smsLogs` 컬렉션에 `allow read, write: if true;` 추가
- [x] Firebase에 규칙 배포 완료

**확인:**
```bash
firebase deploy --only firestore:rules
```

---

## ✅ 2️⃣ 코드에서 smsLogs 임시 제거 (완료)

- [x] `src/utils/smsLogging.ts`의 `addDoc` 호출 주석 처리 완료
- [x] 콘솔 로그만 남김

**확인:**
- `src/utils/smsLogging.ts` 파일 확인
- `logSMSAttempt` 함수 내부의 `addDoc` 호출이 주석 처리되어 있음

---

## ⚠️ 3️⃣ 도메인 + reCAPTCHA 체크 (수동 작업 필요)

### Firebase Console에서 확인

1. **Firebase Console 접속**
   - https://console.firebase.google.com/project/yago-vibe-spt

2. **Authentication → 설정 → 승인된 도메인**

3. **다음 2개 도메인이 반드시 있어야 함:**
   - `yagovibe.com`
   - `www.yagovibe.com`

4. **없으면 추가:**
   - "도메인 추가" 버튼 클릭
   - 도메인 입력 후 저장

**⚠️ 중요:**
- 이 도메인들이 없으면 SMS가 절대 발송되지 않습니다.
- Firebase Phone Auth는 승인된 도메인에서만 작동합니다.

---

## ⚠️ 4️⃣ App Check 잠깐 끄고 테스트 (수동 작업 필요)

### Firebase Console에서 확인

1. **Firebase Console 접속**
   - https://console.firebase.google.com/project/yago-vibe-spt

2. **App Check 메뉴로 이동**

3. **"강제 적용" OFF**
   - 현재 로그에 `Failed to initialize reCAPTCHA Enterprise config` 경고가 보임
   - App Check가 간섭 중일 가능성

4. **테스트 후 다시 켜기**
   - SMS 발송이 정상 작동하면 App Check 설정 재확인

**⚠️ 중요:**
- App Check는 보안 기능이므로 테스트 후 다시 활성화해야 합니다.
- 임시로만 끄고 테스트하세요.

---

## 📋 추가 확인 사항

### Firebase Console → Authentication → Sign-in method → Phone

- [ ] **테스트 전화번호 삭제 확인**
  - 테스트 번호가 하나라도 있으면 실제 SMS가 발송되지 않습니다.
  - 반드시 모두 삭제하세요.

- [ ] **Phone Auth 활성화 확인**
  - Phone 번호 인증이 **Enabled** 상태인지 확인

---

## 🧪 테스트 절차

1. **Firestore 규칙 배포 확인** ✅
2. **smsLogs 코드 주석 처리 확인** ✅
3. **도메인 추가 확인** (수동)
4. **App Check 끄기** (수동)
5. **실제 전화번호로 SMS 테스트**
6. **SMS 수신 확인**

---

## 🔄 문제 해결 후 복구

### smsLogs 로그 저장 복구

SMS 발송이 정상 작동하면:

1. `src/utils/smsLogging.ts` 주석 해제
2. Firestore 규칙을 원래대로 복구 (보안 강화)
3. 재배포

### App Check 복구

SMS 발송이 정상 작동하면:

1. App Check "강제 적용" 다시 ON
2. reCAPTCHA Enterprise 설정 확인
3. 정상 작동 확인

---

## ✅ 완료 기준

- [ ] Firestore 규칙 배포 완료
- [ ] smsLogs 코드 주석 처리 완료
- [ ] 도메인 추가 완료 (yagovibe.com, www.yagovibe.com)
- [ ] App Check 강제 적용 OFF
- [ ] 테스트 전화번호 삭제 확인
- [ ] 실제 SMS 발송 테스트 성공

---

## 📞 문제 발생 시

위 항목을 모두 확인했는데도 SMS가 발송되지 않으면:

1. Firebase Console → Authentication → Usage 확인
2. SMS 쿼터 확인
3. GCP Billing 연결 확인
4. Firebase Console 로그 확인

---

**이 체크리스트를 따라하시면 SMS 발송 문제가 해결됩니다!** 🚀
