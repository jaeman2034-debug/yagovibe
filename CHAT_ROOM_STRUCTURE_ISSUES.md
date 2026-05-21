# 🔴 채팅방 구조 문제점 진단 (서비스 관점)

## ✅ 잘 된 부분

1. **방 ID 구조**: 명확히 분리됨
   - Trade: `trade_${productId}_${sortedUserIds}`
   - Recruit: `recruit_${postId}`

2. **타입 필드**: `type: "trade" | "recruit_group"` 명확히 구분

3. **UI 분기**: `isTrade`, `isRecruitGroup`로 명확히 분기

4. **채팅 목록 쿼리**: `participants` 기반으로 잘 되어 있음

5. **roles 구조**: 
   - Trade: `seller` / `buyer`
   - Recruit: `host` / `member` / `admin`

---

## 🔴 발견된 문제점

### 1️⃣ **Recruit 방 생성 로직이 분산되어 있음** (치명적)

**현재 상태:**
- `marketJoinService.ts` (클라이언트): 승인 시 생성
- `functions/src/market/chatRoomService.ts` (서버): 별도 생성 로직
- `ChatPage.tsx` (클라이언트): 응급 패치로 생성

**문제:**
- 생성 책임이 불명확함
- 중복 생성 가능성
- 일관성 부족

**해결 방향:**
- **서버(Cloud Function)에서만 생성** (권장)
- 또는 클라이언트에서만 생성하되, 중복 방지 로직 강화

---

### 2️⃣ **Recruit 방에 postSnapshot이 없음** (중요)

**현재 상태:**
- Trade: `productSnapshot` 있음 (상품 삭제되어도 표시 가능)
- Recruit: `postSnapshot` 없음 (모집글 삭제되면 정보 손실)

**문제:**
- 모집글이 삭제되면 채팅방에서 모집글 정보를 표시할 수 없음
- Trade와 대칭성 부족

**해결 방향:**
- Recruit 방 생성 시 `postSnapshot` 추가:
  ```typescript
  postSnapshot: {
    postId: string;
    title: string;
    category: string;
    maxPeople: number;
    currentPeople: number;
    status: "OPEN" | "CLOSED";
  }
  ```

---

### 3️⃣ **메시지 타입 분기가 명확하지 않음** (중요)

**현재 상태:**
- Trade: 협상 메시지 (가격 제안, 거래 확정 등)
- Recruit: 운영 메시지 (공지, 일정 안내 등)
- 하지만 system 메시지 타입이 여러 곳에서 다르게 정의됨

**문제:**
- Trade의 system 메시지: "거래 완료", "예약됨" 등
- Recruit의 system 메시지: "새 멤버 입장", "모집 마감" 등
- 성격이 다름에도 통합되어 있음

**해결 방향:**
- 메시지 타입을 명확히 분리:
  ```typescript
  // Trade 전용
  type: "system_trade_reserved" | "system_trade_completed"
  
  // Recruit 전용
  type: "system_recruit_member_joined" | "system_recruit_closed"
  ```

---

### 4️⃣ **알림 구조가 통합되어 있음** (중요)

**현재 상태:**
- `CHAT_MESSAGE`로 통합
- Trade와 Recruit의 알림 성격이 다름

**문제:**
- Trade: 1:1 협상 알림 (개인적)
- Recruit: 그룹 운영 알림 (공개적)
- 알림 템플릿/우선순위가 다를 수 있음

**해결 방향:**
- 알림 타입 분리 (선택사항):
  ```typescript
  "CHAT_MESSAGE_TRADE" // 거래 협상 알림
  "CHAT_MESSAGE_RECRUIT" // 모집 운영 알림
  ```
- 또는 현재 구조 유지하되, 알림 내용에서 타입 구분

---

### 5️⃣ **방 생성 트리거가 불명확함** (중요)

**현재 상태:**
- Trade: 상품 상세 → "채팅하기" 클릭 시 생성
- Recruit: 승인 시 생성 (서버/클라이언트 혼재)

**문제:**
- Recruit 방 생성 시점이 불명확
- 승인 전에 채팅방이 필요한 경우 대응 불가

**해결 방향:**
- Recruit 방 생성 시점 명확화:
  - 옵션 A: 승인 시 생성 (현재)
  - 옵션 B: 참여 신청 시 생성 (대기 상태로)
  - 옵션 C: 모집글 작성 시 생성 (호스트만)

---

### 6️⃣ **권한 구조가 Recruit에만 있음** (설계 일관성)

**현재 상태:**
- Trade: 권한 없음 (1:1이므로)
- Recruit: `host` / `admin` / `member` 권한 있음

**문제:**
- Trade에서도 특정 액션(예: 거래 완료 표시)에 권한이 필요할 수 있음
- 하지만 현재는 seller/buyer 역할만 있음

**해결 방향:**
- 현재 구조 유지 (Trade는 권한 불필요)
- 단, 향후 확장 시 고려

---

### 7️⃣ **방 삭제/종료 로직이 불명확함** (중요)

**현재 상태:**
- Trade: `productSnapshot.status === "DELETED"` 또는 `"SOLD"`로 판단
- Recruit: `status === "closed"` 또는 `recruitStatus === "CLOSED"`로 판단

**문제:**
- 삭제/종료 판단 로직이 분산되어 있음
- `isDeletedRoom` 계산이 복잡함

**해결 방향:**
- 방 상태 필드 통일:
  ```typescript
  status: "active" | "closed" | "deleted"
  ```
- Trade와 Recruit 모두 동일한 필드 사용

---

## 🎯 우선순위별 해결 방안

### 🔴 P0 (즉시 수정)

1. **Recruit 방 생성 로직 통합**
   - 서버(Cloud Function)에서만 생성하도록 통일
   - 클라이언트 응급 패치 제거

2. **postSnapshot 추가**
   - Recruit 방 생성 시 모집글 스냅샷 저장

### 🟡 P1 (중요)

3. **방 상태 필드 통일**
   - `status` 필드로 통일 (Trade/Recruit 공통)

4. **메시지 타입 분리**
   - Trade/Recruit 전용 system 메시지 타입 명확화

### 🟢 P2 (향후 개선)

5. **알림 구조 분리** (선택사항)
6. **권한 구조 확장** (선택사항)

---

## 📋 체크리스트

- [ ] Recruit 방 생성 로직 통합 (서버로)
- [ ] postSnapshot 추가
- [ ] 방 상태 필드 통일
- [ ] 메시지 타입 분리
- [ ] 알림 구조 검토 (선택사항)
