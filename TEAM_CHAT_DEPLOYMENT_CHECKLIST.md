# 🔥 팀 채팅 시스템 배포 체크리스트

## ✅ 구현 완료 확인

- [x] `src/services/chat/ensureTeamChatRoom.ts` 구현
- [x] `src/pages/team/TeamInfoPage.tsx` 통합
- [x] `functions/src/team/syncTeamChatMembers.ts` 구현
- [x] `functions/src/index.ts` export 추가

---

## 🚀 배포 단계

### 1. Cloud Function 배포

```bash
firebase deploy --only functions:syncTeamChatMembers
```

**확인 사항**:
- [ ] 배포 성공 메시지 확인
- [ ] Firebase Console → Functions에서 `syncTeamChatMembers` 확인
- [ ] Region: `asia-northeast3` 확인

---

### 2. Security Rules 추가

**파일**: `firestore.rules`

현재 Rules는 전체 허용 상태입니다. 프로덕션에서는 아래 Rules를 추가하세요:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 🔥 팀 채팅방 규칙
    match /chatRooms/{roomId} {
      // 읽기/수정: 멤버만 가능
      allow read, update: if request.auth != null && 
        request.auth.uid in resource.data.get('members', []);
      
      // 생성: 팀 멤버만 가능
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.createdBy;
      
      // 삭제: 생성자만 가능
      allow delete: if request.auth != null && 
        request.auth.uid == resource.data.createdBy;
      
      // 메시지 서브컬렉션
      match /messages/{messageId} {
        // 읽기/쓰기: 채팅방 멤버만 가능
        allow read, write: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/chatRooms/$(roomId)).data.get('members', []);
      }
    }
    
    // 기존 Rules는 그대로 유지
    // ...
  }
}
```

**배포**:
```bash
firebase deploy --only firestore:rules
```

---

## 🧪 테스트 체크리스트

### 테스트 1: 팀 채팅 버튼 클릭
- [ ] 팀 상세 페이지 접속 (`/teams/{teamId}`)
- [ ] "팀 채팅" 버튼 클릭
- [ ] "채팅방 준비 중..." 메시지 표시
- [ ] 채팅 화면으로 이동 (`/chat/{roomId}`)
- [ ] 메시지 입력 가능

### 테스트 2: 채팅방 자동 생성
- [ ] 첫 클릭 시 채팅방 생성 확인
- [ ] 두 번째 클릭 시 기존 채팅방 재사용 확인
- [ ] Firestore `chatRooms` 컬렉션에서 문서 확인

### 테스트 3: 팀 멤버 동기화
- [ ] 팀 멤버 추가
- [ ] Cloud Function 로그 확인 (Functions Console)
- [ ] 채팅방 `members` 배열 업데이트 확인
- [ ] 팀 멤버 삭제
- [ ] 채팅방 `members` 배열에서 제거 확인

### 테스트 4: 메시지 전송
- [ ] 팀 채팅방에서 메시지 전송
- [ ] 실시간으로 표시되는지 확인
- [ ] `chatRooms/{roomId}/messages`에 저장되는지 확인

---

## 🔍 디버깅

### 문제: 채팅방이 생성되지 않음
- [ ] `ensureTeamChatRoom` 함수 콘솔 로그 확인
- [ ] Firestore 권한 확인
- [ ] 팀 정보 조회 성공 여부 확인

### 문제: 멤버 동기화가 안 됨
- [ ] Cloud Function 로그 확인
- [ ] `syncTeamChatMembers` 트리거 확인
- [ ] 팀 멤버 서브컬렉션 구조 확인

### 문제: 메시지가 표시되지 않음
- [ ] `ChatPage` 컴포넌트 구독 확인
- [ ] `chatRooms/{roomId}/messages` 경로 확인
- [ ] Security Rules 확인

---

## ✅ 완료 기준

- [ ] Cloud Function 배포 완료
- [ ] Security Rules 추가 완료
- [ ] 테스트 4개 모두 통과
- [ ] 프로덕션 환경에서 정상 동작 확인

---

**작성일**: 2025-01-XX  
**버전**: v1.0
