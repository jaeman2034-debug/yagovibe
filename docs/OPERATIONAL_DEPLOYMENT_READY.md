# 🚀 운영 배포 준비 완료 (운영 사고 0 모드)

## ✅ 최종 완성 상태

모든 코드가 **운영 배포 가능 상태**로 완성되었습니다.

---

## 🔥 핵심 개선 사항

### 1. 멱등성(Idempotency) 보장
- ✅ `once()` 헬퍼로 트리거 중복 실행 방지
- ✅ 승인/취소/삭제 모든 트리거에 적용
- ✅ `_idempotency` 컬렉션으로 중복 방지

### 2. 대량 삭제 안전 처리 (500+)
- ✅ `chunkDeleteByQuery()` 헬퍼로 무한 루프 방식 처리
- ✅ 배치 제한(500개) 자동 분할
- ✅ `marketJoins`, `notifications` 모두 안전 처리

### 3. 데이터 정합 보장
- ✅ `currentPeople` 자동 재계산 스크립트
- ✅ `currentPeople > people` 강제 정상화
- ✅ `status` 자동 조정 (마감/오픈)

---

## 📋 프로젝트 구조 확인 완료

### 컬렉션명
- ✅ `market` (게시글)
- ✅ `marketJoins` (참여 신청, applications 아님)

### 필드명
- ✅ `people` (최대 인원수, max 아님)
- ✅ `currentPeople` (현재 인원수, joined 아님)
- ✅ `authorId` (작성자 ID)
- ✅ `postAuthorId` (marketJoins에 저장된 작성자 ID)
- ✅ `status` (상태: pending, approved, rejected, cancelled_by_user, cancelled_by_author)

---

## 🚀 배포 순서 (그대로 실행하면 끝)

### 1. 데이터 정합 보정 (문제 있을 때만)

```bash
npx ts-node scripts/fixMarketJoinIntegrity.ts
```

---

### 2. Firestore 인덱스 배포

```bash
firebase deploy --only firestore:indexes
```

**확인**: Firebase Console → Firestore → Indexes → "Building" → "Enabled"

---

### 3. Security Rules 배포

```bash
firebase deploy --only firestore:rules
```

---

### 4. Cloud Functions 배포

```bash
# 전체 배포
firebase deploy --only functions

# 또는 개별 배포
firebase deploy --only functions:onMarketJoinStatusChanged
firebase deploy --only functions:onMarketJoinDeleted
firebase deploy --only functions:onMarketPostDeleted
```

---

### 5. 검증

```bash
# E2E 테스트
firebase functions:shell
> testMarketJoinE2E()

# 데이터 진단
> diagnoseMarketJoinData({ postId: "xxx" })
```

---

## ✅ 출시 체크리스트

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
- [ ] 일반 유저 승인 불가 (Rules 확인)
- [ ] 알림 `create: false` (서버만 생성)

---

## 🎉 배포 완료!

모든 체크리스트 통과 시 → **운영 배포 완료!**

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

## 🔥 운영 모니터링

### 필수 확인 사항
- `_idempotency` 컬렉션 (중복 방지 로그)
- `_marketJoinLogs` 컬렉션 (운영 로그)
- `_marketPostDeletionLogs` 컬렉션 (삭제 로그)

### 알림 지표
- 알림 생성 성공률
- 시스템 메시지 발송 성공률
- 트리거 실행 횟수

---

**이제 진짜 배포 버튼만 남았습니다! 🚀**
