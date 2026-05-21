# 🔥 팀장 페이지 첫 화면 구성 완료

**생성일**: 2025-01-27  
**목적**: 팀장 페이지를 "다음 행동 추천 엔진"으로 재구성  
**상태**: ✅ 완료

---

## ✅ 완료된 개선 사항

### 핵심 변경: "지금 해야 할 것" 블록

**변경 전**:
- 우선순위에 따라 하나의 액션만 표시
- 사용자가 다음 행동을 고민해야 함

**변경 후**:
- 모든 필요한 액션을 한 번에 표시
- 상태 기반으로 필요한 항목만 표시
- 각 항목이 명확한 다음 행동 제시

---

## 🎯 최종 구조

### 1️⃣ 상단: 팀 상태 요약 (항상 보임)

```tsx
<Card>
  <h2>{team.name}</h2>
  <p>{team.region}</p>
  <Badge>{team.associationId ? '협회 소속' : '비회원 팀'}</Badge>
  <div>팀원 수: {memberCount}명</div>
</Card>
```

---

### 2️⃣ 🔥 핵심 블록: "지금 해야 할 것"

**표시 조건**:
- 가입 요청이 있으면 → 가입 요청 항목 표시
- 팀원이 1명 이하이면 → 팀원 초대 항목 표시
- 비회원팀이면 → 협회 가입 항목 표시
- 협회 가입 승인 대기 중이면 → 승인 대기 항목 표시

**각 항목 구조**:
```tsx
<ActionItem>
  <Icon />
  <Title>가입 요청 {count}건</Title>
  <Description>승인 대기 중인 요청이 있어요</Description>
  <ArrowRight />
</ActionItem>
```

**클릭 동작**:
- 가입 요청 → `/me/team/:teamId/manage?tab=requests`
- 팀원 초대 → `/me/team/:teamId/invite`
- 협회 가입 → `/associations/assoc-nowon-football/apply?teamId=${teamId}`

---

### 3️⃣ 팀 관리 메뉴 (항상 접근 가능)

```tsx
<Card>
  <h3>팀 관리</h3>
  <MenuGrid>
    <MenuItem icon={UserPlus} label="가입 요청 관리" />
    <MenuItem icon={Users} label="팀원 관리" />
    <MenuItem icon={Settings} label="팀 정보 수정" />
  </MenuGrid>
</Card>
```

---

## 🎯 UX 원칙

### 1. "관리 화면"이 아니라 "다음 행동 추천 엔진"

**이전**:
- 메뉴 나열
- 설정 화면 느낌
- 사용자가 무엇을 해야 할지 고민

**현재**:
- 상태 → 행동 → 관리 흐름
- 팀장이 들어오자마자 해야 할 일을 바로 확인
- 클릭 한 번으로 해결

---

### 2. 상태 기반 블록 렌더링

**핵심**:
- 필요한 항목만 표시
- 우선순위는 시각적 강조로 표현 (가입 요청이 가장 위)
- 모든 항목이 동시에 보이므로 선택의 자유 제공

---

### 3. 명확한 다음 행동 제시

**각 항목**:
- 제목: 무엇을 해야 하는지
- 설명: 왜 해야 하는지
- 클릭: 바로 해결할 수 있는 링크

---

## 📋 표시 로직

### 조건별 표시

```typescript
// 가입 요청
hasJoinRequests && (
  <ActionItem>가입 요청 {joinRequestCount}건</ActionItem>
)

// 팀원 초대
memberCount <= 1 && (
  <ActionItem>팀원 초대하기</ActionItem>
)

// 협회 가입
!hasAssociation && !isPending && (
  <ActionItem>협회에 가입하기</ActionItem>
)

// 승인 대기
isPending && (
  <InfoItem>협회 가입 승인 대기 중</InfoItem>
)
```

---

## ✅ 결과

### 해결된 문제
1. ✅ 팀장이 "뭐부터?" 고민할 필요 없음
2. ✅ 모든 필요한 액션이 한 번에 보임
3. ✅ 클릭 한 번으로 다음 행동 실행
4. ✅ 상태 기반으로 필요한 항목만 표시

### 개선된 UX
- **3초 안에 다음 행동 선택** 가능
- **명확한 우선순위** 시각화
- **막다른 골목 없음** (모든 항목이 해결 가능)

---

## 🔍 관련 파일

- `src/pages/team/TeamManageDashboard.tsx` - 팀장 대시보드
- `src/pages/team/TeamManagePage.tsx` - 팀 관리 페이지 라우터
- `src/pages/team/tabs/JoinRequestsTab.tsx` - 가입 요청 탭
- `src/pages/team/tabs/MembersTab.tsx` - 팀원 관리 탭
- `src/pages/team/tabs/SettingsTab.tsx` - 설정 탭

---

**작성일**: 2025-01-27  
**상태**: ✅ 완료  
**결과**: 팀장 페이지가 "다음 행동 추천 엔진"으로 완성됨
