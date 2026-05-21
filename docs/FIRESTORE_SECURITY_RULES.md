# 🔐 Firestore Security Rules (YAGO SPORTS)

## 📋 개요

실제 서비스에 바로 사용할 수 있는 Firestore Security Rules입니다.

**파일 위치**: `firestore.rules`

**적용 방법**: Firebase Console → Firestore → Rules → `firestore.rules` 내용 복사/붙여넣기

---

## 🔥 핵심 보안 원칙

### 1. 인증 필수
- 모든 쓰기 작업은 인증된 사용자만 가능
- 읽기는 공개 데이터는 인증된 사용자 모두 가능

### 2. 작성자 권한
- 문서 수정/삭제는 작성자만 가능
- `authorId` 필드로 작성자 확인

### 3. 팀 권한
- 팀 소유자: `ownerUid` 확인
- 팀 관리자: `role in ['owner', 'admin']` 확인
- 팀 멤버: `teams/{teamId}/members/{uid}` 존재 확인

### 4. 필드 검증
- 필수 필드 존재 확인
- `authorId`, `ownerUid` 변경 방지
- `status` 초기값 검증

---

## 📊 컬렉션별 규칙

### Users
- **읽기**: 모든 인증된 사용자
- **쓰기**: 본인만

### Teams
- **읽기**: 모든 인증된 사용자
- **생성**: 인증된 사용자 (ownerUid 자동 설정)
- **수정/삭제**: 팀 소유자만

### Team Members
- **읽기**: 팀 멤버만
- **생성**: 팀 소유자 또는 초대 링크를 통한 가입
- **수정**: 팀 관리자만 (역할 변경)
- **삭제**: 팀 관리자 또는 본인 (탈퇴)

### Recruits
- **읽기**: 모든 인증된 사용자
- **생성**: 인증된 사용자 (팀 소속은 앱에서 체크)
- **수정/삭제**: 작성자만

### Recruit Applications
- **읽기**: 지원자 또는 모집글 작성자
- **생성**: 인증된 사용자
- **수정**: 지원자 또는 모집글 작성자 (승인/거절)
- **삭제**: 지원자 또는 모집글 작성자

### Matches
- **읽기**: 모든 인증된 사용자
- **생성**: 인증된 사용자 (팀 소속은 앱에서 체크)
- **수정/삭제**: 작성자만

### Match Requests
- **읽기**: 신청 팀 또는 매칭글 작성자
- **생성**: 인증된 사용자 (팀 소속은 앱에서 체크)
- **수정**: 신청 팀 또는 매칭글 작성자 (승인/거절)
- **삭제**: 신청 팀 또는 매칭글 작성자

### Guest Players
- **읽기**: 모든 인증된 사용자
- **생성**: 인증된 사용자 (팀 없어도 가능)
- **수정/삭제**: 작성자만

### Guest Applications
- **읽기**: 지원자 또는 용병 모집글 작성자
- **생성**: 인증된 사용자
- **수정**: 지원자 또는 용병 모집글 작성자 (승인/거절)
- **삭제**: 지원자 또는 용병 모집글 작성자

### Team Join Requests
- **읽기**: 신청자 또는 팀 관리자
- **생성**: 인증된 사용자
- **수정**: 신청자 또는 팀 관리자 (승인/거절)
- **삭제**: 신청자 또는 팀 관리자

### Notifications
- **읽기**: 본인만
- **생성**: 인증된 사용자 (앱 또는 Cloud Functions)
- **수정**: 본인만 (읽음 처리)
- **삭제**: 본인만

### Activities
- **읽기**: 공개 활동은 모든 인증된 사용자, 팀 활동은 팀 멤버만
- **생성**: 인증된 사용자 (앱 또는 Cloud Functions)
- **수정/삭제**: 작성자만

### Invite Links
- **읽기/쓰기**: 팀 관리자만

---

## 🔥 Helper Functions

### isAuthenticated()
현재 사용자가 인증되었는지 확인

### isAuthor(authorId)
현재 사용자가 문서 작성자인지 확인

### isTeamOwner(teamId)
현재 사용자가 팀 소유자인지 확인

### isTeamMember(teamId)
현재 사용자가 팀 멤버인지 확인

### isTeamAdmin(teamId)
현재 사용자가 팀 관리자(owner/admin)인지 확인

---

## ⚠️ 주의사항

### 1. 팀 소속 체크
- Recruit, Match 생성 시 팀 소속은 **앱에서 체크**
- Firestore Rules에서는 `teamId` 필드 존재만 확인

### 2. 필드 변경 방지
- `authorId`, `ownerUid` 변경 방지
- `userId` 변경 방지 (notifications)

### 3. 역할 변경 방지
- `owner` 역할 변경 방지 (team members)

### 4. 초기값 검증
- `status` 초기값 검증 (`"open"`, `"pending"`)

---

## 🚀 성능 필수 Index

Firebase Console → Firestore → Indexes에서 다음 인덱스 추가:

### Recruits
```
Collection: recruits
Fields:
  - status (Ascending)
  - createdAt (Descending)
```

### Matches
```
Collection: matches
Fields:
  - status (Ascending)
  - date (Ascending)
  - time (Ascending)
```

### Guest Players
```
Collection: guest_players
Fields:
  - status (Ascending)
  - date (Ascending)
  - time (Ascending)
```

### Activities
```
Collection: activities
Fields:
  - visibility (Ascending)
  - createdAt (Descending)
```

### Team Members
```
Collection: team_members
Fields:
  - userId (Ascending)
  - status (Ascending)
```

---

## ✅ 테스트 체크리스트

### 인증 테스트
- [ ] 비로그인 사용자는 읽기 불가
- [ ] 비로그인 사용자는 쓰기 불가

### 작성자 권한 테스트
- [ ] 작성자만 수정 가능
- [ ] 작성자만 삭제 가능
- [ ] 다른 사용자는 수정 불가

### 팀 권한 테스트
- [ ] 팀 소유자만 팀 수정 가능
- [ ] 팀 관리자만 멤버 역할 변경 가능
- [ ] 팀 멤버만 팀 정보 읽기 가능

### 필드 검증 테스트
- [ ] `authorId` 변경 불가
- [ ] `ownerUid` 변경 불가
- [ ] 필수 필드 누락 시 생성 불가

---

## 🔥 배포 전 확인사항

1. **Rules 테스트**: Firebase Console → Firestore → Rules → "Rules Playground"에서 테스트
2. **Index 생성**: 모든 복합 쿼리에 대한 인덱스 생성
3. **Helper Functions**: 모든 Helper Function이 올바르게 작동하는지 확인
4. **에러 로그**: Firebase Console → Firestore → Usage에서 에러 확인

---

## 📝 참고

- **Rules 버전**: `rules_version = '2'`
- **최대 규칙 크기**: 250KB
- **Helper Function 최대 깊이**: 20단계
- **get() 호출 제한**: 문서당 10회
