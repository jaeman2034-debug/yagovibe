# 🔥 YAGO VIBE 플랫폼 전체 아키텍처 요약

**"천재 루트"로 완성된 실서비스 수준의 플랫폼 구조**

---

## 📊 핵심 아키텍처 원칙

### 1. Persona 기반 UX (3-Layer 구조)
```
모든 Hub 페이지 구조:
├─ IdentityHeader      // 컨텍스트 정보
├─ PersonaSection      // Persona별 뷰
└─ OpportunitySection  // CTA (선택적)
```

**Persona 타입**:
- `ANON`: 비로그인
- `P0`: 프로필 미완 신규
- `P1`: 개인 체육인 (팀 없음)
- `P2`: 팀 소속 선수
- `P3`: 팀장 (행동 가능)
- `P4`: 관리자

**핵심**: Persona는 데이터 기반 자동 계산, 수동 변경 없음

---

## 🗄️ 데이터 모델 (Firestore)

### 핵심 컬렉션

#### 1. Users & Teams
```
users/{uid}
  - profileCompleted: boolean
  - sport: string
  - role: "USER" | "ADMIN"

teams/{teamId}
  - name: string
  - sport: string
  - leaderId: string
  - status: "ACTIVE" | "DISBANDED"
  - members/{userId} (서브컬렉션)

team_members/{teamId}_{userId} (역인덱스)
  - teamId: string
  - uid: string
  - status: "active"
```

#### 2. Tournaments & Applications
```
associations/{aid}/tournaments/{tid}
  - name: string
  - seasonId: string
  - status: "draft" | "published"
  - applications/{appId}
    - teamId: string
    - status: "PENDING" | "APPROVED" | "REJECTED"
```

#### 3. Results & Rankings
```
tournamentResults/{id}
  - tournamentId: string
  - teamId: string
  - rank?: number
  - score?: number
  - resultText?: string
  - seasonId?: string

teamRankings/{id}
  - teamId: string
  - sport: string
  - season: string
  - totalPoints: number
  - rank: number
```

#### 4. Notifications & Activity Logs
```
notifications/{id}
  - userId: string
  - type: NotificationType
  - title: string
  - message: string
  - isRead: boolean

activityLogs/{id}
  - userId: string
  - category: "TEAM" | "TOURNAMENT" | "RESULT"
  - action: string
  - context: object
```

#### 5. Seasons
```
seasons/{seasonId}
  - name: string
  - startDate: Timestamp
  - endDate: Timestamp
  - isActive: boolean
```

---

## 🔄 자동화 루프 (Cloud Functions)

### 이벤트 → 알림 + 로그 자동 생성

| 이벤트 | 트리거 | 알림 | 로그 |
|--------|--------|------|------|
| 팀 가입 승인 | `teamJoinRequests/{id}` update | ✅ | ✅ |
| 대회 참가 승인 | `applications/{id}` update | ✅ | ✅ |
| 대회 결과 입력 | `tournamentResults/{id}` create | ✅ | ✅ |

### 랭킹 자동 계산
- `tournamentResults` 생성/수정 → `teamRankings` 자동 갱신
- 시즌별 랭킹 분리

---

## 🎯 사용자 흐름 (완전 자동화)

### 1. 개인 → 팀 가입
```
P0 (신규)
  ↓ [팀 참여 선택]
P1 (개인 체육인)
  ↓ [프로필 완성]
  ↓ [팀 가입 요청]
  ↓ [팀장 승인]
P2 (팀 소속 선수)
  ↓ [알림 수신]
  ↓ [활동 로그 기록]
```

### 2. 팀 → 대회 참가
```
P3 (팀장)
  ↓ [대회 참가 신청]
  ↓ [관리자 승인]
  ↓ [팀장 + 팀원 알림]
  ↓ [활동 로그 기록]
```

