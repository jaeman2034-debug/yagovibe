# 🎯 관리자 권한 기반 대회 게시 플로우 구현 가이드

## 📌 목표
관리자만 대회 게시 가능하도록 권한 로직 완성
- 임시 저장 → 게시 전환 플로우 검증
- 실서비스 기준으로 동작

---

## 1️⃣ 관리자 판별 기준 (실서비스 기준)

### Firestore 구조
```
associations/{associationId}
```

### Association 문서 필드
```typescript
{
  "name": "노원구 축구 협회",
  "ownerUid": "<관리자 UID>",
  "status": "active",
  "createdAt": Timestamp
}
```

### 관리자 조건
```
로그인 사용자 UID === associations/{associationId}.ownerUid
```

---

## 2️⃣ Firestore Rules 수정

### 공통 함수 (ownerUid 기준)
```javascript
function isSignedIn() {
  return request.auth != null;
}

function isOwner(associationId) {
  return isSignedIn() &&
    get(/databases/$(database)/documents/associations/$(associationId))
      .data.ownerUid == request.auth.uid;
}
```

### Tournaments 컬렉션 Rules
```javascript
match /associations/{associationId}/tournaments/{tournamentId} {
  allow read: if true;
  
  allow create: if isSignedIn();
  
  allow update: if
    // 임시 저장(draft)는 작성자 허용
    (resource.data.adminStatus == "draft" && isSignedIn()) ||
    
    // 게시(published)는 관리자만 허용
    (request.resource.data.adminStatus == "published" && isOwner(associationId));
}
```

---

## 3️⃣ 프론트엔드 처리

### 관리자 여부 판별
- Association 문서 로드 후
- `const isOwner = association.ownerUid === currentUser.uid;`

### UI 제어
- 게시 라디오 버튼: `isOwner === false → disabled`
- 경고 문구 표시: "⚠ 관리자 권한이 필요합니다"
- 임시 저장은 항상 활성화

---

## 4️⃣ 검증 체크리스트

### ✅ 관리자 계정으로 로그인 시
- [ ] 대회 생성 가능
- [ ] 게시(published) 선택 가능
- [ ] 저장 후 대회 목록에 공개 노출

### ✅ 일반 계정 로그인 시
- [ ] 임시 저장 가능
- [ ] 게시 버튼 비활성화
- [ ] Rules 에러 없이 정상 동작

---

## 5️⃣ 완료 기준 (Definition of Done)

- ✅ 관리자만 대회 게시 가능
- ✅ Rules / UI / 실서비스 환경 모두 일관되게 동작
- ✅ Emulator / Production 동일 로직

---

## 🔜 다음 단계 (완료 후 바로 진행)

- 팀 생성 → 팀원 등록
- 자동 대진표 생성
- 결승 결과 확정
- 카카오톡 알림 시뮬레이션
