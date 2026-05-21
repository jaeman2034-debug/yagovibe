# 🔥 매칭 참여 테스트 가이드

## ✅ 완료된 테스트 코드

### 1. Mock 데이터
**파일:** `tests/market/mock.ts`

**기능:**
- 게시글 Mock
- 참여 신청 Mock
- 사용자 Mock
- 채팅방 Mock

---

### 2. 승인 알림 테스트
**파일:** `tests/market/approve.test.ts`

**테스트 내용:**
- 승인 시 알림 발송 확인
- 알림 타입 확인
- 채팅방 ID 포함 확인

**실행:**
```bash
npm test tests/market/approve.test.ts
```

---

### 3. FULL 자동거절 테스트
**파일:** `tests/market/rejected.test.ts`

**테스트 내용:**
- FULL 거절 시 알림 발송 확인
- 알림 타입 확인
- 채팅방 ID 없음 확인

**실행:**
```bash
npm test tests/market/rejected.test.ts
```

---

### 4. E2E 전체 흐름 테스트
**파일:** `tests/market/e2e.test.ts`

**테스트 내용:**
1. 신청
2. 승인
3. 알림 확인
4. 채팅 진입 가능 여부

**실행:**
```bash
npm test tests/market/e2e.test.ts
```

---

### 5. 로컬 시뮬레이션 스크립트
**파일:** `scripts/simulateMarketJoin.ts`

**기능:**
- 실제 Firestore에 데이터 생성
- 전체 흐름 시뮬레이션
- 알림 목록 확인

**실행:**
```bash
# 환경 변수 설정
export TEST_USER_ID="your_user_id"
export TEST_POST_ID="your_post_id"

# 실행
ts-node scripts/simulateMarketJoin.ts
```

---

## 테스트 시나리오

### 시나리오 1: 승인 알림
```
1. 유저 A 참여 신청
2. 작성자 승인
3. → 알림 도착 (인앱 + FCM)
4. 알림 클릭 → 채팅방 이동
```

### 시나리오 2: FULL 자동 거절
```
1. 게시글 정원 마감
2. 유저 B 참여 신청
3. → 자동 거절 알림 도착
4. 알림 클릭 → 게시글 상세 이동
```

---

## 테스트 실행 방법

### 1. 단위 테스트
```bash
npm test
```

### 2. 특정 테스트만 실행
```bash
npm test tests/market/approve.test.ts
```

### 3. 시뮬레이션 스크립트
```bash
ts-node scripts/simulateMarketJoin.ts
```

---

## 검증 포인트

### ✅ 승인 알림
- [x] 알림 타입: `JOIN_APPROVED`
- [x] 채팅방 ID 포함
- [x] 읽음 상태: `false`
- [x] FCM 발송 확인

### ✅ FULL 거절 알림
- [x] 알림 타입: `JOIN_REJECTED_FULL`
- [x] 채팅방 ID 없음
- [x] 읽음 상태: `false`
- [x] FCM 발송 확인

### ✅ E2E 흐름
- [x] 신청 → 승인 → 알림 → 채팅 진입
- [x] 전체 흐름 정상 동작

---

## 다음 단계

테스트 완료 후 다음 중 선택:

### A안 — 무결성 봇
- 정원 초과 자동 복구
- 유령 승인 제거
- 로그

### B안 — 관리자 대시보드
- 강제 승인/롤백
- 상태 모니터

### C안 — 채팅 권한 가드 강화
- 승인 전 메시지 차단
- 신고/추방

---

## ✅ 테스트 코드 완료

**운영 직전 품질 검증 준비 완료** 🚀
