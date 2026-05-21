# 🔥 대회 생성 → 시스템 공지 자동 생성 (실행 스펙)

## 📋 개요

대회 게시 시 자동으로 생성되는 시스템 공지의 실제 구현 스펙입니다.

---

## 1️⃣ 트리거 조건 (엄격)

### ✅ 생성 조건

```
✅ adminStatus: "published"
✅ isOfficial: true
✅ systemNoticeCreated: false (최초 1회만)
```

### ❌ 생성되지 않는 경우

- 임시 저장 (`adminStatus: "draft"`)
- 수정 저장 (`adminStatus` 변경 없음)
- 공식 기준 대회 아님 (`isOfficial: false`)
- 이미 생성됨 (`systemNoticeCreated: true`)

---

## 2️⃣ 트리거 시점

### Case 1: 생성 시 이미 published

**트리거**: `onDocumentCreated`

**조건**: 대회 생성 시 `adminStatus: "published"`로 저장됨

**실행 로직**:
```typescript
onTournamentCreated:
  if (tournament.adminStatus !== "published") return;
  if (!tournament.isOfficial) return;
  if (tournament.systemNoticeCreated === true) return;
  
  createSystemNotice();
  markSystemNoticeCreated();
```

### Case 2: draft → published 변경

**트리거**: `onDocumentUpdated`

**조건**: `adminStatus`가 `"draft"` → `"published"`로 변경됨

**실행 로직**:
```typescript
onTournamentUpdated:
  if (before.adminStatus === "published") return; // 이미 published였음
  if (after.adminStatus !== "published") return;  // published가 아님
  
  if (!after.isOfficial) return;
  if (after.systemNoticeCreated === true) return;
  
  createSystemNotice();
  markSystemNoticeCreated();
```

---

## 3️⃣ 시스템 공지 타입 정의

### Notice Type

```typescript
type: "SYSTEM"  // 운영 공지와 영구 분리
```

### Event Type

```typescript
event: "TOURNAMENT_CREATED"  // 이벤트 타입 명시
```

### 구분 기준

| 속성 | 운영 공지 | 시스템 공지 |
|------|----------|------------|
| `type` | `"OPERATIONAL"` 또는 없음 | `"SYSTEM"` |
| `event` | 없음 | `"TOURNAMENT_CREATED"` 등 |
| `immutable` | `false` | `true` |
| `createdBy` | 사용자 UID | `"SYSTEM"` |

---

## 4️⃣ 시스템 공지 JSON 스키마 (실전)

### 실제 저장 구조

```json
{
  "id": "auto-generated-doc-id",
  "associationId": "assoc-nowon-football",
  
  "type": "SYSTEM",
  "event": "TOURNAMENT_CREATED",
  
  "title": "[대회 생성] 노원구 구청장기 축구대회",
  "summary": "노원구 구청장기 축구대회가 공식 생성되었습니다.",
  
  "content": {
    "tournamentId": "tournament_2026_001",
    "tournamentName": "노원구 구청장기 축구대회",
    "tournamentPeriod": {
      "start": "2026-03-15",
      "end": "2026-03-22"
    },
    "applyPeriod": {
      "start": "2026-01-15",
      "end": "2026-02-15"
    },
    "status": "APPLY_UPCOMING"
  },
  
  "contentMarkdown": "마크다운 형식 본문...",
  
  "official": true,
  "createdBy": "SYSTEM",
  "createdAt": "2026-01-04T09:00:00+09:00",
  "immutable": true,
  
  "linkedResource": {
    "type": "TOURNAMENT",
    "id": "tournament_2026_001",
    "url": "/association/assoc-nowon-football/tournaments/tournament_2026_001"
  },
  
  "visibility": "PUBLIC",
  "visibleFrom": "Timestamp",
  "visibleUntil": "Timestamp | null",
  
  "status": "published",
  "publishAt": "Timestamp",
  "publishedAt": "Timestamp",
  "isVisible": true,
  "isPinned": false,
  "label": "대회",
  "level": "normal",
  "isOfficial": true,
  "isSystemGenerated": true,
  "systemEventType": "TOURNAMENT_CREATED",
  "relatedTournamentId": "tournament_2026_001",
  "viewCount": 0,
  "clickCount": 0,
  "updatedAt": "Timestamp"
}
```

