# 🔥 Activity Session 생명주기 설계

## 📋 개요

YAGO VIBE의 Activity Session은 사용자의 실시간 운동 상태를 나타내는 핵심 데이터 구조입니다.

---

## 🔄 상태 흐름도

```
IDLE → CREATING → ACTIVE → ENDING → IDLE
                    ↓
                 ENDED (히스토리)
```

### 상태 설명

- **IDLE**: 활동 없음 (기본 상태)
- **CREATING**: 세션 생성 중 (위치 확보, Geocoding 등)
- **ACTIVE**: 활동 중 (ActiveSessionCard 표시)
- **ENDING**: 세션 종료 중 (Firestore 업데이트)
- **ENDED**: 종료됨 (히스토리로 이동)

---

## 🏗️ 아키텍처 구조

### 1. 데이터 계층

#### Firestore 컬렉션

```
sessions/{sessionId}
├─ uid: string (사용자 ID)
├─ sport: string (스포츠 종목)
├─ status: "active" | "ended"
├─ location: { lat, lng, dong, gu, si }
├─ startedAt: Timestamp
├─ endedAt?: Timestamp
├─ participants: string[]
└─ visibilityRadius: number

activityFeed/{feedId}
├─ uid: string
├─ sessionId: string
├─ type: "sport_start"
├─ sport: string
├─ dong: string
├─ location: { lat, lng }
└─ status: "active" | "ended"

users/{userId}
├─ currentSessionId?: string | null
├─ status: "idle" | "active"
└─ lastDong?: string
```

### 2. 서비스 계층

#### `startActivity` (Presence Engine Entry Point)
- 위치 확보
- Geocoding (행정동 변환)
- 세션 생성
- Firestore 저장 (sessions, activityFeed)
- 사용자 상태 업데이트

#### `endActivitySession`
- 세션 상태 → "ended"
- ActivityFeed 업데이트
- users.currentSessionId → null

### 3. 훅 계층

#### `useActivitySession`
- 세션 생성/종료 함수 제공
- 로컬 상태 관리 (state, currentSession, isLoading, error)
- `startActivity` 엔진 호출
- `endActivitySession` 호출

#### `useCurrentSession`
- 실시간 세션 구독
- `users/{userId}` 구독 → `currentSessionId` 추적
- `sessions/{sessionId}` 구독 → 세션 데이터 실시간 반영
- `status !== "active"` → null 반환 (자동 필터링)

### 4. UI 계층

#### `HubHome`
- `useCurrentSession`으로 세션 구독
- 세션 있음 → `ActiveSessionCard` 표시
- 세션 없음 → `HubQuestion` 표시

#### `ActiveSessionCard`
- 세션 정보 표시 (스포츠, 위치, 경과 시간)
- 액션 버튼 (팀 찾기, 장소 보기, 종료)
- 실시간 타이머 (1초 단위)

---

## 🔄 실시간 동기화 흐름

### 세션 생성 시

```
1. startActivity() 호출
   ↓
2. Firestore에 sessions/{id} 생성
   ↓
3. users/{userId}.currentSessionId 업데이트
   ↓
4. useCurrentSession이 users 구독으로 currentSessionId 변경 감지
   ↓
5. sessions/{id} 구독 시작
   ↓
6. ActiveSessionCard 자동 렌더링
```

### 세션 종료 시

```
1. endActivity() 호출
   ↓
2. sessions/{id}.status → "ended"
   ↓
3. users/{userId}.currentSessionId → null
   ↓
4. useCurrentSession이 status !== "active" 감지
   ↓
5. session → null 반환
   ↓
6. ActiveSessionCard 자동 제거
   ↓
7. HubQuestion 자동 표시
```

---

## 🎯 핵심 설계 원칙

### 1. 단일 소스 원칙
- 상태는 UI가 소유
- Hook은 동작만 제공
- Firestore는 단일 진실 소스 (Single Source of Truth)

### 2. 실시간 동기화
- `onSnapshot`으로 실시간 구독
- 상태 변경 즉시 UI 반영
- 자동 필터링 (active만 표시)

### 3. 자동 상태 전환
- 세션 종료 시 자동으로 IDLE 복귀
- UI는 상태에 따라 자동 렌더링
- 사용자 개입 최소화

---

## 🔧 구현 세부사항

### useCurrentSession 개선점

현재 구조는 이미 실시간 구독이 구현되어 있지만, 다음 개선이 가능합니다:

1. **에러 처리 강화**: 네트워크 오류 시 재시도 로직
2. **로딩 상태 세분화**: 초기 로딩 vs 업데이트 로딩
3. **캐싱**: 불필요한 재구독 방지

### 세션 종료 흐름

현재 `endActivitySession`은 다음을 수행합니다:

1. ✅ 세션 상태 업데이트 (active → ended)
2. ✅ ActivityFeed 업데이트
3. ✅ users.currentSessionId 제거

**추가 가능한 기능:**
- 히스토리 저장 (별도 컬렉션)
- 통계 업데이트 (총 운동 시간 등)
- 알림 전송 (참여자에게)

---

## 📊 데이터 흐름 다이어그램

```
[User Action]
    ↓
[useActivitySession.startActivity()]
    ↓
[startActivity Engine]
    ↓
[Firestore Write]
    ├─ sessions/{id} 생성
    ├─ activityFeed/{id} 생성
    └─ users/{uid} 업데이트
    ↓
[useCurrentSession 구독]
    ├─ users/{uid} 변경 감지
    └─ sessions/{id} 구독 시작
    ↓
[UI 업데이트]
    └─ ActiveSessionCard 렌더링
```

---

## 🚀 다음 단계

1. ✅ 세션 생성 완료
2. ✅ 실시간 구독 완료
3. ✅ ActiveSessionCard 표시 완료
4. ⏳ 세션 종료 흐름 테스트
5. ⏳ 히스토리 저장 구조 설계
6. ⏳ 통계 집계 기능

---

## 📝 참고사항

- Firestore Rules는 `uid` 필드를 사용 (Firebase 표준)
- `serverTimestamp()`는 Rules에서 `timestamp` 타입으로 검증
- `cleanFirestoreData`로 `undefined` 필드 자동 제거
- 세션 종료 시 `status !== "active"`로 자동 필터링
