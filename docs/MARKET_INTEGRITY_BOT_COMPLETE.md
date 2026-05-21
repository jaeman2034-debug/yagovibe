# 🔥 매칭 무결성 자동 보정 봇 완료 보고서

## ✅ 완료된 작업

### 1. 무결성 보정 봇 (v2)
**파일:** `functions/src/market/integrityBot.ts`

**기능:**
- 매일 새벽 4시 자동 실행 (Asia/Seoul)
- 최근 7일 게시글만 처리 (운영 최적화)
- `currentPeople ↔ approved 수` 불일치 감지
- 자동 보정 처리
- 보정 로그 기록

---

## 실행 스케줄

```
매일 새벽 4시 (Asia/Seoul)
```

---

## 처리 로직

### 1. 스캔 대상
- 최근 7일 내 업데이트된 게시글
- 최대 400개 (BATCH_LIMIT)

### 2. 무결성 체크
- 실제 `approved` 수 조회
- `currentPeople` 비교
- `status` 비교 (필드 있는 경우)
- `isFull` 비교 (필드 있는 경우)

### 3. 자동 보정
- 불일치 발견 시 자동 보정
- `correctedAt` 타임스탬프 기록
- `updatedAt` 업데이트

### 4. 로그 기록
- `_marketIntegrityLogs` 컬렉션에 저장
- 스캔 수, 보정 수, 보정 내역 기록

---

## 보정 대상 필드

### currentPeople
- 실제 `approved` 수로 자동 보정

### status (선택)
- `maxPeople > 0 && approvedCount >= maxPeople` → "full"
- 그 외 → "open"

### isFull (선택)
- `maxPeople > 0 && approvedCount >= maxPeople` → `true`
- 그 외 → `false`

---

## 로그 구조

### `_marketIntegrityLogs/{logId}`

```typescript
{
  type: "INTEGRITY_FIX",
  startedAt: Timestamp,
  finishedAt: Timestamp,
  scanned: number,
  fixedCount: number,
  fixes: FixResult[] // 최대 50개
}
```

### FixResult

```typescript
{
  postId: string,
  before: {
    currentPeople?: number,
    status?: string,
    maxPeople?: number
  },
  after: {
    currentPeople: number,
    status?: string,
    isFull?: boolean
  },
  approvedCount: number,
  fixedFields: string[]
}
```

---

## 배포 방법

### 1. Cloud Functions 배포

```bash
firebase deploy --only functions:nightlyIntegrityFix
```

### 2. 수동 실행 (테스트)

```bash
firebase functions:call nightlyIntegrityFix
```

---

## 모니터링

### Cloud Functions 로그

```
[IntegrityBot] 시작
[IntegrityBot] 스캔 대상: 150개 게시글
[IntegrityBot] 보정 완료: post_123
[IntegrityBot] 완료: { scanned: 150, fixedCount: 5 }
```

### Firestore 로그

`_marketIntegrityLogs` 컬렉션에서 확인:
- 스캔 수
- 보정 수
- 보정 내역

---

## 운영 최적화

### 현재 설정
- 최근 7일 게시글만 처리
- 최대 400개 배치 처리

### 확장 시 고려사항
- 게시글 수가 많아지면 페이지네이션 필요
- 특정 상태만 처리 (예: `status === "open"`)
- 시간대별 분산 처리

---

## 다음 단계

### 완료
- [x] 무결성 보정 봇 (v2)
- [x] 최근 7일 최적화
- [x] 보정 로그 기록

### 추후 구현 (선택)
- [ ] 심각 오류 시 운영자 알림
- [ ] 보정 히스토리 대시보드
- [ ] 실시간 무결성 모니터링

---

## ✅ 무결성 봇 완료

**운영 안정성 강화 완료** 🚀

---

## 다음 단계 제안

### C안 — 채팅 권한 가드 강화 (추천)
- 승인 안 된 유저 → 채팅 진입 차단
- 승인 안 된 유저 → 메시지 write 차단 (Rules)
- FULL 상태 → 참여 버튼 비활성 + 자동거절 뱃지

**"ㅇㅋ" = C로 바로 진행** 🚀