### 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `type` | `"SYSTEM"` | 시스템 공지 타입 |
| `event` | `"TOURNAMENT_CREATED"` | 이벤트 타입 |
| `content` | `object` | 구조화된 콘텐츠 (JSON) |
| `contentMarkdown` | `string` | 마크다운 본문 (하위 호환성) |
| `immutable` | `boolean` | 수정 불가 플래그 |
| `linkedResource` | `object` | 연결된 리소스 (대회) |
| `createdBy` | `"SYSTEM"` | 시스템 생성 표시 |

---

## 5️⃣ 생성 로직 (의사 코드)

```typescript
function createSystemNotice(tournament) {
  // 트리거 조건 체크
  if (tournament.adminStatus !== "published") return;
  if (!tournament.isOfficial) return;
  if (tournament.systemNoticeCreated === true) return;
  
  // 시스템 공지 생성
  const noticeDoc = await noticesRef.add({
    type: "SYSTEM",
    event: "TOURNAMENT_CREATED",
    title: `[대회 생성] ${tournament.title}`,
    content: {
      tournamentId: tournament.id,
      tournamentName: tournament.title,
      tournamentPeriod: {...},
      applyPeriod: {...},
      status: "...",
    },
    immutable: true,
    linkedResource: {
      type: "TOURNAMENT",
      id: tournament.id,
      url: `...`,
    },
    createdBy: "SYSTEM",
    ...
  });
  
  // 중복 방지 플래그 설정
  await tournamentRef.update({
    systemNoticeCreated: true,
    systemNoticeId: noticeDoc.id,
    systemNoticeCreatedAt: now,
  });
}
```

---

## 6️⃣ 중복 생성 방지

### 플래그 설정

대회 문서에 다음 필드 추가:
- `systemNoticeCreated: boolean` (시스템 공지 생성 여부)
- `systemNoticeId: string` (생성된 공지 ID)
- `systemNoticeCreatedAt: Timestamp` (생성 시각)

### 체크 로직

```typescript
// 트리거 실행 전
if (tournament.systemNoticeCreated === true) {
  logger.info("⏭️ 이미 시스템 공지가 생성됨");
  return;
}

// 공지 생성 후
await tournamentRef.update({
  systemNoticeCreated: true,
  systemNoticeId: noticeDoc.id,
  systemNoticeCreatedAt: now,
});
```

---

## 7️⃣ UI에서 표시 방법

### 공지 리스트

```
📜 공지 리스트
├─ ⚙️ SYSTEM 뱃지
├─ 수정 / 삭제 버튼 ❌
└─ [🏆 대회 바로가기] CTA ⭕
```

### 정렬

- 최신순 (생성일 기준 내림차순)

### 필터

- 전체 공지
- 운영 공지 (`type !== "SYSTEM"`)
- 시스템 공지 (`type === "SYSTEM"`)

---

## 8️⃣ 감사·구청 대응 포인트

### 증명 가능한 항목

1. **대회 생성 시점**
   - `content.createdAt` 필드로 확인

2. **사전 공지 여부**
   - `visibleFrom` 필드로 확인

3. **임의 생성 아님**
   - `createdBy: "SYSTEM"` 확인
   - `systemEventType: "TOURNAMENT_CREATED"` 확인

4. **사후 수정 불가**
   - `immutable: true` 확인
   - 수정 버튼 UI에서 숨김 처리

### 문서 요청 대응

이 시스템 공지 PDF 하나면 끝:
- 생성 시각
- 대회 정보 요약
- 시스템 자동 생성 증명
- 수정 불가 증명

---

## 9️⃣ 배포 및 테스트

### 배포 명령

```bash
firebase deploy --only functions:onTournamentCreated,functions:onTournamentUpdated
```

### 테스트 체크리스트

- [ ] 대회 생성 시 `adminStatus: "published"`로 저장 → 시스템 공지 생성
- [ ] 대회 생성 시 `adminStatus: "draft"`로 저장 → 시스템 공지 생성 안 됨
- [ ] `draft` → `published` 변경 → 시스템 공지 생성
- [ ] `isOfficial: false` → 시스템 공지 생성 안 됨
- [ ] `systemNoticeCreated: true` → 중복 생성 안 됨
- [ ] NoticeSection에 시스템 공지 표시
- [ ] 시스템 공지 뱃지 (⚙️) 표시
- [ ] [🏆 대회 바로가기] 버튼 동작

---

**이 스펙을 기준으로 실제 구현을 진행합니다.**

