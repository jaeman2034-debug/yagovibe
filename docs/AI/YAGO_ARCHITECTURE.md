# YAGO 아키텍처

**생성일**: 2025-01-27  
**현재 상태**: 레거시 구조 → 목표 구조로 전환 중

---

## 현재 아키텍처 요약

### 현재 폴더 구조
```
src/
├── pages/              # 페이지 컴포넌트 (혼재)
├── components/         # 공통 컴포넌트 (혼재)
├── features/           # 일부 기능 모듈 (부분적)
├── hooks/              # 커스텀 훅
├── services/           # 일부 서비스 (부분적)
├── lib/                # 유틸리티 및 Firebase 설정
├── context/            # React Context
├── layout/             # 레이아웃 컴포넌트
└── types/              # TypeScript 타입 정의
```

### 현재 문제점
1. **명확한 계층 구조 부재**
   - `pages/`, `components/`, `features/` 혼재
   - 도메인별 그룹화 불명확

2. **서비스 레이어 부재**
   - Firebase 호출이 컴포넌트에 직접 분산
   - 비즈니스 로직과 UI 로직 혼재

3. **재사용성 낮음**
   - 컴포넌트 간 의존성 복잡
   - 공통 로직 추출 어려움

4. **테스트 어려움**
   - 컴포넌트와 로직 결합
   - Mock 어려움

---

## 목표 아키텍처

### Feature-Based Architecture (도메인 중심)

```
src/
├── app/                    # 앱 설정 및 진입점
│   ├── providers/         # React Context Providers
│   ├── router/            # 라우팅 설정
│   └── layouts/           # 전역 레이아웃
│
├── core/                   # 핵심 인프라 (도메인 독립적)
│   ├── firebase/          # Firebase 초기화 및 설정
│   ├── auth/              # 인증 관련 핵심 로직
│   ├── map/               # 지도 관련 핵심 로직
│   └── config/            # 앱 설정
│
├── features/               # 기능 모듈 (도메인별)
│   ├── chat/              # 채팅 기능
│   │   ├── components/    # 채팅 전용 컴포넌트
│   │   ├── hooks/         # 채팅 전용 훅
│   │   ├── services/      # 채팅 서비스 레이어
│   │   ├── types/         # 채팅 타입 정의
│   │   └── pages/         # 채팅 페이지
│   │
│   ├── market/            # 마켓 기능
│   ├── team/              # 팀 관리 기능
│   ├── activity/          # 활동 피드 기능
│   └── map/               # 지도 기능
│
└── shared/                 # 공유 리소스 (도메인 독립적)
    ├── components/        # 공통 UI 컴포넌트
    ├── hooks/             # 공통 훅
    ├── utils/             # 유틸리티 함수
    ├── types/             # 공통 타입
    └── constants/         # 상수
```

---

## 계층별 역할

### 1. `src/app/` - 앱 설정
**역할**: 앱 전역 설정 및 진입점

```
app/
├── providers/         # React Context Providers
│   ├── AuthProvider.tsx
│   ├── TeamProvider.tsx
│   └── ...
├── router/            # 라우팅 설정
│   ├── routes.tsx
│   └── guards.tsx
└── layouts/           # 전역 레이아웃
    ├── AppShellLayout.tsx
    └── MainLayout.tsx
```

**원칙**:
- 도메인 로직 없음
- 앱 전역 설정만 포함
- 재사용 가능한 레이아웃

---

### 2. `src/core/` - 핵심 인프라
**역할**: 도메인 독립적인 핵심 인프라

```
core/
├── firebase/          # Firebase 초기화
│   ├── config.ts
│   ├── firestore.ts
│   └── storage.ts
├── auth/              # 인증 핵심 로직
│   ├── authService.ts
│   └── authTypes.ts
├── map/               # 지도 핵심 로직
│   ├── mapService.ts
│   └── mapTypes.ts
└── config/            # 앱 설정
    └── env.ts
```

**원칙**:
- 도메인 독립적
- 다른 도메인에서 재사용 가능
- 외부 서비스 연동만 포함

