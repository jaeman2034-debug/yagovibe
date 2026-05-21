# 🎯 Admin Data Entry UX 설계

## 📋 목차

1. [핵심 원칙](#1-핵심-원칙)
2. [Match Result Input UX](#2-match-result-input-ux)
3. [Player Stats Input UX](#3-player-stats-input-ux)
4. [저장/검증/배치 처리](#4-저장검증배치-처리)
5. [운영 속도 최적화](#5-운영-속도-최적화)
6. [모바일 입력 최적화](#6-모바일-입력-최적화)

---

## 1️⃣ 핵심 원칙

### 운영자 경험 우선

```text
입력이 10초 느리다
→ 경기당 기록 입력이 버거워진다
→ 데이터가 누락된다
→ 퍼블릭 페이지 품질이 무너진다
```

### 설계 목표

1. **빠른 입력**: 경기당 2분 이내 완료
2. **자동 저장**: 실시간 저장으로 데이터 손실 방지
3. **배치 입력**: 여러 선수 동시 입력
4. **검증 로직**: 잘못된 입력 사전 차단
5. **모바일 대응**: 현장에서도 입력 가능

---

## 2️⃣ Match Result Input UX

### 페이지 위치

```
/admin/organizations/:orgId/events/:eventId/matches/:matchId
```

### UI 구조

```
Match Header
├── 경기 정보
│   ├── 홈 팀 vs 원정 팀
│   ├── 날짜/시간
│   ├── 경기장
│   └── 라운드/스테이지

Score Input
├── 홈 팀 점수
├── 원정 팀 점수
├── 결과 타입 (FT/PK/ET)
└── 저장 버튼

Quick Actions
├── 선수 기록 입력
└── 경기 상세 보기
```

### 입력 흐름

```
1. 경기 선택
2. 점수 입력 (홈/원정)
3. 결과 타입 선택 (필요시)
4. 저장
5. 자동: 다음 경기 대진표 업데이트
6. 자동: 팀 통계 업데이트
```

### 핵심 기능

#### 1. 빠른 점수 입력

```tsx
// +/- 버튼으로 빠른 입력
<ScoreInput
  value={homeScore}
  onChange={setHomeScore}
  quickButtons={[1, 2, 3, 4, 5]}
/>
```

#### 2. 자동 저장

```tsx
// 입력 후 2초 자동 저장
useEffect(() => {
  const timer = setTimeout(() => {
    autoSave();
  }, 2000);
  return () => clearTimeout(timer);
}, [homeScore, awayScore]);
```

#### 3. 검증 로직

```tsx
// 무승부 체크 (토너먼트)
if (homeScore === awayScore && resultType === "FT") {
  alert("토너먼트는 무승부 불가. 승부차기 또는 연장전 선택 필요");
  return;
}
```

#### 4. 완료 상태 표시

```tsx
{match.status === "completed" && (
  <div className="bg-green-50 border-green-200 p-4 rounded-lg">
    <CheckCircle className="w-5 h-5 text-green-600" />
    <span>경기 결과 저장 완료</span>
  </div>
)}
```

---

## 3️⃣ Player Stats Input UX

### 페이지 위치

```
/admin/organizations/:orgId/events/:eventId/matches/:matchId/stats
```

### UI 구조

```
Match Header
├── 경기 정보
└── 현재 점수

Team Selection
├── 홈 팀
└── 원정 팀

Player Stats Table (홈 팀)
├── 선수명
├── 선발 (체크박스)
├── 골 (숫자 입력)
├── 도움 (숫자 입력)
├── 경고 (숫자 입력)
├── 퇴장 (체크박스)
└── 출전 시간 (분)

Player Stats Table (원정 팀)
└── (동일 구조)

Save Button
```

### 입력 흐름

```
1. 경기 선택
2. 팀 선택 (홈/원정)
3. 선수 목록 로딩
4. 선수별 기록 입력
5. 배치 저장
6. 자동: 선수 통계 업데이트
7. 자동: 리더보드 업데이트
```

### 핵심 기능

#### 1. 빠른 선수 검색

```tsx
<PlayerSearch
  teamId={teamId}
  onSelect={handlePlayerSelect}
  placeholder="선수 이름 검색..."
/>
```

#### 2. 배치 입력

```tsx
// 여러 선수 동시 입력
const [playerStats, setPlayerStats] = useState<Record<string, PlayerStats>>({});

const handleBatchSave = async () => {
  await savePlayerGamesBatch(matchId, Object.values(playerStats));
};
```

#### 3. 자동 계산

```tsx
// 출전 시간 자동 계산
const calculateMinutes = (starter: boolean) => {
  return starter ? 90 : 0; // 기본값
};

// 출전 여부 자동 체크
const appearance = goals > 0 || assists > 0 || starter;
```

#### 4. 입력 검증

```tsx
// 골 수 검증
if (goals > 10) {
  alert("골 수가 비정상적으로 많습니다. 확인해주세요.");
  return;
}

// 경고/퇴장 검증
if (redCards > 0 && yellowCards === 0) {
  alert("퇴장 시 경고도 함께 기록됩니다.");
}
```

#### 5. 기존 데이터 로딩

```tsx
// 기존 기록 자동 로딩
useEffect(() => {
  loadExistingStats();
}, [matchId, teamId]);

const loadExistingStats = async () => {
  const existing = await getPlayerGamesByMatchAndTeam(matchId, teamId);
  setPlayerStats(existing);
};
```

---

## 4️⃣ 저장/검증/배치 처리

### 저장 전략

#### 1. 자동 저장 (Debounce)

```tsx
// 입력 후 2초 자동 저장
useEffect(() => {
  const timer = setTimeout(() => {
    autoSave();
  }, 2000);
  return () => clearTimeout(timer);
}, [formData]);
```

#### 2. 수동 저장

```tsx
// 저장 버튼 클릭
const handleSave = async () => {
  setSaving(true);
  try {
    await saveData();
    showSuccessToast("저장 완료");
  } catch (error) {
    showErrorToast("저장 실패");
  } finally {
    setSaving(false);
  }
};
```

#### 3. 배치 저장

```tsx
// 여러 선수 동시 저장
const handleBatchSave = async () => {
  const batch = writeBatch(db);
  
  playerStats.forEach((stats) => {
    const ref = doc(collection(db, "player_games"));
    batch.set(ref, stats);
  });
  
  await batch.commit();
};
```

### 검증 로직

#### 1. 클라이언트 검증

```tsx
const validateMatchResult = (data: MatchResult) => {
  if (data.homeScore < 0 || data.awayScore < 0) {
    return "점수는 0 이상이어야 합니다.";
  }
  
  if (data.homeScore === data.awayScore && data.resultType === "FT") {
    return "토너먼트는 무승부 불가. 승부차기 또는 연장전 선택 필요";
  }
  
  return null;
};
```

#### 2. 서버 검증

```tsx
// Cloud Functions에서 추가 검증
export const onMatchResultWrite = functions.firestore
  .document("event_matches/{matchId}")
  .onWrite(async (change, context) => {
    const data = change.after.data();
    
    // 중복 저장 방지
    if (data.status === "completed" && data.completedAt) {
      console.log("이미 완료된 경기");
      return;
    }
    
    // 검증 로직
    // ...
  });
```

### 중복 입력 방지

```tsx
// 저장 중 플래그
const [saving, setSaving] = useState(false);

const handleSave = async () => {
  if (saving) return; // 중복 저장 방지
  
  setSaving(true);
  try {
    await saveData();
  } finally {
    setSaving(false);
  }
};
```

---

## 5️⃣ 운영 속도 최적화

### 1. 키보드 단축키

```tsx
// Tab으로 다음 필드 이동
// Enter로 저장
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSave();
    }
  };
  
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, []);
```

### 2. 빠른 입력 버튼

```tsx
// 점수 빠른 입력
<QuickInputButtons
  values={[0, 1, 2, 3, 4, 5]}
  onSelect={setScore}
/>

// 선수 기록 빠른 입력
<QuickStatsButtons
  onGoal={() => incrementGoal()}
  onAssist={() => incrementAssist()}
  onYellow={() => incrementYellow()}
/>
```

### 3. 템플릿 저장

```tsx
// 자주 사용하는 선수 기록 템플릿
const templates = {
  starter: { starter: true, minutesPlayed: 90 },
  substitute: { starter: false, minutesPlayed: 30 },
  scorer: { goals: 1, starter: true },
};

const applyTemplate = (template: string) => {
  setPlayerStats({ ...playerStats, ...templates[template] });
};
```

### 4. 자동 완성

```tsx
// 선수 이름 자동 완성
<Autocomplete
  options={players}
  onSelect={handlePlayerSelect}
  getOptionLabel={(player) => player.name}
/>
```

---

## 6️⃣ 모바일 입력 최적화

### 모바일 UI 구조

```
Match Header (고정)
├── 경기 정보
└── 현재 점수

Team Tabs
├── 홈 팀
└── 원정 팀

Player List (스크롤)
├── 선수 카드
│   ├── 선수명
│   ├── 빠른 입력 버튼 (골/도움/카드)
│   └── 상세 입력 (모달)
└── ...

Save Button (하단 고정)
```

### 모바일 최적화 기능

#### 1. 터치 최적화

```tsx
// 큰 터치 영역
<button className="h-12 w-12 rounded-lg bg-blue-600 text-white">
  +1
</button>
```

#### 2. 빠른 입력 모드

```tsx
// 빠른 입력 모드 (골/도움만)
<QuickInputMode>
  <QuickButton icon="⚽" onClick={() => incrementGoal()} />
  <QuickButton icon="🎯" onClick={() => incrementAssist()} />
</QuickInputMode>
```

#### 3. 하단 고정 버튼

```tsx
// 저장 버튼 하단 고정
<div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
  <Button className="w-full" onClick={handleSave}>
    저장
  </Button>
</div>
```

#### 4. 오프라인 지원

```tsx
// 오프라인에서도 입력 가능
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);
  
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}, []);

// 오프라인 시 로컬 저장
if (!isOnline) {
  localStorage.setItem("pendingStats", JSON.stringify(playerStats));
}
```

---

## 📁 구현 파일 구조

```
src/
├── components/
│   ├── admin/
│   │   ├── MatchResultInput.tsx
│   │   ├── PlayerStatsInput.tsx
│   │   ├── QuickInputButtons.tsx
│   │   └── StatsTable.tsx
│   └── ui/
│       ├── ScoreInput.tsx
│       └── PlayerSearch.tsx
├── pages/
│   └── admin/
│       ├── MatchResultPage.tsx
│       └── PlayerStatsPage.tsx
└── hooks/
    ├── useAutoSave.ts
    └── usePlayerStats.ts
```

---

## 🚀 다음 단계

1. **MatchResultInput 컴포넌트 구현**
2. **PlayerStatsInput 컴포넌트 구현**
3. **자동 저장 훅 구현**
4. **검증 로직 구현**
5. **모바일 최적화**

---

## 📚 참고

- 전체 시스템 아키텍처: [PLATFORM_ARCHITECTURE.md](PLATFORM_ARCHITECTURE.md)
- UI/UX 아키텍처: [PLATFORM_UI_UX_ARCHITECTURE.md](PLATFORM_UI_UX_ARCHITECTURE.md)
