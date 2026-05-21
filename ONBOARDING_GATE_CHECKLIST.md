# 🔥 온보딩 게이트 체크리스트 & 검증 가이드

## ✅ 최종 판정: 구조적으로 올바름

**핵심 원칙**:
- 허브 페이지: 탐색/정보/선택 → 항상 접근 가능
- 팀 페이지: 작업/관리 → 팀 필수 → OnboardingGate 적용

## 🔎 체크리스트 (5분 점검)

### 1. 허브/탐색 페이지 (팀 불필요)
- [ ] `/` → 정상 렌더 (리디렉션)
- [ ] `/home` → 정상 렌더
- [ ] `/sports-hub` → 항상 정상 렌더 (OnboardingGate 무시)
- [ ] `/sports/:type` → 정상 렌더 (종목별 허브)

### 2. 팀 필수 페이지 (OnboardingGate 적용)
- [ ] `/sports/:type/team` → 팀 있음: 팀 페이지 / 팀 없음: CreateTeamIntro
- [ ] `/sports/:type/team/members` → 동일 동작
- [ ] `/sports/:type/team/attendance` → 동일 동작
- [ ] `/sports/:type/team/ledger` → 동일 동작
- [ ] `/sports/:type/team/accounting` → 동일 동작
- [ ] `/sports/:type/team/audit` → 동일 동작
- [ ] `/sports/:type/team/notifications` → 동일 동작
- [ ] `/sports/:type/team/assembly` → 동일 동작
- [ ] `/sports/:type/team/vote` → 동일 동작
- [ ] `/sports/:type/team/health` → 동일 동작

### 3. 팀 관련 페이지 (특수 케이스)
- [ ] `/team/create` → 항상 접근 가능 (팀 생성 페이지)
- [ ] `/teams/search` → 항상 접근 가능 (팀 검색 페이지)
- [ ] `/team/:teamId` → 팀 필수 (팀 상세)
- [ ] `/teams/:teamId` → 팀 필수 (팀 상세)
- [ ] `/app/team` → 항상 접근 가능 (팀 목록)
- [ ] `/app/team/:id` → 팀 필수 (팀 상세)
- [ ] `/invite/:code` → 항상 접근 가능 (초대 링크)

### 4. 공개 페이지 (팀 불필요)
- [ ] `/teams/:teamSlug/blog` → 공개 블로그 (팀 멤버 불필요)
- [ ] `/teams/:teamSlug/blog/:postId` → 공개 블로그 포스트

### 5. 새로고침/직접 접근 테스트
- [ ] F5 새로고침 시 동일 동작
- [ ] 직접 URL 접근 시도도 동일 동작
- [ ] 브라우저 뒤로/앞으로 버튼 동작 정상

### 6. 팀 생성 플로우
- [ ] 팀 생성 직후 CreateTeamIntro 재노출 ❌ (팀 페이지로 이동)
- [ ] 팀 생성 후 새로고침 시 팀 페이지 유지

## ⚠️ 함정 체크

### 함정 1: 동적 라우트 누락 ✅ 해결
**패턴 매칭 사용**:
```typescript
/sports/**/team/** → 적용 (모든 하위 경로 포함)
/team/:teamId → 적용
/teams/:teamId → 적용 (단 /teams/search 제외)
/app/team/:id → 적용
```

### 함정 2: 서버/클라 불일치 ✅ 해결
- 클라이언트 사이드 라우팅만 사용 (SSR 없음)
- 모든 로직이 라우터 레벨에서 통일됨

## 🧪 테스트 시나리오

### 시나리오 1: 신규 유저
1. 로그인
2. `/sports-hub` 접속 → 정상 렌더 ✅
3. `/sports/football/team` 접속 → CreateTeamIntro 표시 ✅
4. 팀 생성
5. 자동으로 팀 페이지로 이동 ✅

### 시나리오 2: 기존 유저 (팀 있음)
1. 로그인
2. `/sports-hub` 접속 → 정상 렌더 ✅
3. `/sports/football/team` 접속 → 팀 페이지 표시 ✅
4. 새로고침 → 동일 동작 ✅

### 시나리오 3: 직접 URL 접근
1. 로그인 없이 `/sports/football/team` 접속 → 로그인 페이지로 리디렉션 ✅
2. 로그인 후 → 팀 유무에 따라 분기 ✅

## 📊 경로 분류 정리

| 경로 패턴 | OnboardingGate | 이유 |
|---------|----------------|------|
| `/sports-hub` | ❌ | 허브 페이지 (탐색) |
| `/home` | ❌ | 홈 페이지 |
| `/sports/:type` | ❌ | 종목별 허브 |
| `/sports/:type/team` | ✅ | 팀 관리 페이지 |
| `/sports/:type/team/*` | ✅ | 팀 관리 하위 페이지 |
| `/team/create` | ❌ | 팀 생성 페이지 |
| `/teams/search` | ❌ | 팀 검색 페이지 |
| `/team/:teamId` | ✅ | 팀 상세 (팀 멤버 필요) |
| `/teams/:teamId` | ✅ | 팀 상세 (팀 멤버 필요) |
| `/teams/:teamSlug/blog` | ❌ | 공개 블로그 |
| `/invite/:code` | ❌ | 초대 링크 (가입 중) |

## 🚀 다음 단계

1. ✅ 온보딩 게이트 안정화 완료
2. 🔄 다음 우선순위 선택:
   - 멀티 팀 / 멀티 플랜 전략
   - 허브에서 여러 팀 선택 UX
   - 플랜(free/pro)별 접근 제어
   - 팀 전환 속도 최적화

---

**검증 완료 시**: 모든 체크리스트 항목이 통과되면 이 단계 완성 ✅
