# 🔧 Firebase 권한 오류 해결 가이드

## ✅ 완료된 작업

### 1️⃣ Firestore Rules 수정
- **위치**: `firestore.rules`
- **변경**: `teams/{teamId}` 읽기 권한을 로그인 사용자 모두에게 허용
- **이유**: TeamContext가 모든 팀을 조회해야 하므로 권한이 필요함

---

## 🚀 즉시 해결 방법

### STEP 1: Firestore Rules 배포

```bash
firebase deploy --only firestore:rules
```

### STEP 2: teams/{teamId}/members/{uid} 문서 생성

1. **Firestore Console 열기**
   - https://console.firebase.google.com/project/yago-vibe-spt/firestore

2. **경로로 이동**
   - `teams` → `7EVuSVuWeIYBxybFsHXE` → `members` (서브컬렉션)

3. **문서 추가**
   - 문서 ID: `iUZB8RjKlEhb3uotZ6yqtpWtUQE2`
   - 필드:
     ```
     role: "admin" (string)
     joinedAt: [Timestamp] (현재 시간)
     ```

### STEP 3: 페이지 새로고침
- 브라우저에서 `Ctrl + Shift + R` (캐시 무시 새로고침)

---

## 🔍 변경 사항

### Firestore Rules
```javascript
// ❌ 기존 (너무 제한적)
allow read: if request.auth != null && (
  request.auth.uid in resource.data.get('owners', []) ||
  // ...
);

// ✅ 변경 (로그인 사용자 모두 읽기 가능)
allow read: if request.auth != null;
```

**이유**: 
- 팀 정보는 공개 정보 (팀 이름, 종목 등)
- 실제 권한 체크는 `teams/{teamId}/members/{uid}`에서 수행
- TeamContext가 모든 팀을 조회해야 하므로 읽기 권한 필요

---

## 📋 체크리스트

- [ ] Firestore Rules 배포 완료
- [ ] `teams/7EVuSVuWeIYBxybFsHXE/members/iUZB8RjKlEhb3uotZ6yqtpWtUQE2` 문서 생성됨
- [ ] `role: "admin"` 필드 존재
- [ ] `joinedAt` 필드 존재
- [ ] 페이지 새로고침 완료
- [ ] "우리 팀 관리" 정상 진입
- [ ] 권한 오류 사라짐

---

**작성일**: 2024년
**상태**: ✅ Rules 수정 완료

