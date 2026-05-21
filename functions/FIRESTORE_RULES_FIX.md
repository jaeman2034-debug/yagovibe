# 🔧 Firestore Rules 수정 - Teams/Stats/PhaseEvents/OpsLogs 읽기 권한

## 🚨 문제 상황

관리자 계정이 teams / stats / opsLog를 읽을 권한이 없어서:
- 화면이 "승인팀 0"으로 고정됨
- 실제 DB에는 승인팀이 있어도 프론트에서 못 읽음
- UI는 영원히 "승인된 팀 필요" 상태

## ✅ 수정 내용

### 1. Teams 컬렉션 읽기 권한 명시
```rules
match /teams/{teamId} {
  // 읽기: 로그인 사용자 또는 관리자
  allow read: if isSignedIn() || isAssociationAdmin(associationId);
  allow list: if isSignedIn() || isAssociationAdmin(associationId);
  ...
}
```

### 2. Stats 컬렉션 규칙 추가 (신규)
```rules
match /stats/{statId} {
  // 읽기: 관리자만
  allow read: if isAssociationAdmin(associationId);
  // 쓰기: Cloud Function만 가능
  allow write: if false; // 🔥 서버 only
}
```

### 3. Phase Events 컬렉션 규칙 추가 (신규)
```rules
match /phaseEvents/{eventId} {
  // 읽기: 관리자만
  allow read: if isAssociationAdmin(associationId);
  // 쓰기: Cloud Function만 가능
  allow write: if false; // 🔥 서버 only
}
```

### 4. Ops Logs 컬렉션 규칙 추가 (신규)
```rules
match /opsLogs/{logId} {
  // 읽기: 관리자만
  allow read: if isAssociationAdmin(associationId);
  // 쓰기: Cloud Function만 가능
  allow write: if false; // 🔥 서버 only
}
```

### 5. Teams Snapshot 컬렉션 규칙 추가 (신규)
```rules
match /teamsSnapshot/{teamId} {
  // 읽기: 로그인 사용자 모두 가능 (공개 정보)
  allow read: if isSignedIn();
  // 쓰기: Cloud Function만 가능
  allow write: if false; // 🔥 서버 only
}
```

## 📝 배포 방법

```bash
# Firestore Rules 배포
firebase deploy --only firestore:rules
```

## ✅ 확인 방법

1. 브라우저 콘솔에서 권한 오류 확인
   - `FirebaseError: Missing or insufficient permissions` 사라져야 함

2. 승인 팀 수 표시 확인
   - `approvedTeamsCount` 정상적으로 표시되는지 확인

3. 관리자 권한 확인
   - `isAssociationAdmin` 함수가 제대로 작동하는지 확인

## 🔍 문제 해결 후 확인 포인트

- [ ] Teams 컬렉션 읽기 성공
- [ ] Stats 컬렉션 읽기 성공
- [ ] Phase Events 컬렉션 읽기 성공
- [ ] Ops Logs 컬렉션 읽기 성공
- [ ] 승인 팀 수 정상 표시
- [ ] "팀원 명단 잠금" 버튼 활성화
