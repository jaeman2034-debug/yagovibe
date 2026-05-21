# 🔥 Firestore Rules × Persona 구조 정합 설계 (STEP 10)

## 목표

프론트 Persona 설계와 보안 규칙이 절대 어긋나지 않게 봉인

## 핵심 원칙 (고정)

- ❌ "문서가 없어서 읽기 실패" → 금지
- ❌ "권한 없음 = 예외" → 금지
- ✅ 읽기 가능 + 결과 없음 = 정상 상태
- ✅ Rules는 역할(Role), 프론트는 Persona

## 1. users 컬렉션 Rules (기본 시민권)

모든 로그인 유저는 자기 문서를 읽을 수 있어야 한다

```javascript
match /users/{userId} {
  // 읽기: 로그인 유저는 자기 문서 읽기 가능
  allow read: if request.auth != null
              && request.auth.uid == userId;

  // 쓰기: 로그인 유저는 자기 문서 수정 가능
  allow write: if request.auth != null
               && request.auth.uid == userId;
}
```

**📌 profile이 없을 수 있다는 전제**
**📌 P0 / P1도 여기서 차단 ❌**

## 2. teams 컬렉션 Rules (팀 없음 = 정상)

```javascript
match /teams/{teamId} {
  // 읽기: 로그인 사용자 모두 가능 (팀 정보는 공개 정보)
  allow read: if request.auth != null;
  
  // list 허용: where 쿼리 가능
  // 결과 0개 = 정상 (P1)
  
  // 생성: 로그인 사용자 가능
  allow create: if request.auth != null;
  
  // 수정: 팀 소유자만
  allow update: if request.auth != null && (
    resource.data.ownerUid == request.auth.uid ||
    request.auth.uid in resource.data.get('owners', [])
  );
}
```

**📌 팀이 0개여도 문제 없음**
**📌 쿼리 결과 [] = 정상 (P1)**

## 3. team_members 컬렉션 Rules

```javascript
match /team_members/{memberId} {
  // 읽기: 로그인 사용자 모두 가능 (list 허용)
  allow read: if request.auth != null;
  
  // list 허용: where('uid', '==', uid) 쿼리 가능
  // 결과 0개 = 정상 (P1)
  
  // 쓰기: Cloud Function만 가능
  allow write: if false; // 🔥 서버 only
}
```

## 4. tournamentApplications Rules (핵심)

**🔥 여기서 대부분이 터진다**

### ❌ 잘못된 전형
```javascript
allow read: if request.auth.uid == resource.data.userId;
```
→ 컬렉션 쿼리 시 resource 없음 → 권한 에러

### ✅ STEP 10 정답
```javascript
match /associations/{associationId}/tournaments/{tournamentId}/applications/{applicationId} {
  // 읽기: 본인 신청서 또는 관리자만
  allow read: if request.auth != null && (
    resource.data.createdBy == request.auth.uid ||
    resource.data.userId == request.auth.uid ||
    isAssociationAdmin(associationId)
  );
  
  // list 허용: where('createdBy', '==', uid) 쿼리 가능
  // 결과 0개 = 정상 (P0, P1)
  
  // 생성: 로그인 사용자 모두 가능
  allow create: if request.auth != null;
  
  // 수정/삭제: 관리자만
  allow update, delete: if isAssociationAdmin(associationId);
}
```

**📌 list 허용이 핵심**
**📌 where('createdBy', '==', uid) 쿼리 가능**
**📌 결과 0개 → 정상**
**📌 신규 유저 터짐 ❌**

## 5. 관리자 Rules (Role 분리)

```javascript
// 전역 관리자 확인
function isGlobalAdmin() {
  return request.auth != null
         && exists(/databases/$(database)/documents/users/$(request.auth.uid))
         && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN';
}

match /tournaments/{tournamentId} {
  allow read: if true; // 공개 정보
  allow write: if isGlobalAdmin();
}
```

**📌 관리자 권한은 Rules에서만 처리**
**📌 프론트 Persona와 혼합 ❌**

## 6. 프론트 쿼리 × Rules 정합 체크리스트

이 5개만 지키면 다시 안 터진다:

1. ✅ enabled: !!userId (조건부 실행)
2. ✅ list 허용된 컬렉션만 쿼리
3. ✅ 결과 [] → 정상 처리
4. ✅ Rules에서 "없음"을 막지 않음
5. ✅ Persona는 프론트 전용 개념

## 7. 데이터 모델 전제 (최소)

```
users/{userId}
  - role: 'USER' | 'ADMIN'
  - profileCompleted: boolean

teams/{teamId}
  - leaderId
  - members: [userId]

team_members/{memberId}
  - uid: userId
  - teamId: teamId
  - status: 'active'

tournamentApplications/{appId}
  - userId
  - teamId
  - createdBy: userId
```

## 8. 핵심 원칙 요약

**"Rules는 막는 게 아니라 '정상 흐름을 허용하는 장치'다."**

- 읽기 가능 + 결과 없음 = 정상 상태
- list 허용 = where 쿼리 가능
- 결과 0개 = Persona P0, P1 정상 상태
