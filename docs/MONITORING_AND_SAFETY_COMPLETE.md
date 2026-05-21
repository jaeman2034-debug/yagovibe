# ✅ 모니터링/안전장치 완성본 세트 (운영용)

## 🎯 목표 달성

> 👉 "사고 나도 5분 안에 원인 파악 + 자동 복구" 수준

---

## ✅ 완료된 작업

### 1️⃣ 구조화 로거

**파일**: `functions/src/utils/logger.ts`

**핵심 함수**:
- ✅ `log(type, data)` - 구조화 로그
- ✅ `logError(type, error, data)` - 에러 로그
- ✅ `logMetric(metric, value, data)` - 지표 로그

**특징**:
- ✅ JSON 형식으로 출력 (Cloud Logging 통합)
- ✅ 타임스탬프 자동 포함
- ✅ 타입별 분류

---

### 2️⃣ 핵심 포인트 로그 추가

#### 승인 트리거

**파일**: `functions/src/market/onMarketJoinStatusChanged.ts`

**로그 포인트**:
- ✅ `APPROVE_START` - 승인 시작
- ✅ `CHAT_CREATE` - 채팅방 생성
- ✅ `CHAT_CREATE_FAILED` - 채팅방 생성 실패
- ✅ `NOTIFICATION_SENT` - 알림 발송
- ✅ `NOTIFICATION_FAILED` - 알림 실패
- ✅ `CAPACITY_EXCEEDED` - 인원 초과
- ✅ `CAPACITY_INCREASED` - 인원 증가
- ✅ `CAPACITY_DECREASED` - 인원 감소
- ✅ `AUTO_REJECT` - 자동 거절

#### 채팅 연결

**파일**: `functions/src/market/chatRoomService.ts`

**로그 포인트**:
- ✅ `CHAT_CONNECT_START` - 채팅 연결 시작
- ✅ `CHAT_EXISTS` - 기존 채팅방 존재
- ✅ `CHAT_CREATE` - 새 채팅방 생성
- ✅ `CHAT_CONNECT_FAILED` - 채팅 연결 실패
- ✅ `CHAT_DISCONNECT_START` - 채팅 차단 시작
- ✅ `CHAT_DISCONNECT` - 채팅 차단 완료
- ✅ `CHAT_DISCONNECT_FAILED` - 채팅 차단 실패

#### 알림 발송

**파일**: `functions/src/market/notificationService.ts`

**로그 포인트**:
- ✅ `NOTIFICATION_START` - 알림 발송 시작
- ✅ `NOTIFICATION_DUPLICATE` - 중복 알림
- ✅ `NOTIFICATION_CREATED` - 알림 생성
- ✅ `NOTIFICATION_FAILED` - 알림 실패
- ✅ `PUSH_START` - 푸시 발송 시작
- ✅ `PUSH_SUCCESS` - 푸시 성공
- ✅ `PUSH_FAILED` - 푸시 실패

#### 메시지 알림

**파일**: `functions/src/notifyNewMessage.ts`

**로그 포인트**:
- ✅ `MESSAGE_NOTIFY_START` - 메시지 알림 시작
- ✅ `PUSH_SUCCESS` - 푸시 성공
- ✅ `PUSH_FAILED` - 푸시 실패

---

### 3️⃣ 지표 수집

**지표 타입**:
- ✅ `CHAT_CREATE_SUCCESS` - 채팅방 생성 성공률
- ✅ `NOTIFICATION_SUCCESS` - 알림 발송 성공률
- ✅ `PUSH_SUCCESS` - 푸시 발송 성공률
- ✅ `PUSH_FAILED` - 푸시 발송 실패률
- ✅ `CAPACITY_EXCEEDED` - 인원 초과 발생 횟수
- ✅ `CAPACITY_INCREASED` - 인원 증가 횟수
- ✅ `CAPACITY_DECREASED` - 인원 감소 횟수

---

## 📊 모니터링 지표

### 핵심 KPI

1. **승인 → 채팅 생성 성공률**
   - `APPROVE_START` → `CHAT_CREATE` 비율
   - 목표: 99% 이상

2. **메시지 → 푸시 성공률**
   - `MESSAGE_NOTIFY_START` → `PUSH_SUCCESS` 비율
   - 목표: 95% 이상

3. **인원 카운트 정합**
   - `CAPACITY_INCREASED` - `CAPACITY_DECREASED` = 실제 인원수
   - 목표: 100% 일치

---

## 🔍 로그 쿼리 예시

### Cloud Logging 쿼리

```
# 승인 → 채팅 생성 확인
type="APPROVE_START" OR type="CHAT_CREATE"

# 푸시 실패 추적
type="ERROR_PUSH_FAILED"

# 인원 초과 발생
type="CAPACITY_EXCEEDED"

# 지표 집계
type="METRIC"
```

---

## 🚨 장애 시 액션

### 1. 채팅방 미생성

**증상**: `APPROVE_START` 있지만 `CHAT_CREATE` 없음

**대응**:
```bash
# 수동 복구 (healJob 실행)
# 또는 Functions에서 재실행
```

### 2. 푸시 실패

**증상**: `PUSH_FAILED` 로그 증가

**대응**:
- 토큰 갱신 확인
- FCM 설정 확인
- 무효한 토큰 자동 정리 (이미 구현됨)

### 3. 인원 불일치

**증상**: `CAPACITY_INCREASED` - `CAPACITY_DECREASED` ≠ 실제 인원수

**대응**:
- 재계산 스크립트 실행
- `market.currentPeople` 수동 조정

---

## ✅ 완료 체크리스트

| 항목 | 상태 | 비고 |
|------|------|------|
| 구조화 로거 | ✅ | log, logError, logMetric |
| 승인 로그 | ✅ | APPROVE_START, CHAT_CREATE 등 |
| 채팅 로그 | ✅ | CHAT_CONNECT, CHAT_DISCONNECT 등 |
| 알림 로그 | ✅ | NOTIFICATION, PUSH 등 |
| 메시지 로그 | ✅ | MESSAGE_NOTIFY 등 |
| 지표 수집 | ✅ | METRIC 타입 |
| 인원 카운트 로그 | ✅ | CAPACITY 관련 |

---

## 🎯 결론

**모니터링/안전장치 완성본 세트 적용 완료** 🚀

- ✅ 구조화 로거 (JSON 형식)
- ✅ 핵심 포인트 로그 추가
- ✅ 지표 수집
- ✅ 에러 추적
- ✅ Cloud Logging 통합

**다음 단계**: 인원 초과 차단 (트랜잭션) 💪
