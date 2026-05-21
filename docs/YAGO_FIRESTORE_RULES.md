# YAGO VIBE Firestore Security Rules 설계 문서

> 실제 서비스 보안의 핵심 문서 · Rules + 권한 정책 정리

---

## 1. 개요

| 항목 | 설명 |
|------|------|
| rules_version | 2 |
| 파일 | `firestore.rules` |
| 원칙 | 인증 필수, 작성자/멤버 기반 접근 제어 |

---

## 2. 헬퍼 함수

| 함수 | 용도 |
|------|------|
| `isAuthenticated()` | `request.auth != null` |
| `isAuthor(authorId)` | 현재 사용자 == 문서 작성자 |
| `isTeamOwner(teamId)` | teams/{id}.ownerUid == request.auth.uid |
| `isTeamMember(teamId)` | teams/{id}/members/{uid} 존재 |
| `isTeamAdmin(teamId)` | members.role in ['owner', 'admin'] |
| `isChatRoomMember(roomId)` | chatRooms.members 또는 participants 포함 |

---

## 3. 컬렉션별 규칙 요약

### 3.1 users

| 작업 | 조건 |
|------|------|
| read | 인증된 사용자 전체 |
| create | 본인 문서만 (userId == uid) |
| update, delete | 본인만 |
| users/{uid}/devices | 본인만 read/write |
| users/{uid}/drafts | 본인만 read/write |

### 3.2 chatRooms

| 작업 | 조건 |
|------|------|
| read | 인증 + 채팅방 멤버 |
| create | 인증된 사용자 |
| update | 인증 + 멤버 |
| delete | false (삭제 불가) |

**messages 서브컬렉션**

| 작업 | 조건 |
|------|------|
| create | 멤버 + senderId == uid |
| update | 멤버 + (작성자 또는 readBy/reactions만 변경) |
| delete | 멤버 + 작성자만 |

### 3.3 teams

| 작업 | 조건 |
|------|------|
| read | 인증된 사용자 전체 (공개) |
| create | 인증 + ownerUid == uid + name, region 필수 |
| update | 팀 소유자만 (ownerUid 변경 불가) |
| delete | 팀 소유자만 |

**members 서브컬렉션**

| 작업 | 조건 |
|------|------|
| read | 팀 멤버만 |
| create | 팀 소유자 또는 본인(초대 가입) |
| update | 팀 관리자 (owner 역할 변경 제한) |
| delete | 팀 관리자 또는 본인(탈퇴) |

### 3.4 teams/{id}/events, teams/{id}/notices (권장 추가)

> ⚠️ **현재 firestore.rules에 명시적 규칙 없음**  
> 부모 teams 규칙이 서브컬렉션에 자동 적용되지 않으므로, 별도 match 블록 추가 권장.

**권장 규칙 (events)**

```
match /teams/{teamId}/events/{eventId} {
  allow read: if isTeamMember(teamId);
  allow create: if isTeamMember(teamId);
  allow update, delete: if isTeamMember(teamId) && 
    (resource.data.createdBy == request.auth.uid || isTeamAdmin(teamId));
}
```

**권장 규칙 (notices)**

```
match /teams/{teamId}/notices/{noticeId} {
  allow read: if isTeamMember(teamId);
  allow create: if isTeamMember(teamId);
  allow update, delete: if isTeamMember(teamId) && 
    (resource.data.authorId == request.auth.uid || isTeamAdmin(teamId));
}
```

### 3.5 sessions (Activity Session)

| 작업 | 조건 |
|------|------|
| read | 인증된 사용자 |
| create | 인증 + uid == request.auth.uid |
| update, delete | 세션 소유자(uid)만 |

### 3.6 activityFeed (활동 검색 캐시)

| 작업 | 조건 |
|------|------|
| read | 인증된 사용자 |
| create | 인증 + uid == request.auth.uid |
| update, delete | 소유자만 |

### 3.7 activityHistory (운동 기록)

| 작업 | 조건 |
|------|------|
| read | 인증된 사용자 |
| create | 인증 + uid == request.auth.uid |
| update, delete | 소유자만 |

### 3.8 activities

| 작업 | 조건 |
|------|------|
| read | 인증 + (visibility=='public' 또는 authorId==uid 또는 (visibility=='team' && 팀 멤버)) |
| create | 인증된 사용자 |
| update, delete | 작성자만 |

### 3.9 market

| 작업 | 조건 |
|------|------|
| read | 인증된 사용자 전체 (공개) |
| create | 인증 + authorId == uid + sport 필수 |
| update, delete | 작성자만 (authorId 변경 불가) |

### 3.10 marketJoins

| 작업 | 조건 |
|------|------|
| read | 인증된 사용자 |
| create | 인증 + userId == uid |
| update, delete | 인증된 사용자 (참여자 또는 글 작성자 검증은 앱에서) |

> ⚠️ update 조건이 `isAuthenticated()`만 있음. 실제 운영 시 참여자/작성자만 수정 가능하도록 강화 권장.

### 3.11 notifications

| 작업 | 조건 |
|------|------|
| read | 본인만 (userId == uid) |
| create | 인증된 사용자 |
| update, delete | 본인만 (userId 변경 불가) |

### 3.9 recruits, matches, guest_players

| 작업 | 조건 |
|------|------|
| read | 인증된 사용자 (공개) |
| create | 인증 + authorId == uid + 필수 필드 검증 |
| update, delete | 작성자만 |

### 3.13 team_join_requests

| 작업 | 조건 |
|------|------|
| read | 신청자 또는 팀 관리자 |
| create | 인증 + userId == uid + teamId, status |
| update, delete | 신청자 또는 팀 관리자 |

### 3.14 inviteLinks

| 작업 | 조건 |
|------|------|
| read, write | 팀 관리자만 |

---

## 4. 잠재적 보안 이슈 및 권장사항

### 4.1 누락된 서브컬렉션 규칙

- `teams/{teamId}/events/{eventId}`: 명시적 규칙 추가 권장
- `teams/{teamId}/notices/{noticeId}`: 명시적 규칙 추가 권장
- `teams/{teamId}/attendance/{date}`: 명시적 규칙 추가 권장

### 4.2 완화된 규칙

- `marketJoins`: update/delete가 `isAuthenticated()`만 체크. 참여자/작성자만 허용하도록 강화 권장
- `team_members`: create/update/delete가 `isAuthenticated()`만 체크. 팀 권한 검증 강화 권장

### 4.3 Cloud Functions 쓰기

Cloud Functions는 Admin SDK 사용 시 Firestore Rules를 우회합니다.  
서버 로직에서 authorId, teamId 등 검증을 반드시 수행해야 합니다.

---

## 5. Rules 배포

```bash
firebase deploy --only firestore:rules
```

---

## 6. 테스트

```bash
firebase emulators:start --only firestore
# Rules 단위 테스트는 Firebase Test Suite 또는 별도 스크립트 사용
```

---

*firestore.rules 기준 · 운영 전 CTO/보안 담당자 검토 권장*
