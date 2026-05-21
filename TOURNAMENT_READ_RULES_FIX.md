# ✅ Tournaments Read Rules 수정 완료

## 📌 문제 확인

### 현재 상태
- **Rules**: `allow read: if true;` → 모든 상태의 대회를 누구나 읽을 수 있음
- **프론트엔드**: `where("adminStatus", "==", "published")`로 필터링하지만, Rules 레벨에서는 제한 없음

### 문제점
- `draft` 상태의 대회도 누구나 읽을 수 있음 (보안 문제)
- `published` 상태만 공개되어야 하는데, Rules에서 제한이 없음

---

## ✅ 해결 방법

### 수정된 Read 규칙

**이전 규칙** (보안 문제):
```javascript
allow read: if true;  // 모든 상태의 대회를 누구나 읽을 수 있음
```

**수정된 규칙** (안전):
```javascript
allow read: if 
  resource.data.adminStatus == "published" || 
  isAssociationAdmin(associationId);
```

**의미**:
- `published` 상태: 모두 읽기 가능 (공개)
- `draft` 상태: `isAssociationAdmin(associationId)`만 읽기 가능 (관리자만)

---

## 🔧 동작 방식

### 1. 일반 사용자
- `published` 대회만 읽을 수 있음
- `draft` 대회는 읽을 수 없음 (Rules에서 차단)

### 2. 관리자 (Owner/Admin)
- `published` 대회 읽기 가능
- `draft` 대회도 읽기 가능 (`isAssociationAdmin` 통과)

### 3. 프론트엔드 쿼리
- 일반 모드: `where("adminStatus", "==", "published")` → `published`만 조회
- 관리자 모드: 필터 없음 → `published` + `draft` 모두 조회 (Rules에서 `draft`는 admin만 허용)

---

## 📋 최종 Rules 요약

```javascript
match /tournaments/{tournamentId} {
  // read: published는 모두 읽기 가능, draft는 admin만
  allow read: if 
    resource.data.adminStatus == "published" || 
    isAssociationAdmin(associationId);
  
  // create: draft는 모든 로그인 사용자, published는 Owner/Admin만
  allow create: if isSignedIn() && (
    request.resource.data.adminStatus == "draft" ||
    (request.resource.data.adminStatus == "published" && isAssociationAdmin(associationId))
  );
  
  // update: 모든 상태 전환 시나리오 명확화
  allow update: if isSignedIn() && (
    (resource.data.adminStatus == "draft" && request.resource.data.adminStatus == "draft" && resource.data.createdBy == request.auth.uid) ||
    (resource.data.adminStatus == "draft" && request.resource.data.adminStatus == "published" && isAssociationAdmin(associationId)) ||
    (resource.data.adminStatus == "published" && request.resource.data.adminStatus == "published" && isAssociationAdmin(associationId)) ||
    (resource.data.adminStatus == "published" && request.resource.data.adminStatus == "draft" && isAssociationAdmin(associationId))
  );
  
  // delete: Owner 또는 Admin만
  allow delete: if isAssociationAdmin(associationId);
}
```

---

## 🔧 다음 단계

### 1. 브라우저 새로고침
- `http://localhost:5173/association/assoc-nowon-football/tournaments` 페이지 새로고침

### 2. 테스트
1. **일반 사용자로 로그인**:
   - `published` 대회만 표시되어야 함
   - `draft` 대회는 표시되지 않아야 함

2. **관리자로 로그인**:
   - `published` + `draft` 모두 표시되어야 함

3. **콘솔 확인**:
   - `No matching allow statements` 오류가 사라져야 함

---

## ✅ 확인 사항

- [x] Read 규칙 수정 (`published` 공개, `draft` admin만)
- [ ] 브라우저 새로고침
- [ ] 일반 사용자 테스트 (published만 표시)
- [ ] 관리자 테스트 (published + draft 모두 표시)
- [ ] 콘솔 오류 확인

---

**작성일**: 2025-01-XX  
**상태**: ✅ Rules 수정 완료, 테스트 필요
