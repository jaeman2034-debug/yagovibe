# 🚀 프로덕션 배포 체크리스트 (회비 완납 기능)

## ✅ 배포 전 확인 사항

### 1️⃣ 에뮬레이터 연결 비활성화

**`.env.local` 파일 확인:**

```env
VITE_USE_AUTH_EMULATOR=false
VITE_USE_FIRESTORE_EMULATOR=false
VITE_USE_FUNCTIONS_EMULATOR=false
```

### 2️⃣ Functions 코드 검증

- [ ] `processFeePaymentCallable` 함수 정상 컴파일
- [ ] 에러 핸들링 완료
- [ ] 트랜잭션 적용 (fee + audit 로그)
- [ ] 로깅 충분

### 3️⃣ Firestore 인덱스 배포

```bash
firebase deploy --only firestore:indexes
```

또는 Firebase Console에서 자동 생성 링크 따라가기

---

## 🚀 배포 단계

### STEP 1: Functions 배포

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:processFeePaymentCallable
```

### STEP 2: 프론트 재시작

```bash
# 에뮬레이터 종료 (Ctrl + C)
npm run dev
```

### STEP 3: 브라우저 새로고침

- 완전히 로그아웃
- 다시 구글 로그인 (프로덕션 Auth)
- 팀 대시보드 접근

---

## ✅ 테스트 체크리스트

### 1️⃣ 기본 동작 확인

- [ ] 로그인 정상
- [ ] 팀 목록 보임
- [ ] 회원 목록 보임
- [ ] 회비 상세 페이지 접근 가능

### 2️⃣ 권한 확인

- [ ] 관리자 계정으로 로그인됨
- [ ] `[납부 완료 (수동)]` 버튼 파란색 활성화
- [ ] 🔒 자물쇠 아이콘 없음

### 3️⃣ 회비 납부 테스트

**테스트 대상: 1명만 선택**

- [ ] `[납부 완료 (수동)]` 클릭
- [ ] 확인 모달 표시
- [ ] `[확인]` 클릭
- [ ] ❌ internal 에러 없음
- [ ] ✅ 모달 닫힘
- [ ] ✅ 행이 완납 ✔ 표시
- [ ] ✅ 버튼 사라짐

### 4️⃣ Firestore 데이터 확인

- [ ] `teams/{teamId}/fees/{YYYY-MM}/items/{memberId}` 문서 생성됨
- [ ] `auditLogs` 컬렉션에 로그 생성됨
- [ ] `rollbackable: true` 플래그 확인

---

## 🚨 문제 발생 시

### 에러: "팀을 찾을 수 없습니다"

**원인:** Firestore에 해당 팀 문서가 없음

**해결:**
1. Firebase Console → Firestore 확인
2. `teams/{teamId}` 문서 존재 여부 확인
3. `ownerUid` 필드 확인

### 에러: "회원을 찾을 수 없습니다"

**원인:** `teams/{teamId}/members/{memberId}` 문서가 없음

**해결:**
1. Firebase Console → Firestore 확인
2. `teams/{teamId}/members/{memberId}` 문서 존재 여부 확인

### 에러: FirebaseError: internal

**원인:** Functions 내부 에러

**해결:**
1. Firebase Console → Functions → Logs 확인
2. 에러 메시지 복사
3. 코드 수정 후 재배포

---

## 📊 성공 기준

✅ **"이제 다시 납부 처리하면 진짜 되는 거지?"**

→ **된다. 거의 확실함.**

**확인 사항:**
1. ✅ 에뮬레이터 연결 끊김
2. ✅ 프로덕션 Firebase Auth 사용
3. ✅ 프로덕션 Firestore 사용
4. ✅ 프로덕션 Functions 사용
5. ✅ 권한 정상
6. ✅ 데이터 정상
7. ✅ 트랜잭션 적용
8. ✅ 에러 핸들링 완료

---

## 🔄 롤백 방법

문제 발생 시 즉시 롤백:

1. Firestore Console → `teams/{teamId}/fees/{YYYY-MM}/items/{memberId}` 문서 삭제
2. 브라우저 새로고침
3. 다시 미납 상태로 표시됨

---

## 📝 배포 후 모니터링

### Functions 로그 확인

```bash
firebase functions:log --only processFeePaymentCallable
```

### 주요 확인 사항

- [ ] 에러율 0%
- [ ] 평균 실행 시간 < 2초
- [ ] 트랜잭션 성공률 100%

---

**이제 프로덕션에서 안전하게 테스트할 준비가 완료되었습니다!** 🎉

