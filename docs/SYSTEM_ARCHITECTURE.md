# YAGO VIBE 플랫폼 시스템 아키텍처

> 개발팀/CTO 기준 · 전체 시스템 개요 및 문서 인덱스

---

## 1. 전체 시스템 구조

```
Yago Vibe App (Client)
        │
        ▼
Firebase Authentication
        │
        ▼
Firestore Database
        │
        ▼
Cloud Functions (Backend Logic)
        │
 ┌──────────────┬──────────────┬──────────────┐
 ▼              ▼              ▼
Team System    Chat System    Market System
 ▼              ▼              ▼
Events         Messaging      Post / Join
Notices        Notifications  Activity Score
Attendance
```

---

## 2. 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React + Vite + TypeScript |
| Backend | Firebase Cloud Functions |
| Database | Firestore |
| Auth | Firebase Auth |
| Storage | Firebase Storage |
| Messaging | FCM (Firebase Cloud Messaging) |
| Dev | Cursor, Firebase Emulator |

---

## 3. 핵심 문서 인덱스

| 문서 | 설명 |
|------|------|
| [YAGO_PLATFORM_ARCHITECTURE.md](./YAGO_PLATFORM_ARCHITECTURE.md) | **플랫폼 전체 아키텍처 (CTO용)** |
| [FIRESTORE_SCHEMA.md](./FIRESTORE_SCHEMA.md) | Firestore 전체 스키마 |
| [CLOUD_FUNCTIONS_EVENTS.md](./CLOUD_FUNCTIONS_EVENTS.md) | Cloud Functions 이벤트 흐름 |
| [CHAT_SYSTEM_DESIGN.md](./CHAT_SYSTEM_DESIGN.md) | 채팅 시스템 설계 |
| [YAGO_FIRESTORE_RULES.md](./YAGO_FIRESTORE_RULES.md) | Firestore Security Rules 설계 |
| [FIRESTORE_SECURITY_RULES.md](./FIRESTORE_SECURITY_RULES.md) | 보안 규칙 (레거시) |
| [FIRESTORE_INDEXES.md](./FIRESTORE_INDEXES.md) | Firestore 인덱스 |

---

## 4. 도메인 요약

| 도메인 | 주요 컬렉션 | 주요 Functions |
|--------|-------------|----------------|
| Team | teams, teams/.../members, events, notices | onTeamCreated, onEventCreated, onEventAttendScore, onNoticeScore |
| Chat | chatRooms, messages | onChatRoomCreated, onMessageCreated, syncTeamChatMembers |
| Market | market, marketJoins | onMarketPostCreated, onMarketPostUpdated, onMarketJoinStatusChanged |
| Activity | activities | (다른 Functions에서 activities 작성) |

---

## 5. 현재 프로젝트 상태

| 항목 | 상태 |
|------|------|
| Firebase Auth | ✔ |
| Firestore | ✔ |
| Cloud Functions | ✔ |
| Emulator 테스트 | ✔ |
| 트리거 검증 | ✔ |

---

## 6. 다음 단계

1. Firestore Security Rules 강화
2. Push Notification 테스트
3. Chat 부하 테스트
4. Production Deploy

---

*서비스 운영 전 CTO/Tech Lead 검토용 문서*
