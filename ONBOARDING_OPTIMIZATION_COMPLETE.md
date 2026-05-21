# 🔥 온보딩 & 초기 로딩 최적화 완료

## ✅ 구현 완료 사항

### 1️⃣ 초기 로딩 쿼리 최적화 (단일 쿼리)

**구현 위치**: `src/hooks/useMyTeams.ts`

- ❌ 기존: teams 전체 스캔 또는 members 다중 조회
- ✅ 최적화: `team_members` (uid 인덱스) 단일 쿼리만 사용

```typescript
// team_members에서 내가 속한 active 팀만 조회
query(
  collection(db, "team_members"),
  where("uid", "==", user.uid),
  where("status", "==", "active")
)
```

**Firestore 인덱스 추가**: `firestore.indexes.json`
- `team_members` 컬렉션에 (uid, status) 복합 인덱스 추가

### 2️⃣ 팀 없음 상태 정상화

**구현 위치**: `src/components/onboarding/OnboardingGate.tsx`

- ❌ 기존: 에러/예외 상태로 처리
- ✅ 최적화: "아직 팀이 없어요" = 정상 상태
- **UX**: 부담 없는 온보딩 시작 화면 제공

### 3️⃣ 온보딩 게이트 컴포넌트

**구현 위치**: `src/components/onboarding/OnboardingGate.tsx`

**역할**:
- 로그인 후 첫 진입 시 팀 유무 확인
- 팀 0개 → `CreateTeamIntro` 표시
- 팀 ≥1개 → 첫 번째 팀 대시보드로 리디렉션

**최적화**:
- team_members 단일 쿼리만 사용
- 스켈레톤 UI로 로딩 상태 표시

### 4️⃣ 스켈레톤 UI 강제

**구현 위치**: 
- `src/components/onboarding/AppSkeleton.tsx` (전체 앱)
- `src/pages/team/TeamPage.tsx` (팀 페이지)

- ❌ 기존: 빈 화면 또는 스피너만
- ✅ 최적화: 스켈레톤 UI로 "빠르다"는 착각 제공

### 5️⃣ 팀 생성 직후 즉시 진입

**구현 위치**: `src/pages/team/TeamCreate.tsx`

- ❌ 기존: 팀 생성 후 다시 조회 (round-trip)
- ✅ 최적화: 응답으로 받은 `teamId` 바로 사용하여 즉시 리디렉션

```typescript
// 팀 생성 성공 시
navigate(`/sports/${sportType}/team`, { replace: true });
```

### 6️⃣ 라우터 통합

**구현 위치**: 
- `src/components/ProtectedRoute.tsx`
- `src/App.tsx`

**변경사항**:
- `ProtectedRoute`에 `enableOnboarding` 옵션 추가
- `/sports-hub` 라우트에 온보딩 게이트 활성화

## 📁 생성된 파일

1. `src/hooks/useMyTeams.ts` - 내 팀 조회 훅
2. `src/components/onboarding/OnboardingGate.tsx` - 온보딩 게이트
3. `src/components/onboarding/AppSkeleton.tsx` - 앱 스켈레톤 UI
4. `src/components/onboarding/CreateTeamIntro.tsx` - 팀 생성 소개 페이지

## 📝 수정된 파일

1. `firestore.indexes.json` - (uid, status) 복합 인덱스 추가
2. `src/components/ProtectedRoute.tsx` - 온보딩 게이트 지원 추가
3. `src/App.tsx` - `/sports-hub`에 온보딩 게이트 활성화
4. `src/pages/team/TeamCreate.tsx` - 팀 생성 후 즉시 리디렉션
5. `src/pages/team/TeamPage.tsx` - 스켈레톤 UI 적용

## 🎯 온보딩 전체 흐름

```
[로그인 성공]
      ↓
[team_members 인덱스 조회 (uid 기준, 1쿼리)]
      ↓
┌───────────────┬──────────────────┐
│ 팀 0개        │ 팀 ≥1개           │
│ (신규 유저)   │ (기존 유저)       │
│               │                  │
│ → CreateTeamIntro │ → /sports/:type/team │
│ → 팀 생성     │ → 대시보드        │
└───────────────┴──────────────────┘
```

## ⚡ 핵심 최적화 포인트

1. ✅ 초기 로딩 쿼리는 딱 1개 (team_members)
2. ✅ 팀 없음 상태를 정상 상태로 취급
3. 🔄 마지막 접속 팀 캐시 (TODO: users/{uid}.lastTeamId)
4. ✅ 스켈레톤 UI 강제
5. ✅ 팀 생성 직후 즉시 진입

## 📈 기대 효과

- ✅ 첫 진입 이탈률 ↓↓↓
- ✅ 체감 로딩 속도 ↑↑
- ✅ Firestore 비용 ↓ (쿼리 최소화)
- ✅ 이후 멀티 팀/플랜 확장 용이

## 🔄 다음 단계 (선택 사항)

1. **마지막 접속 팀 캐시**
   - `users/{uid}.lastTeamId` 필드 추가
   - 서버 only write
   - 팀 진입 시 자동 업데이트

2. **팀 정보 조회 최적화**
   - team_members에 sportType 캐싱 (선택)
   - 또는 첫 팀 정보만 조회하여 sportType 가져오기

## 🧪 테스트 체크리스트

- [ ] 신규 유저 로그인 → CreateTeamIntro 표시
- [ ] 기존 유저 로그인 → 팀 대시보드로 즉시 리디렉션
- [ ] 팀 생성 후 → 즉시 팀 대시보드로 이동
- [ ] 로딩 중 → 스켈레톤 UI 표시
- [ ] Firestore read 쿼리 수 확인 (최대 1개)

## 📚 참고 문서

- `docs/TEAM_MEMBERS_SETUP.md` - team_members 구조
- `docs/FIRESTORE_STRUCTURE_SPEC.md` - Firestore 구조 명세

---

**구현 완료 일시**: 2024년 현재  
**구현자**: AI Assistant (Cursor)  
**검토 필요**: 마지막 접속 팀 캐시 구현 여부 결정
