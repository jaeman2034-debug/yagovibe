# 🔥 /me 페이지 리팩토링 체크리스트 (STEP 11)

## 목표

지금까지 만든 Persona + /me 설계를 실제 코드에 안전하게 이식하고, 다시는 같은 문제가 안 터지게 만든다.

---

## 1️⃣ /me 리팩토링 순서 (이 순서 절대 바꾸지 마라)

### ✅ ① 데이터 훅부터 고친다 (UI ❌)

**우선순위: 최우선**

#### 수정 대상 훅
- [ ] `useMyTeams`
- [ ] `useMyTournamentApplications`
- [ ] `useMyProfile` (필요 시)

#### 체크리스트
- [ ] `enabled: !!userId` 패턴 적용
- [ ] `try/catch` 내부에서 `[] | null` 반환
- [ ] `throw` ❌ (절대 사용 금지)
- [ ] `undefined` ❌ (절대 반환 금지)
- [ ] 에러 시에도 빈 배열/기본값 반환
- [ ] 권한 오류는 정상 상태로 처리 (빈 배열)

**👉 이게 안 되면 UI 아무리 잘 짜도 다시 터진다**

#### 예시 코드
```typescript
// ✅ 올바른 패턴
export function useMyTeams() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const enabled = !!user?.uid;
    
    if (!enabled) {
      setTeamMembers([]);
      setLoading(false);
      return;
    }

    try {
      // 쿼리 실행
      const result = await fetchTeams(user.uid);
      setTeamMembers(Array.isArray(result) ? result : []);
    } catch (err) {
      console.warn("[useMyTeams] 조회 실패 (정상 상태로 처리):", err);
      setTeamMembers([]); // 빈 배열 = 정상 상태
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  return {
    teamMembers: Array.isArray(teamMembers) ? teamMembers : [],
    loading: typeof loading === 'boolean' ? loading : false,
  };
}
```

---

### ✅ ② resolvePersona 파일 분리

**우선순위: 높음**

#### 체크리스트
- [ ] `/me/resolvePersona.ts` 단일 파일 존재
- [ ] UI, 훅에서 persona 계산 ❌ (resolvePersona만 사용)
- [ ] persona 계산이 한 군데만 있음
- [ ] boolean / number만 입력값 (에러, undefined 없음)

#### 예시 코드
```typescript
// ✅ 올바른 패턴
import { resolvePersona } from "./resolvePersona";

const finalPersona = resolvePersona({
  isLoggedIn: !!user,
  hasProfile: personaData.profileComplete,
  teamCount: personaData.teamCount,
  applicationCount: personaData.applicationCount,
  role: personaData.isAssociationAdmin ? "ADMIN" : "USER",
});
```

---

### ✅ ③ /me에서 조건문 제거

**우선순위: 높음**

#### 삭제해야 할 조건문
- [ ] `if (applications.length === 0) { return <EmptyState />; }`
- [ ] `if (error) { return <ErrorCard />; }`
- [ ] `if (!data) return null;`
- [ ] `if (items.length === 0) { return <EmptyState />; }`

#### 남아도 되는 조건문
- [ ] `if (!user) return <LoginGuide />;` (로그인 체크만)
- [ ] `if (loading) return <MeSkeleton />;` (로딩만)

#### 체크리스트
- [ ] PersonaSection에서 조건문 없음
- [ ] OpportunitySection에서 조건문 없음
- [ ] 모든 분기는 resolvePersona로 처리

---

### ✅ ④ PersonaSection / OpportunitySection 분리

**우선순위: 중간**

#### 체크리스트
- [ ] PersonaSection에 Button 없음
- [ ] OpportunitySection에 Button 1개 이하
- [ ] 메인 메시지 → PersonaSection
- [ ] 버튼 → OpportunitySection

#### 구조 확인
```typescript
// ✅ 올바른 구조
<MePage>
  <IdentityHeader />
  <PersonaSection persona={persona} />  {/* 메시지만 */}
  <OpportunitySection persona={persona} />  {/* 버튼만 */}
</MePage>
```

---

## 2️⃣ 지금 코드에서 반드시 삭제해야 할 냄새 코드

아래 있으면 미완성 설계다.

### ❌ 삭제 대상

```typescript
// ❌ 삭제 1: 에러 분기
if (error) {
  return <ErrorCard />;
}

// ❌ 삭제 2: null 반환
if (!data) return null;

// ❌ 삭제 3: Empty State
if (items.length === 0) {
  return <EmptyState />;
}

// ❌ 삭제 4: undefined 체크
if (applications === undefined) {
  return <Loading />;
}

// ❌ 삭제 5: 조건부 렌더링 남발
{applications && applications.length > 0 && (
  <ApplicationList />
)}
```

### ✅ 올바른 패턴

```typescript
// ✅ 올바른 패턴: 항상 렌더링
<PersonaSection persona={persona}>
  <ApplicationList applications={applications} />  {/* 빈 배열도 OK */}
</PersonaSection>
```

**👉 전부 Persona 설계 이전 사고방식이다.**

---

## 3️⃣ "신규 / 개인 체육인" QA 테스트 시나리오 (필수)

