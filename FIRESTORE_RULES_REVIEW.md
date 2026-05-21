# Firestore Rules 코드 리뷰 및 수정 가이드

## 🔍 현재 Rules 구조 분석

### 현재 `isAssociationAdmin` 함수
```javascript
function isAssociationAdmin(associationId) {
  return request.auth != null &&
    exists(/databases/$(database)/documents/associations/$(associationId)) &&
    request.auth.uid in get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids;
}
```

**장점:**
- ✅ Firestore 문서 기반 권한 체크 (Custom Claims 불필요)
- ✅ 실시간 권한 변경 가능
- ✅ 단순한 구조

**단점:**
- ⚠️ `adminUids` 배열이 문자열로 저장되면 실패
- ⚠️ `associations/{id}` 문서가 없으면 실패
- ⚠️ Rules에서 `get()` 호출 시 읽기 비용 발생

---

## 🔴 현재 문제 진단

### 문제 1: `adminUids` 타입 불일치
**증상:** `Missing or insufficient permissions`

**원인:**
- Firestore에 `adminUids`가 문자열로 저장됨
- Rules는 배열을 기대함

**해결:**
```javascript
// ❌ 잘못된 저장
adminUids: "iUZB8RjKlEhb3uotZ6yqtpWtUQE2"

// ✅ 올바른 저장
adminUids: ["iUZB8RjKlEhb3uotZ6yqtpWtUQE2"]
```

---

### 문제 2: Rules에서 `status: "published"` 제한
**현재 Rules:**
```javascript
allow create: if isSignedIn() && 
  isAssociationAdmin(request.resource.data.associationId);
```

**문제:** `status` 필드에 대한 명시적 허용 없음

**해결:** Rules는 이미 관리자에게 모든 수정을 허용하므로 문제 없어야 함. 다만 `adminUids` 배열 문제로 인해 `isAssociationAdmin`이 `false`를 반환할 수 있음.

---

## ✅ 수정된 Firestore Rules (최종안)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper Functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    // 🔥 협회 관리자 확인 (개선된 버전)
    function isAssociationAdmin(associationId) {
      return request.auth != null &&
        exists(/databases/$(database)/documents/associations/$(associationId)) &&
        // 🔥 배열 타입 체크 추가
        get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids is list &&
        request.auth.uid in get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids;
    }
    
    // 📢 공지사항 (Notices) - 루트 컬렉션
    match /notices/{noticeId} {
      // 읽기: 모두 허용 (공개 공지)
      allow read: if true;
      
      // 생성: 협회 관리자만 가능 (draft/publish/scheduled 모두 허용)
      allow create: if isSignedIn() && 
        isAssociationAdmin(request.resource.data.associationId);
      
      // 수정: 권한 분기
      // - 관리자: 모든 필드 수정 가능 (pinned, status 등, publish/scheduled 포함)
      // - 일반 유저: draft 상태이고 pinned/status 변경 없을 때만 수정 가능
      allow update: if isSignedIn() && (
        // 🔥 관리자는 모든 수정 가능 (publish/scheduled 포함)
        isAssociationAdmin(resource.data.associationId) ||
        // 일반 유저는 draft 상태이고 pinned/status 변경 없을 때만
        (
          resource.data.status == 'draft' &&
          request.resource.data.status == 'draft' &&
          resource.data.isPinned == request.resource.data.isPinned
        )
      );
      
      // 삭제: 관리자만
      allow delete: if isSignedIn() && 
        isAssociationAdmin(resource.data.associationId);
    }
  }
}
```

**핵심 개선:**
- ✅ `adminUids is list` 체크 추가 (타입 검증)
- ✅ 관리자는 `status: "published"` 생성/수정 가능
- ✅ 일반 유저는 `draft` 상태에서만 수정 가능

---

## 🔧 Firestore 데이터 수정 가이드

### 방법 1: Firebase Console에서 직접 수정

1. Firebase Console → Firestore Database → Data 탭
2. `associations` 컬렉션 → `assoc-nowon-football` 문서 선택
3. `adminUids` 필드 확인:
   - **문자열이면:** 삭제 후 다시 추가
   - **타입:** `array` 선택
   - **값:** `["iUZB8RjKlEhb3uotZ6yqtpWtUQE2"]`

### 방법 2: Cloud Functions로 수정

```javascript
// functions/src/fixAdminUids.ts
import { getFirestore } from 'firebase-admin/firestore';

export async function fixAdminUids(associationId: string, adminUid: string) {
  const db = getFirestore();
  const assocRef = db.doc(`associations/${associationId}`);
  
  const assocSnap = await assocRef.get();
  if (!assocSnap.exists) {
    throw new Error('Association not found');
  }
  
  const data = assocSnap.data()!;
  let adminUids: string[] = [];
  
  // 기존 adminUids 처리
  if (data.adminUids) {
    if (typeof data.adminUids === 'string') {
      // 문자열이면 배열로 변환
      adminUids = [data.adminUids];
    } else if (Array.isArray(data.adminUids)) {
      adminUids = data.adminUids;
    }
  }
  
  // UID 추가 (중복 제거)
  if (!adminUids.includes(adminUid)) {
    adminUids.push(adminUid);
  }
  
  // 배열로 저장
  await assocRef.update({
    adminUids: adminUids
  });
  
  console.log(`✅ Fixed adminUids for ${associationId}:`, adminUids);
}
```

---

## 🧪 Rules 배포 및 테스트

### 1. Rules 배포
```bash
firebase deploy --only firestore:rules
```

### 2. Rules Simulator 테스트

**Firebase Console → Firestore → Rules → Rules Simulator**

**테스트 케이스 1: 관리자가 published 생성**
```
Location: notices/test-notice-id
Method: create
Authentication: 
  - User ID: iUZB8RjKlEhb3uotZ6yqtpWtUQE2
  - Authentication: Enabled

Request:
{
  "associationId": "assoc-nowon-football",
  "title": "테스트",
  "content": "테스트 내용",
  "status": "published",
  "isPinned": false,
  "isOfficial": true,
  "createdAt": "2025-01-XX",
  "createdBy": "iUZB8RjKlEhb3uotZ6yqtpWtUQE2"
}
```

**예상 결과:** ✅ **ALLOW**

---

## 📋 체크리스트

- [ ] `associations/assoc-nowon-football` 문서 존재 확인
- [ ] `adminUids` 필드가 **배열 타입**인지 확인
- [ ] `adminUids` 배열에 `iUZB8RjKlEhb3uotZ6yqtpWtUQE2` 포함 확인
- [ ] Firestore Rules 배포 (`firebase deploy --only firestore:rules`)
- [ ] Rules Simulator 테스트 통과 확인
- [ ] 브라우저에서 로그아웃 → 재로그인
- [ ] 게시 버튼 클릭 테스트

---

## 🎯 예상 결과

위 단계를 완료하면:
- ✅ 관리자는 `published` 상태로 공지 생성 가능
- ✅ 관리자는 `draft` → `published` 변경 가능
- ✅ 권한 에러 해결
- ✅ 게시 버튼 정상 작동

