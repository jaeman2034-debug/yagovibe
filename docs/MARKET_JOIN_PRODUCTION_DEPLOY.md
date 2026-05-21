# 🔥 매칭 참여 시스템 실전 배포 가이드

## ✅ 완료된 작업

### 1. Cloud Function - 상태 변경 감지

**파일:** `functions/src/market/onMarketJoinStatusChanged.ts`

**기능:**
- `marketJoins/{joinId}` 문서 업데이트 감지
- 승인/거절 시 자동 알림 발송
- FCM + 인앱 이중 발송

**트리거:**
```typescript
marketJoins/{joinId} 문서 업데이트 시 자동 실행
```

---

### 2. 무결성 자동 보정 봇

**파일:** `functions/src/market/marketIntegrityBot.ts`

**기능:**
- 매일 새벽 4시 자동 실행
- `currentPeople ↔ approved 수` 불일치 감지
- 자동 보정 처리
- 보정 로그 기록

**스케줄:**
```
매일 새벽 4시 (Asia/Seoul)
```

---

## 배포 방법

### 1. Cloud Functions 배포

```bash
# Functions 배포
firebase deploy --only functions:onMarketJoinStatusChanged,functions:marketIntegrityBot
```

### 2. Firestore Rules 배포

```bash
# Rules 배포
firebase deploy --only firestore:rules
```

---

## 알림 흐름

### 승인 시

```
권한자 승인 클릭
  ↓
marketJoins/{joinId} 업데이트
  ↓
Cloud Function 트리거
  ↓
인앱 알림 저장 (notifications 컬렉션)
  ↓
FCM 푸시 알림 발송
  ↓
사용자 알림 수신
```

### 자동 거절 시 (FULL)

```
정원 초과 감지
  ↓
marketJoins/{joinId} status = "rejected"
  ↓
Cloud Function 트리거
  ↓
인앱 알림 저장
  ↓
FCM 푸시 알림 발송
```

---

## 무결성 보정 봇

### 실행 시간

- 매일 새벽 4시 (Asia/Seoul)
- 자동 실행

### 처리 내용

1. 모든 게시글 조회 (limit: 100)
2. 각 게시글의 `currentPeople`과 실제 `approved` 수 비교
3. 불일치 시 자동 보정
4. 보정 로그 기록 (`_marketIntegrityLogs` 컬렉션)

---

## 모니터링

### 알림 발송 로그

Cloud Functions 로그에서 확인:
```
🔥 [onMarketJoinStatusChanged] 상태 변경 감지
✅ [sendJoinApprovedNotification] 완료
```

### 무결성 보정 로그

Cloud Functions 로그에서 확인:
```
🔥 [marketIntegrityBot] 무결성 보정 시작
✅ [marketIntegrityBot] 보정 완료: { total, safe, fixed }
```

### 보정 히스토리

Firestore `_marketIntegrityLogs` 컬렉션에서 확인:
```
{
  timestamp: Timestamp,
  total: number,
  safe: number,
  fixed: number,
  errors: string[]
}
```

---

## 다음 단계

### 완료
- [x] Cloud Function 상태 변경 감지
- [x] FCM + 인앱 이중 발송
- [x] 무결성 자동 보정 봇

### 추후 구현 (선택)
- [ ] 관리자 대시보드
- [ ] 알림 설정 (알림 끄기)
- [ ] 알림 히스토리 조회

---

## ✅ 실전 배포 준비 완료

현재 시스템은:
- ✅ Cloud Function 자동 알림
- ✅ FCM 푸시 알림
- ✅ 인앱 알림 저장
- ✅ 무결성 자동 보정
- ✅ 보정 로그 기록

**실전 배포 가능 상태** 🚀