---

### 3. `src/features/` - 기능 모듈
**역할**: 도메인별 기능 모듈 (독립적)

```
features/
└── chat/               # 채팅 기능 모듈
    ├── components/     # 채팅 전용 컴포넌트
    │   ├── ChatHeader.tsx
    │   ├── MessageList.tsx
    │   ├── MessageBubble.tsx
    │   └── ChatInput.tsx
    │
    ├── hooks/          # 채팅 전용 훅
    │   ├── useChatMessages.ts
    │   ├── useChatRoom.ts
    │   └── useChatSend.ts
    │
    ├── services/       # 채팅 서비스 레이어
    │   ├── chatService.ts      # Firebase 호출
    │   ├── messageService.ts
    │   └── roomService.ts
    │
    ├── types/          # 채팅 타입 정의
    │   ├── chat.types.ts
    │   └── message.types.ts
    │
    └── pages/          # 채팅 페이지
        ├── ChatPage.tsx
        └── ChatListPage.tsx
```

**원칙**:
- 각 feature는 독립적
- 다른 feature에 직접 의존하지 않음
- 공통 기능은 `shared/` 사용

---

### 4. `src/shared/` - 공유 리소스
**역할**: 도메인 독립적인 공유 리소스

```
shared/
├── components/        # 공통 UI 컴포넌트
│   ├── Button.tsx
│   ├── Input.tsx
│   └── Modal.tsx
├── hooks/             # 공통 훅
│   ├── useDebounce.ts
│   └── useLocalStorage.ts
├── utils/             # 유틸리티 함수
│   ├── format.ts
│   └── validation.ts
├── types/             # 공통 타입
│   └── common.types.ts
└── constants/         # 상수
    └── routes.ts
```

**원칙**:
- 도메인 독립적
- 모든 feature에서 사용 가능
- 범용적 기능만 포함

---

## 마이그레이션 전략

### Phase 1: 폴더 구조 생성 (현재)
- 목표 폴더 구조 생성
- 기존 파일은 아직 이동하지 않음

### Phase 2: ChatPage 분리 (진행 예정)
- ChatPage.tsx에서 UI 컴포넌트 추출
- `features/chat/components/`로 이동
- 점진적으로 훅, 서비스 추출

### Phase 3: 서비스 레이어 구축
- Firebase 호출을 서비스 레이어로 이동
- `features/*/services/` 생성

### Phase 4: 나머지 도메인 마이그레이션
- Market, Team, Activity, Map 순서로 마이그레이션
- 각 도메인별로 독립적으로 진행

---

## 의존성 규칙

### 허용되는 의존성
```
features/* → shared/
features/* → core/
app/* → features/*
app/* → shared/
app/* → core/
```

### 금지되는 의존성
```
features/chat → features/market  ❌
features/market → features/chat  ❌
core/* → features/*              ❌
shared/* → features/*            ❌
```

### 공통 기능이 필요한 경우
- `shared/`로 이동
- 또는 `core/`로 이동 (인프라 레벨인 경우)

---

## 파일 네이밍 규칙

### 컴포넌트
- PascalCase: `ChatHeader.tsx`, `MessageBubble.tsx`
- 기능명 포함: `ChatHeader`, `MarketCard`

### 훅
- `use` 접두사: `useChatMessages.ts`, `useMarketQuery.ts`
- 기능명 포함: `useChat*`, `useMarket*`

### 서비스
- `Service` 접미사: `chatService.ts`, `marketService.ts`
- 소문자 시작: `chatService`, `marketService`

### 타입
- `types.ts` 또는 `*.types.ts`: `chat.types.ts`
- 또는 도메인명 포함: `ChatTypes.ts`

---

## 참고 문서

- [YAGO_PROJECT_CONTEXT.md](./YAGO_PROJECT_CONTEXT.md) - 프로젝트 컨텍스트
- [YAGO_ROADMAP.md](./YAGO_ROADMAP.md) - 리팩토링 로드맵
