# 🔥 매칭 참여 시스템 운영 가이드 (운영급)

## ✅ 현재 구조 (운영 레벨)

### 데이터 흐름

```
참여 신청 생성 (pending)
  → marketJoins/{postId}_{userId} 생성
  → market/{postId}.currentPeople +1

승인 (approved)
  → marketJoins/{postId}_{userId}.status = "approved"
  → market/{postId}.currentPeople 유지 (이미 증가했으므로)
  → 최대 인원 초과 방어 (트랜잭션 내부에서 재확인)

거절 (rejected)
  → marketJoins/{postId}_{userId}.status = "rejected"
  → market/{postId}.currentPeople -1

취소 (delete)
  → marketJoins/{postId}_{userId} 삭제
  → market/{postId}.currentPeople -1
```

---

## 🔒 트랜잭션 보장 사항

### 1. 동시 승인 레이스 컨디션 방지

**문제:**
- 여러 권한자가 동시에 승인 버튼 클릭
- 최대 인원 초과 가능성

**해결:**
```typescript
// 트랜잭션 내부에서 최신 상태 확인
const post = await transaction.get(postRef);
if (post.currentPeople >= post.maxPeople) {
  throw new Error("모집 인원이 이미 마감되었습니다.");
}
```

**보장:**
- 원자적 연산: 승인과 인원수 확인이 함께 처리
- 동시 승인 시 하나만 성공, 나머지는 실패

---

### 2. 중복 처리 방지

**문제:**
- 같은 참여 신청을 여러 번 승인/거절 시도

**해결:**
```typescript
// 트랜잭션 내부에서 상태 재확인
if (currentStatus !== "pending") {
  throw new Error("이미 처리된 참여 신청입니다.");
}
```

**보장:**
- pending 상태만 승인/거절 가능
- 이미 처리된 신청은 차단

---

### 3. 인원수 정합성 보장

**문제:**
- currentPeople과 실제 approved 상태 참여자 수 불일치

**해결:**
```typescript
// 참여 신청 생성 시: +1
// 승인 시: 유지 (이미 증가했으므로)
// 거절 시: -1
// 취소 시: -1
```

**보장:**
- 모든 상태 변경이 트랜잭션으로 처리
- 인원수는 항상 정확

---

## 🧪 테스트 시나리오

### 시나리오 1: 동시 승인 테스트

**준비:**
- 게시글: `maxPeople = 2`
- 참여 신청: 3명 (pending)

**테스트:**
1. 브라우저 2개 열기
2. 권한자 계정으로 동시에 승인 버튼 클릭
3. 확인:
   - 2명만 승인 성공
   - 1명은 "모집 인원이 이미 마감되었습니다." 에러

**예상 결과:**
```
승인 1: 성공 (currentPeople = 1)
승인 2: 성공 (currentPeople = 2)
승인 3: 실패 (currentPeople = 2, maxPeople = 2)
```

---

### 시나리오 2: 취소 테스트

**준비:**
- 참여 신청: approved 상태
- currentPeople: 1

**테스트:**
1. 일반 사용자가 "취소" 버튼 클릭
2. 확인:
   - marketJoins 문서 삭제
   - currentPeople = 0

**예상 결과:**
```
취소 전: currentPeople = 1
취소 후: currentPeople = 0
```

---

### 시나리오 3: 거절 후 재신청

**준비:**
- 참여 신청: rejected 상태

**테스트:**
1. 일반 사용자가 "다시 참여하기" 버튼 클릭
2. 확인:
   - 새로운 pending 신청 생성
   - currentPeople +1

**예상 결과:**
```
거절 상태: status = "rejected"
재신청: status = "pending" (새 문서 또는 기존 문서 업데이트)
```

---

## 🔐 Firestore Rules 보안

### marketJoins 규칙

```javascript
// 생성: 본인만 (userId 검증)
allow create: if request.auth.uid == request.resource.data.userId

// 수정: 작성자만 (postAuthorId 검증)
allow update: if request.auth.uid == resource.data.postAuthorId

// 삭제: 본인만 (userId 검증)
allow delete: if request.auth.uid == resource.data.userId
```

**보장:**
- 사용자는 본인 신청만 생성/삭제 가능
- 작성자는 본인 게시글의 신청만 승인/거절 가능

---

## 📊 모니터링 포인트

### 1. 인원수 불일치 감지

**체크:**
```typescript
// approved 상태 참여 신청 개수
const approvedCount = await getDocs(
  query(
    collection(db, "marketJoins"),
    where("postId", "==", postId),
    where("status", "==", "approved")
  )
).then(snap => snap.size);

// currentPeople과 비교
if (approvedCount !== post.currentPeople) {
  console.warn("인원수 불일치 감지:", {
    approvedCount,
    currentPeople: post.currentPeople,
  });
}
```

---

### 2. 트랜잭션 실패 모니터링

**체크:**
```typescript
// 콘솔 로그 확인
❌ [updateJoinStatus] 트랜잭션 실패: {
  joinId,
  status,
  error: error.message,
  code: error.code,
}
```

**일반적인 실패 원인:**
- 동시 승인 시도 (정상 동작)
- 네트워크 지연
- 최대 인원 초과

---

## 🚀 운영 체크리스트

### 배포 전 확인

- [ ] 트랜잭션 로직 테스트 완료
- [ ] 동시 승인 테스트 완료
- [ ] 취소 로직 테스트 완료
- [ ] Firestore Rules 배포 완료
- [ ] 에러 핸들링 확인

### 배포 후 모니터링

- [ ] 인원수 불일치 감지 로그 확인
- [ ] 트랜잭션 실패율 모니터링
- [ ] 사용자 에러 리포트 확인

---

## 🔧 문제 해결 가이드

### 인원수 불일치 발생 시

1. **원인 확인:**
   - 트랜잭션 실패 로그 확인
   - 수동 승인/거절 이력 확인

2. **수동 동기화:**
   ```typescript
   // approved 상태 참여 신청 개수 계산
   const approvedCount = await getApprovedCount(postId);
   
   // currentPeople 업데이트
   await updateDoc(doc(db, "market", postId), {
     currentPeople: approvedCount,
   });
   ```

---

## 📝 다음 단계

1. **채팅 권한 모델 분리** (P1)
   - 승인된 사용자만 채팅 가능
   - 거절/취소 시 채팅 권한 제거

2. **실시간 UI 보강** (P1)
   - 승인 즉시 toast 알림
   - 거절 시 재신청 버튼 표시

3. **통계 대시보드** (P2)
   - 참여 신청 통계
   - 승인/거절 비율
