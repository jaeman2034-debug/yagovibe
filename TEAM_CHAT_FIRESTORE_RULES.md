# 🔥 팀 채팅 Firestore Security Rules

## 📋 추가할 Rules

**파일**: `firestore.rules`

현재 Rules는 전체 허용 상태이지만, 프로덕션에서는 아래 Rules를 추가해야 합니다.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 🔥 팀 채팅방 규칙
    match /chatRooms/{roomId} {
      // 읽기/수정: 멤버만 가능
      allow read, update: if request.auth != null && 
        request.auth.uid in resource.data.get('members', []);
      
      // 생성: 팀 멤버만 가능 (createdBy가 본인이어야 함)
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.createdBy;
      
      // 삭제: 생성자만 가능
      allow delete: if request.auth != null && 
        request.auth.uid == resource.data.createdBy;
      
      // 🔥 메시지 서브컬렉션
      match /messages/{messageId} {
        // 읽기/쓰기: 채팅방 멤버만 가능
        allow read, write: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/chatRooms/$(roomId)).data.get('members', []);
      }
    }
    
    // 🔥 기존 Rules는 그대로 유지
    // ...
  }
}
```

---

## ✅ 적용 방법

1. `firestore.rules` 파일 열기
2. 위 Rules를 적절한 위치에 추가
3. 배포:
   ```bash
   firebase deploy --only firestore:rules
   ```

---

**작성일**: 2025-01-XX  
**버전**: v1.0
