# 🔥 Firestore Rules 빠른 수정 가이드

## 문제

**"Missing or insufficient permissions"** 에러가 계속 발생

## 원인

Firestore Rules가 아직 배포되지 않았거나, 잘못된 Rules가 적용됨

## 해결 방법 (2가지)

### 방법 1: Firebase Console (가장 빠름, 1분 컷)

1. **Firebase Console 열기**
   - https://console.firebase.google.com
   - 프로젝트 선택

2. **Firestore Database → Rules 탭**

3. **아래 Rules 복사해서 붙여넣기**

```javascript
match /chats/{chatId} {
  allow create: if 
    request.auth != null &&
    (
      request.auth.uid == request.resource.data.buyerId ||
      request.auth.uid == request.resource.data.sellerId
    );
  
  allow read, update: if 
    request.auth != null &&
    (
      request.auth.uid == resource.data.buyerId ||
      request.auth.uid == resource.data.sellerId ||
      request.auth.uid in resource.data.get('participants', [])
    );
  
  allow delete: if 
    request.auth != null &&
    (
      request.auth.uid == resource.data.buyerId ||
      request.auth.uid == resource.data.sellerId ||
      request.auth.uid in resource.data.get('participants', [])
    );
  
  match /messages/{messageId} {
    allow read, write: if 
      request.auth != null &&
      (
        request.auth.uid == get(/databases/$(database)/documents/chats/$(chatId)).data.buyerId ||
        request.auth.uid == get(/databases/$(database)/documents/chats/$(chatId)).data.sellerId ||
        request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.get('participants', [])
      );
  }
}
```

4. **⚠️ 반드시 "Publish" 버튼 클릭**

5. **"Rules successfully published" 확인**

6. **브라우저 새로고침 후 재테스트**

### 방법 2: Firebase CLI

```bash
# 프로젝트 루트에서
firebase deploy --only firestore:rules
```

## 30초 확정 테스트

Rules가 문제인지 확정하려면:

1. Firebase Console → Firestore → Rules
2. 아래 Rules로 임시 교체:

```javascript
match /chats/{chatId} {
  allow create: if request.auth != null;
  allow read, write: if request.auth != null;
}
```

3. **Publish** 클릭
4. 브라우저 새로고침
5. 채팅 생성 버튼 클릭

**결과:**
- ✅ 생성된다 → Rules 문제 100% 확정
- ❌ 그래도 안 된다 → 프로젝트/컬렉션 이름 불일치 가능성

⚠️ 테스트 후 반드시 원래 Rules로 되돌리기!

## 체크리스트

- [ ] Firebase Console에서 Rules 확인
- [ ] chats 컬렉션 Rules 존재 확인
- [ ] `allow create` 규칙이 buyerId/sellerId 체크하는지 확인
- [ ] **Publish 버튼 클릭 완료**
- [ ] "Rules successfully published" 메시지 확인
- [ ] 브라우저 새로고침
- [ ] 재테스트

## 컬렉션 이름 확인

**코드:**
```typescript
collection(db, "chats")  // ✅ 이 이름
```

**Firestore Console:**
- `chats` ✅ (정답)
- `chat` ❌
- `chatRooms` ❌

이름 하나라도 다르면 Rules 안 먹는다!

## 결과

✅ Rules 배포 완료  
✅ 채팅 생성 정상  
✅ 권한 문제 해결

