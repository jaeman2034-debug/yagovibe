# 🔥 Firestore Rules 배포 (지금 당장 할 것)

## 현재 상태

- ✅ Rules 파일 수정 완료 (`firestore.rules`)
- ❌ **아직 배포 안 됨** (이게 문제!)

## 배포 방법 (2가지 중 선택)

### 방법 1: Firebase CLI (권장, 30초)

```bash
firebase deploy --only firestore:rules
```

### 방법 2: Firebase Console (1분)

1. https://console.firebase.google.com → 프로젝트 선택 (`yago-vibe-spt`)
2. Firestore Database → **Rules** 탭
3. `firestore.rules` 파일 내용 복사
4. 붙여넣기
5. **⚠️ 반드시 "Publish" 버튼 클릭**
6. "Rules successfully published" 확인

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
- ❌ 그래도 안 된다 → 프로젝트/컬렉션 이름 불일치

⚠️ 테스트 후 반드시 원래 Rules로 되돌리기!

## 체크리스트

- [ ] Firebase Console에서 Rules 확인
- [ ] `match /chats/{chatId}` 규칙 존재 확인
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

