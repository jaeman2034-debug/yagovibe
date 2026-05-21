# ✅ 프로덕션 회비 완납 최종 테스트 체크리스트

## 🎯 목표

프로덕션에서 축구팀 관리자 계정으로 `[납부 완료 (수동)]` 클릭 시:
- ❌ internal 에러 제거
- ✅ 완납 처리 성공

---

## 0️⃣ 현재 상태 (확정)

- ✅ Functions 배포 완료 (`processFeePaymentCallable`)
- ✅ 프로덕션 Firestore 데이터 확인됨
- ✅ 에뮬레이터 연결 환경 변수 제어 완료
- ✅ Functions region 일치 확인 (`asia-northeast3`)

---

## 1️⃣ 프론트 환경 설정 (필수)

### `.env.local` 파일 확인

```env
# 🔥 에뮬레이터 완전 비활성화
VITE_USE_AUTH_EMULATOR=false
VITE_USE_FIRESTORE_EMULATOR=false
VITE_USE_FUNCTIONS_EMULATOR=false

# 🔥 프로덕션 모드 강제
VITE_USE_PRODUCTION=true
```

### 에뮬레이터 완전 종료

```bash
# 터미널에서 Ctrl + C
# firebase emulators:start 중단 확인
```

---

## 2️⃣ 프론트 재시작

```bash
# 프론트 개발 서버 재시작
npm run dev
```

**예상 콘솔 로그:**
```
✅ [firebase.ts] Firebase Functions 초기화 성공 (region: asia-northeast3)
✅ [firebase.ts] 프로덕션 모드 - Functions Emulator 연결 안 함
✅ [firebase.ts] Functions는 프로덕션(asia-northeast3) 사용
```

---

## 3️⃣ 브라우저 완전 초기화

1. **완전히 로그아웃**
   - Firebase Console에서 로그아웃
   - 브라우저 쿠키 삭제 (선택)

2. **완전 새로고침**
   - `Ctrl + Shift + R` (하드 리로드)
   - 또는 브라우저 완전 종료 후 재시작

3. **다시 구글 로그인**
   - 프로덕션 Firebase Auth 사용
   - `ownerUid: oC23hGzbyPOQ3uYGGDPzAxy06vL2` 확인

---

## 4️⃣ 테스트 실행

### 순서

1. 축구팀 선택 (`/sports/football/team`)
2. 회비 → 2025년 12월 선택
3. 회원 옆 `[납부 완료 (수동)]` 클릭
4. 확인 모달 → `[확인]` 클릭

### 브라우저 콘솔 확인

**예상 로그:**
```
🔥 [TeamFeeDetailPage] Functions 호출 시작
🔥 [TeamFeeDetailPage] functions 객체: Functions {...}
🔥 [TeamFeePaymentPage] functions region: asia-northeast3
🔥 [TeamFeeDetailPage] 호출 파라미터: { teamId, memberId, month, amount }
🔥 [TeamFeeDetailPage] httpsCallable 생성 완료
✅ [TeamFeeDetailPage] Functions 호출 성공: { success: true }
```

---

## 5️⃣ Functions 로그 확인

### 명령어

```bash
firebase functions:log --only processFeePaymentCallable
```

### 예상 로그

```
🔥 [processFeePaymentCallable] ========== 시작 ==========
🔥 [processFeePaymentCallable] request.data: {"teamId":"...","memberId":"...","month":"2025-12","amount":20000}
🔥 [processFeePaymentCallable] auth uid: oC23hGzbyPOQ3uYGGDPzAxy06vL2
🔥 [processFeePaymentCallable] teamId: 7EvUSvUeWiYBxybFsHXE
🔥 [processFeePaymentCallable] memberId: ...
🔥 [processFeePaymentCallable] month: 2025-12
🔥 [processFeePaymentCallable] amount: 20000
✅ [processFeePaymentCallable] 파라미터 검증 완료
🔍 [processFeePayment] 팀 정보 조회 시작
✅ [processFeePayment] 팀 정보 조회 완료
🔍 [processFeePayment] 회원 정보 조회 시작
✅ [processFeePayment] 회원 정보 조회 완료
💾 [processFeePayment] fee 저장 시작
✅ [processFeePayment] fee 저장 완료 (트랜잭션 성공)
✅ [processFeePaymentCallable] processFeePayment 완료
```

---

## 6️⃣ 예상 결과

### 화면

- [ ] ❌ internal 에러 없음
- [ ] ✅ 행이 완납 ✔ 표시
- [ ] ✅ 버튼 사라짐
- [ ] ✅ 모달 닫힘

### Firestore

- [ ] `teams/7EvUSvUeWiYBxybFsHXE/fees/2025-12/items/{memberId}` 문서 생성
- [ ] `auditLogs` 컬렉션에 로그 생성
- [ ] `rollbackable: true` 플래그 확인

---

## 7️⃣ 문제 발생 시

### 문제: "No log entries found"

**원인:** Functions가 실행되지 않음

**해결:**
1. `.env.local` 확인
2. 에뮬레이터 완전 종료
3. 프론트 재시작
4. 브라우저 완전 새로고침

### 문제: "internal" 에러

**원인:** Region 불일치 또는 Auth 토큰 불일치

**해결:**
1. 브라우저 콘솔에서 Functions region 확인
2. 완전 로그아웃 후 재로그인
3. Functions 로그 확인

### 문제: "팀을 찾을 수 없습니다"

**원인:** Firestore에 팀 문서 없음

**해결:**
1. Firebase Console → Firestore 확인
2. `teams/7EvUSvUeWiYBxybFsHXE` 문서 존재 여부 확인

---

## 🎯 성공 기준

✅ **"이제 다시 납부 처리하면 진짜 되는 거지?"**

→ **된다. 거의 확실함.**

**확인 사항:**
1. ✅ 에뮬레이터 완전 제거
2. ✅ 프로덕션 Firebase 사용
3. ✅ Region 일치 (`asia-northeast3`)
4. ✅ Functions 배포 완료
5. ✅ 진단 로그 추가
6. ✅ 트랜잭션 적용

---

**이제 테스트하세요!** 🚀

