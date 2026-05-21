# 🔥 매칭 참여 시스템 QA 체크리스트 (배포 직전)

## ✅ 핵심 12개 테스트 (필수)

### A. 신청 단계

#### 1) 중복 신청 차단
- [ ] 같은 계정 → 신청 버튼 2연타
- [ ] 다른 탭에서 동시 신청
- [ ] 결과: `marketJoins` 1개만 생성 (docId 고정: `${postId}_${userId}`)
- [ ] 트랜잭션으로 원자성 보장

#### 2) 마감 후 신청
- [ ] `currentPeople == people` 상태
- [ ] 신청 시 → "모집 인원이 마감되었습니다" 에러
- [ ] 트랜잭션 내부에서 재확인

#### 3) 로그인/비로그인
- [ ] 비로그인 → 신청 버튼 비활성화
- [ ] Security Rules로 차단

---

### B. 승인 단계

#### 4) 동시 승인 2명
- [ ] 관리자 두 탭에서 동시 승인
- [ ] 결과: `currentPeople`이 `max` 초과하지 않음 ✅
- [ ] 트랜잭션으로 원자성 보장

#### 5) 이미 승인된 문서 재승인
- [ ] `status === "approved"` 문서 재승인 시도
- [ ] 카운트 증가하지 않음 ✅
- [ ] 상태 머신 검증으로 차단

#### 6) 승인 직후 트리거
- [ ] 시스템 메시지 생성 확인
- [ ] 알림 생성 확인 (`notifications` 컬렉션)
- [ ] 채팅방 생성/확인
- [ ] FCM 푸시 발송 확인

---

### C. 취소 단계

#### 7) 유저 취소
- [ ] `approved` → `cancelled_by_user`
- [ ] `currentPeople -1` 확인
- [ ] 시스템 메시지 발송 확인
- [ ] 알림 생성 확인

#### 8) 관리자가 승인 취소
- [ ] `approved` → `cancelled_by_author`
- [ ] 동일 로직 동작 확인
- [ ] `currentPeople -1` 확인

#### 9) 0 이하 보호
- [ ] `currentPeople = 0` 상태에서 취소
- [ ] `currentPeople`이 음수로 가지 않음 ✅
- [ ] `Math.max(0, ...)` 보호 확인

---

### D. 모집 삭제

#### 10) 대청소
- [ ] `marketJoins` 전부 제거 확인
- [ ] 관련 알림 제거 확인
- [ ] 채팅방에 삭제 안내 메시지 확인

#### 11) 고아 링크
- [ ] 알림 클릭 시 404 발생하지 않음 ✅
- [ ] 삭제된 게시글 알림은 정리됨

---

### E. 보안

#### 12) 권한 우회
- [ ] 일반 유저가 승인 API 호출 → 거부
- [ ] `notifications` 직접 생성 → Security Rules 차단
- [ ] 작성자만 삭제 가능 확인

---

## 🧪 자동 테스트 시나리오

### 1) 레이스 테스트

#### 시나리오 A: 동시 신청
```
T1: 신청 (userId: A)
T2: 신청 (userId: A, 동시)
→ marketJoins 문서 1개만 생성
```

#### 시나리오 B: 동시 승인
```
T1: 승인 (joinId: 1)
T2: 승인 (joinId: 2, 동시)
→ currentPeople <= max 보장
```

---

### 2) 경계값 테스트

- [ ] `max = 1`, `currentPeople = 0` → 신청 가능
- [ ] `max = 1`, `currentPeople = 1` → 신청 불가
- [ ] `max = 2`, `currentPeople = 1` → 승인 시 자동 마감
- [ ] `currentPeople = 0` → 취소 시 0 유지

---

### 3) 장애 주입 테스트

- [ ] 승인 직후 네트워크 OFF → 서버 트리거로 완성
- [ ] 앱 강제 종료 → 서버 트리거로 완성
- [ ] 트리거 실패 시 재시도 메커니즘 확인

---

## 🛠 운영 로그 포인트

수집해야 할 로그:

- `APPLY` - 신청 생성
- `APPROVED` - 승인 완료
- `REJECTED` - 거절 완료
- `CANCELLED` - 취소 완료
- `POST_DELETED` - 게시글 삭제
- `ERROR` - 에러 발생

---

## 📦 배포 전 체크

- [ ] Security Rules 적용
- [ ] Firestore 인덱스 생성
- [ ] Cloud Functions 트리거 권한 확인
- [ ] 알림 UI 연결 확인
- [ ] 에러 메시지 통일
- [ ] 로깅 시스템 확인

---

## 🧠 릴리즈 기준

이 조건 만족하면 배포:

- [ ] 동시성 100회 테스트 통과
- [ ] `currentPeople` 정합 100%
- [ ] 고아 문서 0
- [ ] 알림 누락 0
- [ ] 트리거 실패율 < 1%

---

## 🔍 Firestore 인덱스 필요 목록

### marketJoins 컬렉션
```
- postId (오름차순) + status (오름차순)
- postId (오름차순) + userId (오름차순)
- postId (오름차순) + createdAt (내림차순)
```

### notifications 컬렉션
```
- userId (오름차순) + isRead (오름차순) + createdAt (내림차순)
- payload.postId (오름차순) + createdAt (내림차순)
- target.id (오름차순) + createdAt (내림차순)
```

### chatRooms 컬렉션
```
- productId (오름차순) + createdAt (내림차순)
- buyerId (오름차순) + sellerId (오름차순)
```

---

## 🚨 알려진 이슈 및 해결책

### 이슈 1: 중첩 필드 쿼리 제한
**문제**: `payload.postId` 쿼리 시 인덱스 필요  
**해결**: `target.id` 또는 전체 스캔 fallback 구현

### 이슈 2: 배치 삭제 500개 제한
**문제**: Firestore 배치 최대 500개  
**해결**: 재귀 호출로 나머지 처리

---

## 📊 모니터링 지표

### 필수 지표
- 트리거 실행 횟수
- 트리거 실패율
- 평균 실행 시간
- `currentPeople` 불일치 발생 횟수
- 알림 누락 횟수

### 알림 지표
- 알림 생성 성공률
- 알림 읽음률
- 알림 클릭률
