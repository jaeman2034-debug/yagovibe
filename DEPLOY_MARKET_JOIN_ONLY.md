# 🚀 모집 승인 시스템 전용 배포 가이드

## 목적
`onMarketJoinStatusChanged` Function만 배포하여 모집 승인 플로우를 활성화합니다.
나머지 Functions는 타입 에러 해결 후 순차 배포 예정입니다.

---

## ✅ 배포 전 확인 사항

### 1. Functions 최소화 완료
- `functions/src/index.ts`에서 `onMarketJoinStatusChanged`만 export
- 나머지 Functions는 모두 주석 처리

### 2. Rules 배포 준비
- `firestore.rules`에서 `currentPeople` 변경 차단 규칙 적용 완료
- 작성자는 `currentPeople` 변경 불가, 서버(Cloud Function)만 가능

### 3. 코드 수정 완료
- 클라이언트에서 `currentPeople` 업데이트 제거
- Cloud Function에서 승인/취소 시 `currentPeople` 자동 처리

---

## 📦 배포 순서

### 1단계: Rules 배포 (먼저!)

```bash
firebase deploy --only firestore:rules
```

**확인 사항:**
- Rules 배포 성공 확인
- `market` 컬렉션 업데이트 규칙 확인

---

### 2단계: Functions 빌드 확인

```bash
cd functions
npm run build
```

**예상 결과:**
- 타입 에러 없음 (onMarketJoinStatusChanged만 export하므로)
- `lib/index.js` 생성 확인

---

### 3단계: Functions 배포

```bash
# 전체 Functions 배포 (onMarketJoinStatusChanged만 포함)
firebase deploy --only functions

# 또는 특정 함수만 배포
firebase deploy --only functions:onMarketJoinStatusChanged
```

**확인 사항:**
- 배포 성공 확인
- Firebase Console에서 Function 확인

---

## 🧪 배포 후 테스트

### 1. 일반 유저 참여 신청
- ✅ `marketJoins` 문서 생성 (pending)
- ✅ 권한 오류 없음
- ✅ `currentPeople` 변경 없음

### 2. 작성자 승인
- ✅ `marketJoins` status: approved
- ✅ Cloud Function 트리거 확인
- ✅ `market currentPeople +1` 확인

### 3. 일반 유저 취소
- ✅ `marketJoins` status: cancelled_by_user
- ✅ Cloud Function 트리거 확인
- ✅ `market currentPeople -1` 확인

---

## 🔧 문제 해결

### 빌드 에러 발생 시

```bash
# 타입 체크 완전 스킵 (비권장, 긴급 시만)
cd functions
tsc --skipLibCheck --noEmitOnError false
```

### 배포 실패 시

```bash
# Functions 로그 확인
firebase functions:log --only onMarketJoinStatusChanged

# Rules 테스트
firebase firestore:rules:test
```

---

## 📝 다음 단계 (타입 에러 해결 후)

1. CS Functions 타입 에러 수정
2. Partner Functions 타입 에러 수정
3. 순차적으로 `index.ts`에서 주석 해제
4. 각 Function별 배포 테스트

---

## ✅ 배포 체크리스트

- [ ] Rules 배포 완료
- [ ] Functions 빌드 성공
- [ ] Functions 배포 완료
- [ ] 일반 유저 참여 신청 테스트
- [ ] 작성자 승인 테스트
- [ ] 일반 유저 취소 테스트
- [ ] Cloud Function 로그 확인

---

**배포 완료 후 모집 승인 시스템이 정상 동작합니다! 🎉**
