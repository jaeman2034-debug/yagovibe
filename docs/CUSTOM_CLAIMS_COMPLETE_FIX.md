# 🔥 STEP 2️⃣ Custom Claims 오류 완전 정리

## 현재 문제 분석

### ❌ 발생 중인 오류
- `setAssociationAdminCallable` → `FirebaseError: internal`
- Custom Claims 설정 실패
- 게시/수정/삭제 시 권한 오류 반복

### ✅ 현재 상태
- 저장은 `adminUids` 기반으로 동작
- Rules는 하이브리드 구조 (adminUids 우선, Claims 보조)
- Functions 코드는 존재하지만 internal error 발생

## 해결 방안

### 1. Functions 코드 개선

**문제점**:
- Admin SDK 초기화 중복 가능성
- 에러 처리 부족
- 로깅 부족

**해결책**:
- Cloud Functions v2는 자동 초기화되므로 `admin.initializeApp()` 제거
- 상세 로깅 추가
- 에러 타입별 처리 강화

### 2. Claims 구조 표준 확정

**표준 구조**:
```typescript
{
  role: "ADMIN",           // 관리자 역할
  associationId: "assoc-nowon-football"  // 협회 ID
}
```

**사용 위치**:
- Firestore Rules: `request.auth.token.role == "ADMIN" && request.auth.token.associationId == associationId`
- 클라이언트: `tokenResult.claims.role === "ADMIN"`

### 3. Rules 수정안

현재 Rules는 이미 하이브리드 구조로 잘 설정되어 있음:
- `adminUids` 우선 (안정적)
- Custom Claims 보조 (추가 보안)

### 4. 클라이언트 코드 개선

- 에러 처리 강화
- 토큰 재발급 안내
- Claims 확인 유틸리티 개선

## 다음 단계

1. Functions 코드 수정 및 재배포
2. 테스트 및 검증
3. 클라이언트 코드 개선

