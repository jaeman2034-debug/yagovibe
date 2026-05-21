# 🔥 공지 Rules 업데이트: ownerUid 기반 권한

## 📌 목표
- `ownerUid == request.auth.uid` → write 가능
- 일반 사용자 → read only

## 🔍 현재 상태
- 공지사항 구조: `associations/{associationId}/notices/{noticeId}`
- 현재 Rules: `members/{uid}.role` 기반 (isAdmin 함수 사용)
- **변경 필요**: `ownerUid` 기반으로 단순화

## ✅ 수정된 Rules 구조

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 🔥 협회 ownerUid 기반 권한 규칙
    
    // ✅ 헬퍼 함수: 협회 소유자 확인 (ownerUid 기반)
    function isOwner(associationId) {
      return request.auth != null
        && exists(/databases/$(database)/documents/associations/$(associationId))
        && get(/databases/$(database)/documents/associations/$(associationId)).data.ownerUid == request.auth.uid;
    }
    
    // ✅ 공지사항 읽기: 전체 허용 (Public)
    // ✅ 공지사항 작성/수정/삭제: 협회 소유자만 허용
    match /associations/{associationId}/notices/{noticeId} {
      allow read: if true;
      allow create, update, delete: if isOwner(associationId);
    }
    
    // ✅ 협회 멤버 정보: 인증된 사용자만 읽기, 소유자만 작성/수정
    match /associations/{associationId}/members/{userId} {
      allow read: if request.auth != null;
      allow create, update, delete: if isOwner(associationId);
    }
    
    // ✅ 협회 메타 정보: 읽기는 Public, 수정은 소유자만
    match /associations/{associationId} {
      allow read: if true;
      allow write: if isOwner(associationId);
    }
    
    // 🔥 기타 컬렉션: 임시로 허용 (점진적 규칙 추가 예정)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## ⚠️ 주의사항
1. **associations 문서에 `ownerUid` 필드 필요**
   - 기존 데이터에 `ownerUid` 필드 추가 필요
   - 또는 `adminUids[0]`을 `ownerUid`로 사용

2. **마이그레이션 필요**
   - 기존 `adminUids` 배열 → `ownerUid` 단일 필드
   - 또는 둘 다 지원 (하위 호환)

## 🔄 다음 단계
1. Rules 파일 업데이트
2. associations 문서에 `ownerUid` 필드 확인/추가
3. Emulator에서 검증
