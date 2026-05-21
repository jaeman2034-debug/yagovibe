# Phase 3 MVP 롤백 - Cursor 1줄 명령

## 📌 Cursor에게 전달할 최종 명령 (복붙용)

```
현재 /association/:associationId 라우트가 AssociationHome(관리자 대시보드)를 렌더링하고 있습니다.

Phase 3 MVP 설계에 따라 즉시 롤백하세요:

1) AssociationHome 및 관련 관리자 대시보드 컴포넌트 제거
2) AssociationOfficialPage 구현 (6개 섹션: Hero, Notice, Tournament, Facility, Story, ClubSummary)
3) /association/:associationId 라우트를 AssociationOfficialPage로 변경
4) ?mode=admin은 hover-only Edit 기능만 주입 (별도 페이지 ❌)
5) 관리자 운영 현황/리포트/회원 관리 기능 전부 제거 (Phase 4 범위)

롤백 완료 후 스크린샷 공유해 주세요.
```

---

## 🔍 코드 레벨 문제 추적

### 현재 문제 지점

**파일**: `src/App.tsx`

**라인 612-618**:
```typescript
<Route 
  path="/association/:associationId" 
  element={
    <ProtectedRoute>
      <AssociationHome />  // ❌ 문제: 관리자 대시보드
    </ProtectedRoute>
  } 
/>
```

**문제점**:
1. `AssociationHome`은 관리자 대시보드 (Phase 3 범위 위반)
2. `ProtectedRoute`로 감싸져 있어 로그인 필요 (공개 페이지여야 함)
3. Phase 3에서 합의한 `AssociationOfficialPage` 컴포넌트가 없음

### 수정 방향

**TO-BE**:
```typescript
<Route 
  path="/association/:associationId" 
  element={
    <AssociationOfficialPage />  // ✅ 공개 페이지
  } 
/>
```

**AssociationOfficialPage 구조**:
- Public: 읽기 전용 (6개 섹션)
- `?mode=admin`: hover-only Edit 기능 주입 (기존 UI 유지)

---

## ✅ 롤백 후 체크리스트

- [ ] AssociationHome.tsx 제거 또는 Phase 4로 이동
- [ ] AssociationOfficialPage.tsx 생성 (6개 섹션 구조)
- [ ] `/association/:associationId` 라우트 수정
- [ ] ProtectedRoute 제거 (공개 페이지)
- [ ] 관리자 대시보드 관련 컴포넌트 제거
- [ ] `?mode=admin` Edit Mode 구현 (hover-only)
- [ ] 스크린샷 공유 (Public + Admin 모드 각각)