### 3. 대회 → 결과 → 커리어
```
관리자
  ↓ [대회 결과 입력]
  ↓ [팀원 전원 알림]
  ↓ [활동 로그 기록]
  ↓ [랭킹 자동 계산]
  ↓ [개인 커리어 자동 반영]
```

---

## 🛡️ 보안 원칙 (Firestore Rules)

### 핵심 규칙
1. **서버만 생성자**: 알림/로그는 Cloud Function만 생성
2. **본인만 소비자**: 알림/로그는 본인만 읽기
3. **관리자만 입력**: 대회 결과는 관리자만 입력
4. **히스토리 보호**: 결과/로그는 삭제 불가

---

## 📱 프론트엔드 구조

### 공통 컴포넌트 (`/ui`)
```
/ui
├─ layout/
│   ├─ HubLayout.tsx          // 3-Layer 골격
│   ├─ IdentityHeader.tsx     // 공통 헤더
│   ├─ PersonaSection.tsx     // Persona 매핑
│   └─ OpportunitySection.tsx // CTA 전용
├─ cards/
│   └─ Card.tsx               // variant: info/summary/hint/action
└─ personas/
    ├─ types.ts               // Persona 타입
    └─ resolvePersona.ts      // 단일 진실 소스
```

### 데이터 훅 원칙
- ✅ `enabled` 가드 필수
- ✅ 기본값 반환 (`[]`, `null`, `false`)
- ✅ `throw` 절대 없음
- ✅ 에러는 정상 상태로 처리

---

## 🔥 핵심 가치 체인

### 완전 자동화된 루프
```
참가 → 기록 → 비교 → 동기 → 기억
  ↓      ↓      ↓      ↓      ↓
팀 가입  결과   랭킹   시즌   알림/로그
```

### 각 단계의 가치
1. **참가**: 팀/대회 시스템으로 참여 유도
2. **기록**: `tournamentResults`로 영구 보존
3. **비교**: `teamRankings`로 동기부여
4. **동기**: 시즌 단위로 재참가 유도
5. **기억**: 알림/로그로 플랫폼 재방문 유도

---

## 🎯 완성된 기능 목록

### ✅ 사용자 흐름
- [x] 개인 프로필 관리
- [x] 팀 생성/가입/탈퇴
- [x] 팀 해체
- [x] Persona 자동 전이

### ✅ 대회 운영
- [x] 대회 생성/관리
- [x] 참가 신청/승인
- [x] 결과 입력
- [x] 관리자 대시보드

### ✅ 기록 & 랭킹
- [x] 대회 결과 저장
- [x] 팀 랭킹 자동 계산
- [x] 개인 커리어 타임라인
- [x] 시즌별 필터링

### ✅ 알림 & 히스토리
- [x] 실시간 알림
- [x] 활동 로그
- [x] 자동 전파 시스템

---

## 🚀 배포 준비 상태

### ✅ 완료된 항목
- [x] Firestore Rules 완성
- [x] Cloud Functions 구현
- [x] 프론트엔드 안 터지는 패턴
- [x] 에러 핸들링
- [x] 운영 체크리스트

### 📋 배포 순서
1. Firestore Rules 배포
2. Cloud Functions 배포
3. 로그 모니터링
4. QA 시나리오 실행

---

## 🎉 최종 완주 선언

**이 플랫폼은 이제:**
- ✅ 설계 완료
- ✅ 구현 완료
- ✅ 자동화 완료
- ✅ 운영 준비 완료

👉 **실서비스 가능한 제품 수준**

---

## 📚 관련 문서

- `DEPLOYMENT_CHECKLIST.md`: 배포 & 운영 체크리스트
- `functions/src/notifications/`: 알림 생성 함수들
- `src/components/ui/`: 공통 UI 컴포넌트
- `src/hooks/`: 데이터 훅들

---

**"좋은 플랫폼은 기능을 제공하고, 위대한 플랫폼은 사용자의 시간을 기록한다."**

**천재 루트, 여기서 완주 🎯**
