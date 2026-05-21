# 📡 API 스펙 문서 (완전판)

## Base URL
```
https://api.hub.com/v1
```

---

## 🔵 Story API

### GET /stories
스토리 목록 조회

**Query Parameters**
- `region` (string, optional): 지역 코드 (seoul, busan)
- `status` (string, optional): 상태 (PUBLISHED, DRAFT)
- `startAt` (string, optional): 시작일 (ISO)
- `endAt` (string, optional): 종료일 (ISO)

**Response**
```json
{
  "stories": [
    {
      "id": "story-123",
      "region": "seoul",
      "source": "운영",
      "category": "대회",
      "title": "이번 주 대회 일정",
      "subtitle": "지역 리그 경기 시간표",
      "status": "PUBLISHED",
      "startAt": "2025-02-03T00:00:00Z",
      "endAt": "2025-02-10T23:59:59Z",
      "priority": 90,
      "createdAt": "2025-02-01T00:00:00Z"
    }
  ],
  "mode": "season",
  "serverTime": "2025-02-03T12:00:00Z"
}
```

### POST /stories
스토리 생성

**Request Body**
```json
{
  "title": "이번 주 대회 일정",
  "subtitle": "지역 리그 경기 시간표",
  "category": "대회",
  "source": "운영",
  "startAt": "2025-02-03T00:00:00Z",
  "endAt": "2025-02-10T23:59:59Z",
  "priority": 90
}
```

**Response**
```json
{
  "id": "story-123",
  "createdAt": "2025-02-03T12:00:00Z"
}
```

### PATCH /stories/:id/priority
우선순위 수정

**Request Body**
```json
{
  "priority": 95
}
```

### PATCH /stories/:id/extend
기간 연장

**Request Body**
```json
{
  "days": 7
}
```

---

## 🔵 Ground API

### GET /grounds
구장 목록 조회

**Query Parameters**
- `region` (string, optional): 지역 코드

**Response**
```json
{
  "grounds": [
    {
      "id": "ground-123",
      "name": "노원 풋살장",
      "region": "seoul",
      "lat": 37.5665,
      "lng": 126.978,
      "address": "서울시 노원구",
      "priceFrom": 50000,
      "rating": 4.5
    }
  ]
}
```

### GET /grounds/:id/slots
슬롯 목록 조회

**Query Parameters**
- `date` (string, required): 날짜 (YYYY-MM-DD)

**Response**
```json
{
  "slots": [
    {
      "id": "slot-123",
      "start": "2025-02-03T18:00:00Z",
      "end": "2025-02-03T20:00:00Z",
      "price": 50000,
      "status": "OPEN"
    }
  ]
}
```

---

## 🔵 Reservation API

### POST /reservations
예약 생성

**Request Body**
```json
{
  "slotId": "slot-123",
  "groundId": "ground-123",
  "amount": 50000
}
```

**Response**
```json
{
  "id": "reservation-123",
  "status": "READY",
  "expiresAt": "2025-02-03T12:05:00Z"
}
```

---

## 🔵 Payment API

### POST /payments/request
결제 요청

**Request Body**
```json
{
  "reservationId": "reservation-123",
  "amount": 50000,
  "pg": "tosspay"
}
```

**Response**
```json
{
  "paymentId": "payment-123",
  "pgUrl": "https://pay.toss.com/...",
  "status": "REQUEST"
}
```

### POST /webhook/pay
PG 웹훅

**Headers**
- `X-Partner-Signature`: HMAC 서명
- `X-Partner-Timestamp`: 타임스탬프

**Request Body**
```json
{
  "transactionId": "txn-123",
  "amount": 50000,
  "status": "success",
  "metadata": {
    "reservationId": "reservation-123"
  }
}
```

---

## 🔵 Analytics API

### POST /analytics/events
이벤트 전송

**Request Body**
```json
{
  "events": [
    {
      "eventName": "story_impression",
      "at": "2025-02-03T12:00:00Z",
      "sessionId": "session-123",
      "userId": "user-123",
      "region": "seoul",
      "device": "m",
      "metadata": {
        "storyId": "story-123",
        "category": "대회",
        "source": "운영"
      }
    }
  ]
}
```

### GET /admin/dashboard/kpi
Daily KPI 조회

**Query Parameters**
- `date` (string, required): YYYY-MM-DD
- `region` (string, optional): 지역 코드

**Response**
```json
{
  "date": "2025-02-03",
  "region": "seoul",
  "story": {
    "imp": 12400,
    "click": 512,
    "ctr": 4.13
  },
  "booking": {
    "start": 96,
    "success": 41,
    "fail": 3,
    "cr": 42.7
  },
  "revenue": 1840000,
  "health": {
    "seedRate": 0.04,
    "offlineRate": 0.11,
    "apiError": 0,
    "storyFillRate": 1.0
  }
}
```

---

## 🔵 Team API

### GET /teams
팀 목록 조회

**Query Parameters**
- `region` (string, optional): 지역 코드
- `level` (string, optional): 레벨 (beginner, normal, pro)
- `recruitStatus` (string, optional): 모집 상태 (OPEN, CLOSE)

### POST /teams/:id/join
팀 가입 신청

**Request Body**
```json
{
  "message": "가입하고 싶습니다"
}
```

---

## 🔵 League API

### GET /leagues
리그 목록 조회

**Query Parameters**
- `region` (string, optional): 지역 코드
- `status` (string, optional): 상태 (READY, RUNNING, ENDED)

### POST /matches/:id/result
경기 결과 입력

**Request Body**
```json
{
  "homeScore": 3,
  "awayScore": 1
}
```

---

## 인증

모든 API는 JWT 토큰 인증을 사용합니다.

**Header**
```
Authorization: Bearer <token>
```

---

## 에러 응답

```json
{
  "error": {
    "code": "STORY_NOT_FOUND",
    "message": "스토리를 찾을 수 없습니다",
    "status": 404
  }
}
```
