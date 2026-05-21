# Firestore Rules 테스트 시나리오

## 🔍 테스트 목적
공지사항(`notices`) 컬렉션의 `create` 및 `update` 권한이 정상 작동하는지 확인

## 📋 테스트 환경 설정

### 1. 사용자 정보
```
auth.uid: iUZB8RjKlEhb3uotZ6yqtpWtUQE2
associationId: assoc-nowon-football
```

### 2. Firestore 데이터 구조 확인
```
associations/assoc-nowon-football
├── adminUids: ["iUZB8RjKlEhb3uotZ6yqtpWtUQE2", ...]
```

## 🧪 테스트 케이스

### ✅ 테스트 1: 공지 생성 (draft)
**시나리오**: 관리자가 draft 상태로 공지 생성

**Request**:
```javascript
{
  path: "notices/{noticeId}",
  method: "create",
  auth: {
    uid: "iUZB8RjKlEhb3uotZ6yqtpWtUQE2"
  },
  resource: {
    data: {
      associationId: "assoc-nowon-football",
      title: "테스트 공지",
      content: "테스트 내용",
      status: "draft",
      isPinned: false,
      isOfficial: true,
      createdAt: serverTimestamp(),
      createdBy: "iUZB8RjKlEhb3uotZ6yqtpWtUQE2"
    }
  }
}
```

**예상 결과**: ✅ **ALLOW** (관리자이므로 draft 생성 가능)

---

### ✅ 테스트 2: 공지 생성 (published)
**시나리오**: 관리자가 published 상태로 공지 생성

**Request**:
```javascript
{
  path: "notices/{noticeId}",
  method: "create",
  auth: {
    uid: "iUZB8RjKlEhb3uotZ6yqtpWtUQE2"
  },
  resource: {
    data: {
      associationId: "assoc-nowon-football",
      title: "테스트 공지",
      content: "테스트 내용",
      status: "published",  // 🔥 publish 상태로 생성
      isPinned: false,
      isOfficial: true,
      createdAt: serverTimestamp(),
      createdBy: "iUZB8RjKlEhb3uotZ6yqtpWtUQE2"
    }
  }
}
```

**예상 결과**: ✅ **ALLOW** (관리자이므로 publish 생성 가능)

---

### ✅ 테스트 3: 공지 수정 (draft → published)
**시나리오**: 관리자가 draft 공지를 published로 변경

**기존 문서**:
```javascript
{
  path: "notices/{noticeId}",
  data: {
    associationId: "assoc-nowon-football",
    title: "테스트 공지",
    content: "테스트 내용",
    status: "draft",
    isPinned: false,
    isOfficial: true,
    createdAt: Timestamp,
    createdBy: "iUZB8RjKlEhb3uotZ6yqtpWtUQE2"
  }
}
```

**Request**:
```javascript
{
  path: "notices/{noticeId}",
  method: "update",
  auth: {
    uid: "iUZB8RjKlEhb3uotZ6yqtpWtUQE2"
  },
  resource: {
    data: {
      // 기존 데이터
      associationId: "assoc-nowon-football",
      status: "draft"
    }
  },
  request: {
    resource: {
      data: {
        // 변경할 데이터
        status: "published",  // 🔥 draft → published
        updatedAt: serverTimestamp(),
        updatedBy: "iUZB8RjKlEhb3uotZ6yqtpWtUQE2"
      }
    }
  }
}
```

**예상 결과**: ✅ **ALLOW** (관리자이므로 publish 변경 가능)

---

### ❌ 테스트 4: 일반 유저가 publish 시도
**시나리오**: 일반 유저가 draft를 published로 변경 시도

**Request**:
```javascript
{
  path: "notices/{noticeId}",
  method: "update",
  auth: {
    uid: "일반유저UID"  // adminUids에 없는 사용자
  },
  resource: {
    data: {
      associationId: "assoc-nowon-football",
      status: "draft"
    }
  },
  request: {
    resource: {
      data: {
        status: "published"  // ❌ 일반 유저는 publish 불가
      }
    }
  }
}
```

