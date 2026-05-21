# 🚀 프로덕션 테스트 체크리스트

## ✅ 테스트 전 준비 (필수)

### 1️⃣ 에뮬레이터 연결 비활성화

**`.env.local` 파일 생성/수정:**

```env
# 프로덕션 테스트 모드
VITE_USE_AUTH_EMULATOR=false
VITE_USE_FIRESTORE_EMULATOR=false
VITE_USE_FUNCTIONS_EMULATOR=false
```

### 2️⃣ 에뮬레이터 종료

```bash
# 터미널에서 Ctrl + C
# firebase emulators:start 중단
```

### 3️⃣ 앱 재시작

```bash
# 프론트 개발 서버 재시작
npm run dev
# 또는
pnpm dev
```

### 4️⃣ 구글 로그인 다시

- 브라우저에서 **완전히 로그아웃**
- 다시 **구글 로그인**
- 이번엔 **진짜 Firebase Auth** 사용
- `ownerUid` 정상 확인

---

## ✅ 테스트 실행 체크리스트

### 1️⃣ 데이터 확인

- [ ] 팀 목록이 보임
- [ ] 회원 목록이 보임 (3명 이상)
- [ ] 회비 상세 페이지 접근 가능

### 2️⃣ 권한 확인

- [ ] 관리자 계정으로 로그인됨
- [ ] `[납부 완료 (수동)]` 버튼이 **파란색 활성화** 상태
- [ ] 🔒 자물쇠 아이콘 없음

### 3️⃣ 회비 납부 테스트

**테스트 대상 회원 1명만 선택** (예: 김상욱)

**테스트 전 상태 기록:**
- [ ] `unpaidMonths` 값 기록 (예: 1)
- [ ] `status` 값 기록 (예: "active")

**납부 처리:**
- [ ] `[납부 완료 (수동)]` 클릭
- [ ] 확인 모달에서 `[확인]` 클릭
- [ ] ❌ internal 에러 없음
- [ ] ✅ 모달 닫힘
- [ ] ✅ 행이 완납 ✔ 표시
- [ ] ✅ 버튼 사라짐

### 4️⃣ Firestore 확인

**생성된 데이터 확인:**

- [ ] `teams/{teamId}/fees/{YYYY-MM}/items/{memberId}` 문서 생성됨
- [ ] `auditLogs` 컬렉션에 로그 생성됨
- [ ] `rollbackable: true` 플래그 확인

---

## 🚨 롤백 체크리스트 (문제 발생 시)

### STEP 1: Fee 문서 삭제

1. Firestore 콘솔 열기
2. `teams/{teamId}/fees/{YYYY-MM}/items/{memberId}` 문서 찾기
3. **삭제** 버튼 클릭
4. 확인

### STEP 2: 브라우저 새로고침

- [ ] 브라우저 완전 새로고침 (`Ctrl + Shift + R`)
- [ ] 다시 미납 상태로 표시됨
- [ ] 버튼 복구됨

### STEP 3: Member 상태 확인 (선택)

- [ ] `unpaidMonths` 값이 원래대로 돌아왔는지 확인
- [ ] 필요시 수동으로 원래 값으로 수정

---

## ✅ 예상 결과

### 정상 동작 시

1. ✅ 납부 처리 즉시 완료
2. ✅ UI 즉시 반영 (완납 표시)
3. ✅ Firestore에 fee 기록 생성
4. ✅ audit 로그 생성
5. ✅ member 상태 자동 재계산

### 문제 발생 시

1. ❌ internal 에러 발생
2. ❌ UI 변경 없음
3. ❌ Firestore에 기록 없음

**→ Functions 로그 확인 필요**

---

## 🔍 디버깅 체크리스트

### 에러 발생 시 확인 사항

1. **브라우저 콘솔 확인**
   - [ ] 에러 메시지 확인
   - [ ] `FirebaseError: internal` 여부 확인

2. **Firebase Functions 로그 확인**
   - [ ] Firebase Console → Functions → `processFeePaymentCallable` → Logs
   - [ ] 에러 메시지 복사

3. **인증 상태 확인**
   - [ ] 로그인 상태 확인
   - [ ] `ownerUid` 값 확인
   - [ ] `team_members` 문서 확인

4. **권한 확인**
   - [ ] `teams/{teamId}` 문서의 `owners` 배열 확인
   - [ ] `allowManualFee: true` 확인

---

## 📋 최종 체크리스트 요약

### 테스트 전
- [ ] `.env.local`에 에뮬레이터 비활성화 설정
- [ ] 에뮬레이터 종료
- [ ] 앱 재시작
- [ ] 구글 로그인 (프로덕션)
- [ ] 테스트 대상 회원 상태 기록

### 테스트 중
- [ ] 납부 완료 버튼 클릭
- [ ] 확인 모달 확인
- [ ] 에러 없음 확인
- [ ] UI 변경 확인

### 테스트 후
- [ ] Firestore 데이터 확인
- [ ] audit 로그 확인
- [ ] 롤백 경로 확인

---

## 🎯 성공 기준

✅ **"이제 다시 납부 처리하면 진짜 되는 거지?"**

→ **된다. 거의 확실함.**

**확인 사항:**
1. ✅ 에뮬레이터 연결 끊김
2. ✅ 프로덕션 Firebase Auth 사용
3. ✅ 프로덕션 Firestore 사용
4. ✅ 프로덕션 Functions 사용
5. ✅ 권한 정상
6. ✅ 데이터 정상

---

## 📞 다음 단계

테스트 성공 후:
1. ✅ 프로덕션 테스트 체크리스트 ← **완료**
2. ✅ 회비 처리 Cloud Function 최종 검증 ← **완료**
3. ✅ 실수 방지용 로그 추가 ← **완료**

**이제 프로덕션에서 안전하게 테스트할 준비가 완료되었습니다!** 🎉

