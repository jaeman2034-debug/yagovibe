# 관리자 권한 문서 생성 가이드

## User UID
`KU87yPtXNQjogjYRwS8xwqDeOIyA`

## Association ID
`assoc-nowon-football`

## 생성해야 할 문서

### 1. users/{uid} 문서
**경로**: `users/KU87yPtXNQjogjYRwS8xwqDeOIyA`

**필드**:
```
uid: string → KU87yPtXNQjogjYRwS8xwqDeOIyA
email: string → test@test.com
displayName: string → 테스트 관리자
createdAt: timestamp → (현재 시간)
updatedAt: timestamp → (현재 시간)
```

### 2. associations/{associationId}/members/{uid} 문서 (관리자 권한)
**경로**: `associations/assoc-nowon-football/members/KU87yPtXNQjogjYRwS8xwqDeOIyA`

**필드**:
```
uid: string → KU87yPtXNQjogjYRwS8xwqDeOIyA
email: string → test@test.com
role: string → admin (중요!)
status: string → active
joinedAt: timestamp → (현재 시간)
createdAt: timestamp → (현재 시간)
updatedAt: timestamp → (현재 시간)
```

### 3. associations/{associationId} 문서 확인/수정
**경로**: `associations/assoc-nowon-football`

**확인/설정**:
```
ownerUid: string → KU87yPtXNQjogjYRwS8xwqDeOIyA (선택, Owner 권한용)
```

## Firestore Emulator UI에서 생성 방법

1. http://localhost:4001 접속
2. "Firestore" 탭 클릭
3. 위 문서들을 순서대로 생성

## 권한 확인 방법

브라우저 콘솔에서 다음 로그 확인:
```
[useIsAssociationAdmin] members 구조 확인: {
  associationId: "assoc-nowon-football",
  userUid: "KU87yPtXNQjogjYRwS8xwqDeOIyA",
  role: "admin",
  isAdmin: true
}

[useIsAssociationOwner] ownerUid 기준 확인: {
  associationId: "assoc-nowon-football",
  userUid: "KU87yPtXNQjogjYRwS8xwqDeOIyA",
  ownerUid: "KU87yPtXNQjogjYRwS8xwqDeOIyA",
  isOwner: true
}

[TournamentEditDrawer] 권한 확인 상태: {
  canPublishTournament: true
}
```
