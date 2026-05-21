# 🚀 매칭 참여 시스템 배포 가이드

## 🔍 데이터 진단 도구 사용법

### 1. 클라이언트 UI (추천)

```
/admin/market-join-diagnostic
```

접속 후:
1. postId 입력 → "진단" 클릭
2. 문제 확인
3. "자동 수정" 클릭 (필요시)

### 2. Cloud Functions 호출

```bash
# 단일 게시글 진단
firebase functions:shell
> diagnoseMarketJoinData({ postId: "xxx" })

# 전체 게시글 진단 (관리자만)
> diagnoseAllMarketPosts({})

# 자동 수정
> fixMarketJoinData({ postId: "xxx", autoFix: true })
```

### 3. HTTP 호출

```bash
curl -X POST \
  https://asia-northeast3-{project}.cloudfunctions.net/diagnoseMarketJoinData \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"data": {"postId": "xxx"}}'
```

---

## 📋 배포 전 체크리스트

### 1. Firestore 인덱스 생성

Firebase Console에서 다음 인덱스 생성:

#### marketJoins 컬렉션
```
1. postId (오름차순) + status (오름차순)
2. postId (오름차순) + userId (오름차순)
3. postId (오름차순) + createdAt (내림차순)
```

#### notifications 컬렉션
```
1. userId (오름차순) + isRead (오름차순) + createdAt (내림차순)
2. payload.postId (오름차순) + createdAt (내림차순)
3. target.id (오름차순) + createdAt (내림차순)
```

#### chatRooms 컬렉션
```
1. productId (오름차순) + createdAt (내림차순)
2. buyerId (오름차순) + sellerId (오름차순)
```

---

### 2. Security Rules 배포

```bash
firebase deploy --only firestore:rules
```

---

### 3. Cloud Functions 배포

```bash
# 전체 배포
firebase deploy --only functions

# 특정 함수만 배포
firebase deploy --only functions:onMarketJoinStatusChanged
firebase deploy --only functions:onMarketJoinDeleted
firebase deploy --only functions:onMarketPostDeleted
```

---

### 4. E2E 테스트 실행

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

## 🧪 수동 테스트 시나리오

### 시나리오 1: 신청 → 승인 → 취소

1. 사용자 A가 모집글에 신청
2. 작성자가 승인
3. 사용자 A가 취소
4. 확인:
   - [ ] `currentPeople` 감소
   - [ ] 채팅방에 시스템 메시지
   - [ ] 알림 생성

### 시나리오 2: 동시 승인

1. 모집글 생성 (max = 1)
2. 사용자 A, B가 동시 신청
3. 작성자가 A, B 동시 승인 시도
4. 확인:
   - [ ] `currentPeople <= max` 보장
   - [ ] 한 명만 승인됨

### 시나리오 3: 모집 삭제

1. 모집글 생성
2. 여러 신청 생성
3. 모집글 삭제
4. 확인:
   - [ ] 모든 `marketJoins` 삭제됨
   - [ ] 채팅방에 삭제 안내
   - [ ] 관련 알림 정리됨

---

## 📊 모니터링 설정

### Cloud Functions 로그 확인

```bash
# 실시간 로그
firebase functions:log

# 특정 함수 로그
firebase functions:log --only onMarketJoinStatusChanged
```

### Firestore 콘솔 확인

- `_marketJoinLogs` 컬렉션 모니터링
- `_marketPostDeletionLogs` 컬렉션 모니터링

---

## 🚨 알려진 제한사항

### 1. 배치 삭제 500개 제한
- Firestore 배치 최대 500개
- 초과 시 재귀 호출로 처리
- 대량 삭제 시 시간 소요 가능

### 2. 중첩 필드 쿼리
- `payload.postId` 쿼리 시 인덱스 필요
- fallback으로 `target.id` 또는 전체 스캔

### 3. 트리거 지연
- Cloud Functions 트리거는 약간의 지연 가능
- 클라이언트는 optimistic UI로 처리

---

## ✅ 배포 완료 확인

배포 후 다음을 확인:

- [ ] E2E 테스트 모두 통과
- [ ] Security Rules 적용 확인
- [ ] 인덱스 생성 완료
- [ ] 트리거 정상 동작 확인
- [ ] 알림 UI 정상 동작 확인
- [ ] 로그 수집 정상 확인

---

## 🔄 롤백 계획

문제 발생 시:

1. Cloud Functions 롤백
   ```bash
   firebase functions:delete onMarketJoinStatusChanged
   ```

2. Security Rules 롤백
   ```bash
   git checkout firestore.rules
   firebase deploy --only firestore:rules
   ```

---

## 📞 지원

문제 발생 시 확인할 로그:

- Cloud Functions 로그
- Firestore 콘솔
- `_marketJoinLogs` 컬렉션
- `_marketPostDeletionLogs` 컬렉션
