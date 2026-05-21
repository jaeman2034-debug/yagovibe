# Firestore Chat Schema (Production Version)

This document defines the production-level Firestore schema and operational patterns for the chat system.

It focuses on solving real-world issues such as:

- message ordering
- duplicate messages
- offline sending
- retry queue
- multi-device sync
- pagination stability

---

# Message ID Strategy

Each message must have a unique client-generated ID.

**Recommended:** UUID v4

**Example:** `msg_9f3a12b8`

**Why?**

- prevent duplicate messages
- support optimistic UI
- retry safety

---

# Message Ordering Strategy

Firestore ordering must rely on server timestamps.

**Message structure:**

```json
{
  "id": "msg_123",
  "senderId": "uid_1",
  "text": "안녕하세요",
  "createdAt": "serverTimestamp()",
  "clientTimestamp": 1710000000
}
```

**Ordering rule:** `orderBy("createdAt", "desc")`

**Why include clientTimestamp?** Fallback ordering before serverTimestamp resolves.

---

# Optimistic UI Sending

Client should render messages immediately.

**Flow:**

1. User sends message
2. Message appears in UI instantly
3. Message written to Firestore
4. serverTimestamp resolved

**Message state:** `sending → sent → delivered → read → failed`

**Example:**

```json
{
  "status": "sending"
}
```

---

# Retry Queue

Messages may fail due to network loss. Client maintains retry queue.

**Example structure:**

```javascript
localQueue = [
  {
    messageId: "msg_123",
    roomId: "room_1",
    retryCount: 1
  }
]
```

**Retry policy:** max retries = 5

---

# Duplicate Message Prevention

Duplicate sends can happen when retrying.

**Solution:** Use deterministic message ID.

- **Instead of:** Firestore auto ID
- **Use:** client-generated ID

**Write rule:** `set(messages/{messageId})` — **Not** `add()`

This ensures idempotency.

---

# Multi-Device Sync

User may be logged in on multiple devices.

Read receipts stored per member.

**Path:** `chatRooms/{roomId}/members/{uid}`

**Example:**

```json
{
  "lastReadMessageId": "msg_999"
}
```

Unread count can be calculated based on message ordering.

---

# Pagination Strategy

Use cursor-based pagination.

**Query example:**

```
messages
  .orderBy("createdAt", "desc")
  .limit(30)
```

**Next page:** `.startAfter(lastMessage)`

**Never use offset pagination.**

---

# Message Window Rendering

Client should not render all messages. Use windowed rendering.

**Example:** visible messages = 50. Older messages loaded on scroll.

**Benefits:**

- lower memory usage
- faster rendering

---

# Typing Indicator Strategy

Typing status stored with TTL.

**Example path:** `chatRooms/{roomId}/typing/{uid}`

**Example:**

```json
{
  "typing": true,
  "expiresAt": "timestamp"
}
```

Client clears indicator automatically when expired.

---

# Message Editing

**Edit fields:**

```json
{
  "editedAt": "timestamp",
  "editVersion": 2
}
```

**Optional history:**

```json
{
  "editHistory": [
    { "text": "old message", "editedAt": "timestamp" }
  ]
}
```

---

# Reactions

**Structure:**

```json
{
  "reactions": {
    "👍": ["uid1", "uid2"],
    "🔥": ["uid3"]
  }
}
```

**Alternative scalable structure:** subcollection `messages/{messageId}/reactions`

---

# Attachments

For images/files:

```json
{
  "type": "image",
  "fileUrl": "...",
  "thumbnailUrl": "...",
  "size": 204800
}
```

Files stored in **Firebase Storage**.

---

# Push Notifications

Push sent via Cloud Functions.

**Trigger:** `onCreate(messages)`

**Example flow:**

```
Firestore message created
  ↓
Cloud Function triggered
  ↓
send FCM notification
```

---

# Search Architecture

Firestore cannot handle full-text search.

**Recommended architecture:**

```
Firestore
  ↓
Cloud Functions
  ↓
Search Index
```

**Search engines:** Algolia, Meilisearch, ElasticSearch

**Index fields:** message text, sender, roomId, timestamp

---

# Production Scaling Considerations

**Recommended limits:**

| Item | Value |
|------|-------|
| messages per room page | 30 |
| render window | 50 |
| typing TTL | 5s |

**Firestore best practices:**

- avoid large documents
- prefer subcollections
- avoid fan-out writes

---

# System Maturity Level

**Current system:** Production Chat Architecture

**Level:** 9 / 11

**Next upgrades (Level 10):**

- Draft
- Pin
- Forward

**Final level (Level 11):**

- Full-text message search
