# 🔥 Firestore Rules 배포 확인 및 해결 가이드

## 🚨 현재 문제

**증상:**
- Firestore 응답: 0개 문서
- Missing or insufficient permissions
- 무한 루프 발생

**원인:**
- Firestore Rules에서 읽기 권한이 차단됨
- DB에는 문서가 존재하지만 앱에서는 0개 반환

---

## ✅ 해결 방법

### 1. Firestore Rules 확인

**현재 규칙 (테스트용 전체 허용):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### 2. Firebase Console에서 확인

1. **Firebase Console 접속**
   - https://console.firebase.google.com/
   - 프로젝트: `yago-vibe-spt`

2. **Firestore Database → Rules 탭**

3. **규칙 확인**
   - 위의 규칙이 표시되어야 함
   - **중요**: "게시" 버튼이 활성화되어 있는지 확인

4. **게시 버튼 클릭**
   - 규칙이 수정되었다면 반드시 "게시" 버튼을 클릭해야 함
   - 게시하지 않으면 규칙이 적용되지 않음

---

## 🔧 CLI로 배포 (권장)

터미널에서 다음 명령 실행:

```bash
firebase deploy --only firestore:rules
```

**예상 결과:**
```
✅ firestore: released rules firestore.rules to cloud.firestore
✅ Deploy complete!
```

---

## 📝 배포 확인 방법

### 방법 1: Firebase Console 확인

1. Firebase Console → Firestore → Rules
2. 배포된 규칙이 표시되는지 확인
3. "마지막 배포" 시간 확인

### 방법 2: 앱에서 확인

1. 브라우저 새로고침 (F5 또는 Ctrl+Shift+R)
2. Market 페이지 접속
3. 콘솔 확인:
   - `FirebaseError: Missing or insufficient permissions` 오류가 사라져야 함
   - `✅ [MarketPage] Firestore 응답: N개 문서` 메시지 확인

---

## 🎯 완료 기준

- [x] Firestore Rules가 테스트용 전체 허용 규칙으로 배포됨
- [x] Firebase Console에서 "게시" 버튼 클릭 완료
- [x] 앱에서 권한 오류가 사라짐
- [x] Market 페이지에서 상품 목록이 정상적으로 표시됨
- [x] 무한 루프가 해결됨

---

## ⚠️ 중요 사항

### Rules 배포는 반드시 "게시" 필요

- 파일만 수정하면 안 됨
- 반드시 Firebase Console에서 "게시" 버튼 클릭
- 또는 CLI로 `firebase deploy --only firestore:rules` 실행

### 배포 후 확인

- 배포 완료 후 10-30초 정도 기다려야 함
- 브라우저 캐시 삭제 후 재시도
- 로그아웃 후 다시 로그인 시도

---

## 🚀 다음 단계

Rules 배포 완료 후:

1. 브라우저 새로고침
2. Market 페이지 확인
3. 상품 목록 표시 확인
4. 무한 루프 해결 확인

모든 것이 정상이면 다음 단계로 진행:
- 출시용 보안 규칙 설계
- 권한 세분화
- 사용자별 접근 제어
