# ✅ 매칭 참여 시스템 최종 릴리즈 체크리스트

## 📋 프로젝트 구조 (확인 완료)

### 컬렉션명
- ✅ `market` (게시글)
- ✅ `marketJoins` (참여 신청, **applications 아님**)

### 필드명
- ✅ `people` (최대 인원수, **max 아님**)
- ✅ `currentPeople` (현재 인원수, **joined 아님**)
- ✅ `status` (상태: pending, approved, rejected, cancelled_by_user, cancelled_by_author)
- ✅ `authorId` (market 컬렉션의 작성자 ID)
- ✅ `postAuthorId` (marketJoins 컬렉션에 저장된 작성자 ID, **hostId 아님**)

---

## 🔥 1. 데이터 정합 100%

### 원칙 (절대 법칙)
> **currentPeople = "approved + pending 개수"**  
> UI는 이 값만 신뢰

### 보정 스크립트 실행
```bash
npx ts-node scripts/fixMarketJoinIntegrity_FINAL.ts
```

### 확인 사항
- [ ] `currentPeople` = `approved + pending` 수
- [ ] `currentPeople` ≤ `people`
- [ ] `currentPeople > people` 문제 해결됨
- [ ] `status` 자동 조정됨 (마감/오픈)

---

## 🔥 2. 동시성 사고 0%

### 시나리오 A: 정상 루트
1. [ ] u1 신청 → `marketJoins` 생성 (status: pending)
2. [ ] host 승인 → `status = approved`, `currentPeople +1`
3. [ ] 알림 도착 → `notifications` 생성
4. [ ] 채팅 시스템 메시지 → `chatRooms/{roomId}/messages` 생성
5. [ ] `currentPeople` 정확히 +1

### 시나리오 B: 동시 승인
- [ ] 두 탭에서 동시 승인 시도
- [ ] `currentPeople`이 `people` 초과하지 않음 ✅
- [ ] 트랜잭션으로 원자성 보장 ✅

### 시나리오 C: 취소
- [ ] `approved` → `cancelled_by_user` 또는 `cancelled_by_author`
- [ ] `currentPeople -1` ✅
- [ ] 알림 + 시스템 메시지 생성 ✅

### 시나리오 D: 마감 자동
- [ ] `currentPeople == people` → `status = done` ✅
- [ ] 신청 불가 (에러 메시지) ✅

---

## 🔥 3. 트리거 멱등성

### 확인 사항
- [ ] 승인 트리거 중복 실행 방지 (`_idempotency` 컬렉션)
- [ ] 취소 트리거 중복 실행 방지
- [ ] 삭제 트리거 중복 실행 방지
- [ ] 시스템 메시지 중복 생성 방지
- [ ] 알림 중복 생성 방지

### 테스트
```bash
# 같은 트리거를 2번 실행해도 1번만 처리되는지 확인
firebase functions:shell
> # 트리거 수동 실행 테스트
```

---

## 🔥 4. 권한 완전 봉쇄

### Security Rules 확인
- [ ] 일반 유저 승인 불가 (`postAuthorId` 검증)
- [ ] 알림 `create: false` (서버만 생성)
- [ ] `marketJoins` 생성: 본인만 (`userId` 검증)
- [ ] `marketJoins` 삭제: 본인만
- [ ] `marketJoins` 수정: 작성자만 (`postAuthorId` 검증)

### 테스트
- [ ] 일반 유저가 승인 API 호출 → 거부 ✅
- [ ] 알림 직접 생성 시도 → 거부 ✅

---

## 🔥 5. 모니터링 루트 확보

### 운영 로그 컬렉션
- [ ] `_idempotency` (중복 방지 로그)
- [ ] `_marketJoinLogs` (참여 로그)
- [ ] `_marketPostDeletionLogs` (삭제 로그)

### 로그 타입
- [ ] `APPLY` (신청)
- [ ] `APPROVED` (승인)
- [ ] `REJECTED` (거절)
- [ ] `CANCELLED` (취소)
- [ ] `POST_DELETED` (게시글 삭제)
- [ ] `ERROR` (에러)

---

## 🚀 배포 순서 (그대로 실행)

### 1. 데이터 정합 보정
```bash
npx ts-node scripts/fixMarketJoinIntegrity_FINAL.ts
```

### 2. Firestore 인덱스 배포
```bash
firebase deploy --only firestore:indexes
```

**확인**: Firebase Console → Firestore → Indexes → "Building" → "Enabled"

### 3. Security Rules 배포
```bash
firebase deploy --only firestore:rules
```

### 4. Cloud Functions 배포
```bash
firebase deploy --only functions
```

### 5. 검증
```bash
# E2E 테스트
firebase functions:shell
> testMarketJoinE2E()

# 데이터 진단
> diagnoseMarketJoinData({ postId: "xxx" })
```

---

## ✅ 최종 확인 사항

### 정합성
- [ ] `currentPeople` = `approved + pending` 수
- [ ] `currentPeople` ≤ `people`
- [ ] 마감 자동 (`currentPeople >= people` → `status = done`)

### 동시성
- [ ] 동시 승인 2탭 → `currentPeople` 초과 안 됨
- [ ] 중복 신청 2탭 → 1개만 생성

### 트리거
- [ ] 승인 → 메시지 + 알림 생성 (중복 없음)
- [ ] 취소 → `currentPeople -1` (중복 없음)
- [ ] 삭제 → 대청소 (500+ 안전)

### 보안
- [ ] 일반 유저 승인 불가
- [ ] 알림 `create: false`

### 모니터링
- [ ] 운영 로그 정상 기록
- [ ] Idempotency 로그 정상 기록

---

## 🎉 릴리즈 완료!

모든 체크리스트 통과 시 → **운영 레벨 졸업! 🚀**

---

## 📞 문제 발생 시

1. **로그 확인**
   ```bash
   firebase functions:log
   ```

2. **데이터 진단**
   ```
   /app/admin/market-join-diagnostic
   ```

3. **롤백**
   ```bash
   git checkout <previous-commit>
   firebase deploy --only functions:onMarketJoinStatusChanged
   ```

---

## 🔥 Firestore 인덱스 자동 생성 링크

Firebase Console에서 다음 인덱스 생성:

1. **marketJoins**
   - `postId` (ASC) + `status` (ASC)
   - `postId` (ASC) + `userId` (ASC)
   - `postId` (ASC) + `createdAt` (DESC)

2. **notifications**
   - `userId` (ASC) + `isRead` (ASC) + `createdAt` (DESC)
   - `payload.postId` (ASC) + `createdAt` (DESC)
   - `target.id` (ASC) + `createdAt` (DESC)

3. **chatRooms**
   - `productId` (ASC) + `createdAt` (DESC)
   - `buyerId` (ASC) + `sellerId` (ASC)

4. **messages** (서브컬렉션)
   - `type` (ASC) + `systemType` (ASC) + `metadata.postId` (ASC) + `metadata.approvedUserId` (ASC)

**또는** `firestore.indexes.json` 배포:
```bash
firebase deploy --only firestore:indexes
```

---

**이제 진짜 배포 버튼만 남았습니다! 🚀**