이 6가지는 직접 눈으로 확인해야 한다.

### 🧪 테스트 계정: 팀 ❌ / 대회 ❌ / 관리자 ❌

#### 체크리스트
- [ ] `/me` 진입 시 에러 없음
- [ ] "아직 없습니다" 문구 없음
- [ ] 카드 4개 항상 보임 (P1)
  - [ ] MySportProfileCard (info)
  - [ ] PersonalSummaryCard (summary)
  - [ ] RecommendedContentCard (info)
  - [ ] ActivityHintCard (hint)
- [ ] 팀 만들기 버튼은 하단에만 있음 (OpportunitySection)
- [ ] 새로고침 / 시크릿 모드 정상
- [ ] 콘솔 에러 0개

**👉 이게 통과되면 구조 성공**

### 테스트 절차

1. **신규 계정 생성**
   ```bash
   # 시크릿 모드에서 새 계정으로 가입
   ```

2. **/me 페이지 진입**
   ```bash
   # 직접 /me로 이동
   # 또는 네비게이션에서 "마이페이지" 클릭
   ```

3. **화면 확인**
   - [ ] IdentityHeader 표시됨
   - [ ] PersonaSection에 카드 4개 표시됨
   - [ ] OpportunitySection에 버튼 1개 표시됨
   - [ ] "없음", "에러" 문구 없음

4. **콘솔 확인**
   - [ ] 에러 0개
   - [ ] 경고 최소화

5. **새로고침 테스트**
   - [ ] F5 눌러도 동일하게 표시
   - [ ] 시크릿 모드에서도 동일

---

## 4️⃣ 이 설계를 다른 페이지로 확산하는 공식

모든 페이지는 이제 이 공식으로 간다

```
[로그인]
   ↓
[Persona 판단]
   ↓
[정체성 UI]
   ↓
[선택적 행동]
```

### 예시

#### 팀 페이지
```
Persona: "팀 없는 개인 체육인"
  ↓
PersonaSection: 팀 정보 없음 = 정상 (P1)
  ↓
OpportunitySection: "팀 만들기" 버튼
```

#### 대회 페이지
```
Persona: "참가 안 해도 정보 소비자"
  ↓
PersonaSection: 대회 정보 표시 (참가 여부 무관)
  ↓
OpportunitySection: "참가 신청" 버튼 (조건부)
```

**👉 /me만의 설계가 아니다**
**👉 플랫폼 설계 방식이 바뀐 것**

---

## 5️⃣ 최종 체크리스트 (배포 전)

### 데이터 훅
- [ ] 모든 훅이 안전 기본값 반환
- [ ] 에러 시에도 빈 배열/null 반환
- [ ] `enabled` 패턴 적용

### Persona 판별
- [ ] `resolvePersona` 단일 파일 사용
- [ ] UI에서 persona 계산 없음
- [ ] 정규화된 입력값만 사용

### UI 구조
- [ ] PersonaSection에 Button 없음
- [ ] OpportunitySection에 Button만
- [ ] 조건문 최소화

### 테스트
- [ ] 신규 유저 테스트 통과
- [ ] 개인 체육인 테스트 통과
- [ ] 콘솔 에러 0개

---

## 6️⃣ 리팩토링 순서 요약

```
1. 데이터 훅 수정 (useMyTeams, useMyTournamentApplications)
   ↓
2. resolvePersona 파일 분리
   ↓
3. /me에서 조건문 제거
   ↓
4. PersonaSection / OpportunitySection 분리
   ↓
5. QA 테스트 (신규 유저 시나리오)
   ↓
6. 배포
```

**👉 이 순서 절대 바꾸지 마라**

---

## 7️⃣ 핵심 원칙 요약

**"버그를 고친 게 아니라 사고방식을 리팩토링했다."**

- ❌ "없음" = 에러
- ✅ "없음" = 정상 상태 (P0, P1)

- ❌ 조건문으로 분기
- ✅ Persona로 분기

- ❌ 에러 처리
- ✅ 정상 상태 처리

---

## 8️⃣ 문제 발생 시 체크리스트

### 에러가 발생하면

1. **데이터 훅 확인**
   - [ ] `enabled` 패턴 적용되었는가?
   - [ ] 에러 시 빈 배열 반환하는가?
   - [ ] `undefined` 반환하지 않는가?

2. **Persona 판별 확인**
   - [ ] `resolvePersona` 사용하는가?
   - [ ] 정규화된 입력값인가?

3. **UI 구조 확인**
   - [ ] PersonaSection에 Button 없는가?
   - [ ] 조건문이 최소화되었는가?

4. **콘솔 확인**
   - [ ] 어떤 에러인가?
   - [ ] 어느 단계에서 발생하는가?

---

## 9️⃣ 다음 단계

리팩토링 완료 후:

1. **다른 페이지 확산**
   - 팀 페이지
   - 대회 페이지

2. **디자인 시스템 확장**
   - MeCard variant 확장
   - 다른 페이지용 Card variant

3. **문서화**
   - 기획/디자이너 공유용 요약본
   - 개발자 온보딩 가이드
