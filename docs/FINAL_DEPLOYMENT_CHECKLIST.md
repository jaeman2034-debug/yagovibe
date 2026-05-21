# ✅ 매칭 참여 시스템 최종 배포 체크리스트

## 🎯 배포 전 필수 작업 (순서대로 실행)

### 1️⃣ 데이터 정합 보정 (문제 있을 때만)

```bash
# TypeScript 실행
npx ts-node scripts/fixMarketJoinIntegrity.ts
```

**확인 사항:**
- [ ] `currentPeople` 불일치 수정됨
- [ ] `currentPeople > people` 문제 해결됨
- [ ] `status` 자동 조정됨

---

### 2️⃣ Firestore 인덱스 배포

```bash
firebase deploy --only firestore:indexes
```

**확인 사항:**
- [ ] Firebase Console → Firestore → Indexes
- [ ] 모든 인덱스 "Building" → "Enabled" 상태 확인
- [ ] 인덱스 생성 완료까지 대기 (수 분 ~ 수십 분)

---

### 3️⃣ Security Rules 배포

```bash
firebase deploy --only firestore:rules
```

**확인 사항:**
- [ ] Rules 배포 성공
- [ ] 기존 기능 정상 동작 확인

---

### 4️⃣ Cloud Functions 배포

```bash
# 전체 배포
firebase deploy --only functions

# 또는 개별 배포 (빠른 배포)
firebase deploy --only functions:onMarketJoinStatusChanged
firebase deploy --only functions:onMarketJoinDeleted
firebase deploy --only functions:onMarketPostDeleted
firebase deploy --only functions:diagnoseMarketJoinData
firebase deploy --only functions:fixMarketJoinData
firebase deploy --only functions:testMarketJoinE2E
```

**확인 사항:**
- [ ] Functions 배포 성공
- [ ] 로그 에러 없음

---

## 🧪 배포 후 검증 (필수)

### 1️⃣ E2E 테스트 실행

```bash
firebase functions:shell
> testMarketJoinE2E()
```

**합격 기준:**
- [ ] 모든 테스트 통과
- [ ] `currentPeople` 정합 100%
- [ ] 중복 신청 차단 확인
- [ ] 동시 승인 보호 확인

---

### 2️⃣ 데이터 진단 실행

**UI에서:**
```
/app/admin/market-join-diagnostic
```

또는 Functions Shell:
```bash
> diagnoseMarketJoinData({ postId: "xxx" })
```

**확인 사항:**
- [ ] 문제점 0개
- [ ] 경고 최소화
- [ ] 필드 매핑 정상

---

### 3️⃣ 실전 플로우 테스트

**테스트 계정 3개 준비:** `host`, `u1`, `u2`

1. **u1 신청**
   - [ ] `marketJoins` 생성됨
   - [ ] 상태 `pending`

2. **host 승인(u1)**
   - [ ] `status = approved`
   - [ ] `currentPeople = 1`
   - [ ] 시스템 메시지 생성됨
   - [ ] 알림 생성됨
   - [ ] 채팅방 생성됨

3. **u2 신청 → host 승인(u2)**
   - [ ] `currentPeople = 2`
   - [ ] `status = done` (자동 마감)

4. **u1 취소**
   - [ ] `currentPeople = 1`
   - [ ] `status = active` (재오픈)
   - [ ] 시스템 메시지 생성됨
   - [ ] 알림 생성됨

5. **u3 신청 시도 (마감 상태)**
   - [ ] 신청 실패 (마감 메시지)

**합격 기준:**
- [ ] `currentPeople`이 `people`을 절대 넘지 않음
- [ ] 승인/취소 후 알림/메시지 항상 생성됨
- [ ] 마감/재오픈 정상 동작

---

### 4️⃣ 레이스 테스트

**시나리오:** host 화면 2개 탭에서 같은 신청서 동시 승인

**합격 기준:**
- [ ] `currentPeople`이 `people` 초과하지 않음
- [ ] 한쪽은 실패 또는 이미 승인 처리됨

---

## 📊 운영 모니터링

### 로그 확인

```bash
firebase functions:log
```

**확인 사항:**
- [ ] 에러 없음
- [ ] 트리거 정상 실행
- [ ] 중복 방지 로그 확인

---

### 운영 로그 확인

Firestore Console:
- `_marketJoinLogs` 컬렉션
- `_marketPostDeletionLogs` 컬렉션

**확인 사항:**
- [ ] 로그 정상 기록됨
- [ ] Idempotency 키 정상 동작

---

## ✅ 배포 완료 기준

다음 조건 **모두 만족** 시 배포 완료:

- [ ] E2E 테스트 모두 통과
- [ ] 데이터 진단 문제 없음
- [ ] 실전 플로우 테스트 통과
- [ ] 레이스 테스트 통과
- [ ] 로그 에러 없음
- [ ] 알림/메시지 정상 발송
- [ ] 인덱스 생성 완료

---

## 🚨 문제 발생 시

### 즉시 조치

1. **로그 확인**
   ```bash
   firebase functions:log --only onMarketJoinStatusChanged
   ```

2. **데이터 진단**
   ```
   /app/admin/market-join-diagnostic
   ```

3. **롤백 실행**
   ```bash
   git checkout <previous-commit>
   firebase deploy --only functions:onMarketJoinStatusChanged
   ```

---

## 📞 지원

문제 발생 시 확인할 로그:
- Cloud Functions 로그
- Firestore 콘솔
- `_marketJoinLogs` 컬렉션
- `_marketPostDeletionLogs` 컬렉션

---

## 🎉 배포 완료!

모든 체크리스트 완료 시 → **운영 사고 0 모드 배포 완료!**