**예상 결과**: ❌ **DENY** (일반 유저는 publish 불가)

---

### ✅ 테스트 5: 일반 유저가 draft 수정
**시나리오**: 일반 유저가 draft 공지의 내용만 수정

**Request**:
```javascript
{
  path: "notices/{noticeId}",
  method: "update",
  auth: {
    uid: "일반유저UID"
  },
  resource: {
    data: {
      associationId: "assoc-nowon-football",
      status: "draft",
      isPinned: false
    }
  },
  request: {
    resource: {
      data: {
        title: "수정된 제목",  // ✅ 내용만 수정
        content: "수정된 내용",
        status: "draft",  // ✅ status 유지
        isPinned: false  // ✅ isPinned 유지
      }
    }
  }
}
```

**예상 결과**: ✅ **ALLOW** (일반 유저도 draft 수정 가능)

---

## 🔧 Rules Simulator 사용법

### Firebase Console에서 테스트
1. Firebase Console → Firestore Database → Rules 탭
2. "Rules Simulator" 클릭
3. 위 테스트 케이스를 하나씩 입력하여 테스트

### 테스트 입력 예시 (테스트 3번)
```
Location: notices/test-notice-id
Method: update
Authentication: 
  - User ID: iUZB8RjKlEhb3uotZ6yqtpWtUQE2
  - Authentication: Enabled

Resource (기존 문서):
{
  "associationId": "assoc-nowon-football",
  "status": "draft",
  "isPinned": false
}

Request (변경할 데이터):
{
  "status": "published",
  "updatedAt": "2025-01-XX",
  "updatedBy": "iUZB8RjKlEhb3uotZ6yqtpWtUQE2"
}
```

---

## ✅ 예상 결과 요약

| 테스트 | 사용자 | 상태 | 예상 결과 |
|--------|--------|------|----------|
| 1. draft 생성 | 관리자 | draft | ✅ ALLOW |
| 2. published 생성 | 관리자 | published | ✅ ALLOW |
| 3. draft → published | 관리자 | published | ✅ ALLOW |
| 4. draft → published | 일반 유저 | published | ❌ DENY |
| 5. draft 수정 | 일반 유저 | draft | ✅ ALLOW |

---

## 🐛 문제 발생 시 체크리스트

1. ✅ `associations/assoc-nowon-football` 문서 존재 확인
2. ✅ `adminUids` 배열에 `iUZB8RjKlEhb3uotZ6yqtpWtUQE2` 포함 확인
3. ✅ `adminUids`가 배열 타입인지 확인 (문자열이 아님)
4. ✅ Rules 배포 확인 (`firebase deploy --only firestore:rules`)
5. ✅ Rules Simulator에서 실제 테스트

---

## 📝 Rules 배포 명령어

```bash
# Rules 배포
firebase deploy --only firestore:rules

# 또는 전체 배포
firebase deploy
```

---

## 🔍 디버깅 팁

### Rules Simulator에서 실패하는 경우
1. **"Missing or insufficient permissions"** 에러:
   - `isAssociationAdmin` 함수가 `false`를 반환하는지 확인
   - `associations/{associationId}` 문서가 존재하는지 확인
   - `adminUids` 배열에 사용자 UID가 포함되어 있는지 확인

2. **"Resource not found"** 에러:
   - `associations/assoc-nowon-football` 문서가 실제로 존재하는지 확인
   - Firestore Console에서 직접 확인

3. **"Function evaluation error"**:
   - Rules 문법 오류 확인
   - `get()` 함수 호출 시 문서 경로 확인

---

## ✅ 최종 확인

위 테스트 케이스를 모두 통과하면:
- ✅ 관리자는 draft/published 모두 생성 가능
- ✅ 관리자는 draft → published 변경 가능
- ✅ 일반 유저는 publish 불가
- ✅ 일반 유저는 draft 수정 가능

이 상태면 **Firestore Rules는 정상 작동**합니다.

