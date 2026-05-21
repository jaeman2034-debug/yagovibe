# 🚀 매칭 참여 시스템 배포 커맨드 세트

## 📋 배포 전 필수 작업

### 1. 데이터 정합 보정 (선택사항, 문제 있을 때만)

```bash
# TypeScript 실행
npx ts-node scripts/fixMarketJoinIntegrity.ts

# 또는 Node.js로 컴파일 후
tsc scripts/fixMarketJoinIntegrity.ts
node scripts/fixMarketJoinIntegrity.js
```

---

### 2. Firestore 인덱스 배포

```bash
# 인덱스 배포
firebase deploy --only firestore:indexes

# 인덱스 생성 상태 확인 (브라우저)
# Firebase Console → Firestore → Indexes 탭
```

**중요**: 인덱스 생성은 시간이 걸릴 수 있습니다 (수 분 ~ 수십 분).  
배포 후 Firebase Console에서 "Building" → "Enabled" 상태 확인 필수.

---

### 3. Security Rules 배포

```bash
# Rules 배포
firebase deploy --only firestore:rules

# Rules 테스트 (선택사항)
firebase emulators:start --only firestore
```

---

### 4. Cloud Functions 배포

```bash
# 전체 Functions 배포
firebase deploy --only functions

# 특정 함수만 배포 (빠른 배포)
firebase deploy --only functions:onMarketJoinStatusChanged
firebase deploy --only functions:onMarketJoinDeleted
firebase deploy --only functions:onMarketPostDeleted
firebase deploy --only functions:diagnoseMarketJoinData
firebase deploy --only functions:fixMarketJoinData
firebase deploy --only functions:testMarketJoinE2E
```

---

## 🧪 배포 후 검증

### 1. E2E 테스트 실행

```bash
# Firebase Functions Shell
firebase functions:shell

# 테스트 실행
> testMarketJoinE2E()
```

또는 HTTP 호출:
```bash
curl -X POST \
  https://asia-northeast3-{project}.cloudfunctions.net/testMarketJoinE2E \
  -H "Authorization: Bearer {admin_token}"
```

---

### 2. 데이터 진단 실행

```bash
# 단일 게시글 진단
firebase functions:shell
> diagnoseMarketJoinData({ postId: "xxx" })

# 전체 진단 (관리자만)
> diagnoseAllMarketPosts({})
```

또는 UI에서:
```
/app/admin/market-join-diagnostic
```

---

### 3. 로그 확인

```bash
# 실시간 로그
firebase functions:log

# 특정 함수 로그
firebase functions:log --only onMarketJoinStatusChanged
firebase functions:log --only onMarketPostDeleted
```

---

## 📊 배포 체크리스트

배포 전:
- [ ] `firestore.indexes.json` 확인
- [ ] `firestore.rules` 확인
- [ ] Functions 코드 린트 통과
- [ ] 로컬 테스트 완료

배포 중:
- [ ] 인덱스 배포 완료 (Building → Enabled 확인)
- [ ] Rules 배포 완료
- [ ] Functions 배포 완료

배포 후:
- [ ] E2E 테스트 통과
- [ ] 데이터 진단 실행 (문제 없음 확인)
- [ ] 로그 확인 (에러 없음 확인)
- [ ] 실제 플로우 테스트 (신청 → 승인 → 취소)

---

## 🔄 롤백 계획

문제 발생 시:

### 1. Functions 롤백

```bash
# 특정 함수 삭제
firebase functions:delete onMarketJoinStatusChanged

# 이전 버전으로 재배포
git checkout <previous-commit>
firebase deploy --only functions:onMarketJoinStatusChanged
```

### 2. Rules 롤백

```bash
git checkout firestore.rules
firebase deploy --only firestore:rules
```

### 3. 인덱스 롤백

인덱스는 삭제만 가능 (자동 롤백 없음):
- Firebase Console → Firestore → Indexes
- 불필요한 인덱스 삭제

---

## 🚨 알려진 제한사항

1. **인덱스 생성 시간**: 수 분 ~ 수십 분 소요 가능
2. **배치 삭제 500개 제한**: 운영형 코드로 자동 처리됨
3. **트리거 지연**: Cloud Functions 트리거는 약간의 지연 가능 (1-2초)

---

## ✅ 배포 완료 확인

다음 조건 만족 시 배포 완료:

- [ ] E2E 테스트 모두 통과
- [ ] 데이터 진단 문제 없음
- [ ] 로그 에러 없음
- [ ] 실제 플로우 정상 동작
- [ ] 알림/메시지 정상 발송

---

## 📞 문제 발생 시

1. **로그 확인**: `firebase functions:log`
2. **데이터 진단**: `/app/admin/market-join-diagnostic`
3. **운영 로그 확인**: `_marketJoinLogs` 컬렉션
4. **롤백 실행**: 위 롤백 계획 참조
