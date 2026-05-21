# Chat System Architecture (채팅 시스템 아키텍처)

> **역할**: 개발자 온보딩·전체 개요 문서  
> **대상**: 신규 합류 개발자, 운영·기획 참고용

---

## Overview

YAGO VIBE 채팅은 **Firebase 기반 Production 수준 실시간 채팅**입니다.

### 구현된 기능

| 기능 | 설명 |
|------|------|
| Realtime messaging | Firestore `onSnapshot` 기반 실시간 수신 |
| Pagination | 최신 N개 구독 + 과거 커서 기반 30개씩 로드 |
| Optimistic UI | 전송 즉시 표시, `clientId`로 서버 응답 매칭 |
| Retry queue | 전송 실패 시 최대 3회 재시도 (지수 백오프) |
| Read receipts | `lastReadAt`, `unreadCount`, `readBy` |
| Typing indicators | 타이핑 TTL 기반 표시 |
| Push notifications | FCM, Cloud Functions `onMessageCreated` |
| Group chat | 거래 1:1 + 모집 단체방 (`type: trade \| recruit_group`) |
| Multi-device ready | `users/{uid}/devices` 토큰, 멀티 디바이스 푸시 |

### 성숙도 수준

**Production Chat Architecture — Level 8~9 / 11**

```
1  basic chat
2  realtime
3  pagination
4  optimistic send
5  retry queue
6  multi-device sync
7  group chat
8  push notifications        ← 현재
9  reactions / edit          ← 현재 일부
10 draft / pin / forward     ← 예정
11 search                    ← 최종 단계
```

---

## Feature Roadmap

### 현재 (Level 8~9)

- Realtime, pagination, optimistic UI, retry, read/typing, push, group chat

### 다음 단계 (Level 10) — 권장 추가 순서

| 순서 | 기능 | 설명 |
|------|------|------|
| 1 | Message edit / delete | 수정·삭제 + (선택) edit history |
| 2 | Reactions | 이모지 리액션 |
| 3 | Draft message | `users/{uid}/drafts/{roomId}` |
| 4 | Pinned message | `pinnedMessageId` |
| 5 | Forward message | `originalMessageId`, `originalRoomId` |
| 6 | Edit history | `editHistory[]` |
| 7 | Delivery status | sent / delivered / read 표시 |

### 확장 시 주요 필드 (참고)

| 기능 | 필드 예시 |
|------|-----------|
| Message Edit History | `editHistory`, `editedAt`, `editVersion` |
| Pinned Message | `pinnedMessageId` (room) |
| Forward | `originalMessageId`, `originalRoomId`, `type: "forward"` |
| Draft | `users/{uid}/drafts/{roomId}` → `{ text }` |
| Delivery Status | `lastReadMessageId` (member), `delivered`, `read` |

---

## Hardest Problem: Message Search

**난이도 TOP 1**: 메시지 전체 검색(Full-text search).

- Firestore만으로는 랭킹·하이라이트·필터가 어렵습니다.
- 권장: **Firestore → Cloud Functions → Search Engine**

| 검색엔진 | 특징 |
|----------|------|
| Algolia | SaaS, 가장 빠른 연동 |
| Meilisearch | 오픈소스, 빠름 |
| Elasticsearch | 대규모·자체 인프라 |

권장 구조: 메시지 생성 시 CF에서 검색엔진 인덱싱.

---

## Infrastructure (운영 인프라)

```
Client
  ↓
Firebase Auth
  ↓
Firestore (chat DB)
  ↓
Cloud Functions (push, search indexing)
  ↓
FCM (Push)
  ↓
Storage (images / files)
  ↓
Search Engine (Algolia / Meilisearch — 검색 도입 시)
```

| 역할 | 서비스 |
|------|--------|
| 인증 | Firebase Auth |
| 채팅 DB | Firestore |
| 서버 로직·푸시 | Cloud Functions |
| 푸시 전송 | FCM |
| 파일 | Firebase Storage |
| 검색 (예정) | Algolia / Meilisearch |

---

## 최종 평가

현재 설계는 **실서비스 운영 가능한 채팅 시스템** 수준입니다.

- Realtime  
- Scalable (windowed listen + pagination + virtual list)  
- Multi-device ready  
- Production ready  

다음 단계로 **CHAT_FIRESTORE_SCHEMA.md**에서 실제 컬렉션·필드 구조를 확인하면 됩니다.
