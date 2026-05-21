# 🏀 멀티 스포츠 아키텍처 분석 결과

## 📊 현재 상태 분석

### 1️⃣ Sport 필드 존재 여부

#### ✅ Teams
- **필드명**: `sportType` (또는 `sportKey`)
- **상태**: ✅ 존재
- **사용 위치**: `teams/{teamId}.sportType`
- **쿼리 예시**: `where("sportType", "==", "football")`

#### ❌ Recruits
- **필드명**: `sport`
- **상태**: ❌ **없음**
- **타입 정의**: `src/types/recruit.ts`에 `sport` 필드 없음
- **서비스**: `recruitService.ts`에 `sport` 필터 없음

#### ❌ Matches
- **필드명**: `sport`
- **상태**: ❌ **없음**
- **타입 정의**: `src/types/match.ts`에 `sport` 필드 없음
- **서비스**: `matchService.ts`에 `sport` 필터 없음

#### ❌ Guest Players
- **필드명**: `sport`
- **상태**: ❌ **없음**
- **타입 정의**: `src/types/guest.ts`에 `sport` 필드 없음
- **서비스**: `guestService.ts`에 `sport` 필터 없음

---

### 2️⃣ 홈 화면 스포츠 선택 UI 연결 상태

#### ✅ **이미 연결되어 있음!**

**파일**: `src/pages/home/HomeHub.tsx`

```typescript
// ✅ State 존재
const [selectedSport, setSelectedSport] = useState<string | null>(() => {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_SPORT) || null;
  } catch {
    return null;
  }
});

// ✅ 스포츠 아이콘 클릭 시 상태 변경
const handleSportClick = (sportName: string) => {
  if (selectedSport === sportName) {
    setSelectedSport(null);  // 선택 해제
  } else {
    setSelectedSport(sportName);  // 선택
    localStorage.setItem(STORAGE_KEYS.LAST_SPORT, sportName);
  }
  // 종목 허브로 이동
  navigate(`/sports/${sportType}`);
};
```

**결론**: 
- ✅ `selectedSport` state 존재
- ✅ `setSelectedSport` 함수로 상태 변경
- ✅ 스포츠 아이콘 클릭 시 상태 변경됨
- ✅ localStorage에 저장되어 재방문 시 복원

---

### 3️⃣ 쿼리 필터 확장 가능 여부

#### ✅ Market 컬렉션
- **상태**: ✅ `sport` 필터 사용 중
- **예시**: `where("sport", "==", selectedSport)`

#### ✅ Activities 컬렉션
- **상태**: ✅ `sport` 필터 사용 중
- **예시**: `where("sport", "==", sport.toLowerCase().trim())`

#### ❌ Recruits 컬렉션
- **상태**: ❌ `sport` 필터 없음
- **현재**: `where("status", "==", "open")`만 사용
- **필요**: `where("sport", "==", selectedSport)` 추가 필요

#### ❌ Matches 컬렉션
- **상태**: ❌ `sport` 필터 없음
- **현재**: `where("status", "==", "open")`만 사용
- **필요**: `where("sport", "==", selectedSport)` 추가 필요

#### ❌ Guest Players 컬렉션
- **상태**: ❌ `sport` 필터 없음
- **현재**: `where("status", "==", "open")`만 사용
- **필요**: `where("sport", "==", selectedSport)` 추가 필요

---

## 🔥 문제점 요약

### 1. 데이터 모델에 `sport` 필드 없음
- `recruits`, `matches`, `guest_players` 타입에 `sport` 필드 없음
- 현재는 축구만 가정한 구조

### 2. 서비스 레이어에 `sport` 필터 없음
- `recruitService.ts`, `matchService.ts`, `guestService.ts`에 `sport` 필터 옵션 없음
- 멀티 스포츠 확장 시 쿼리 수정 필요

### 3. 홈 화면 UI는 이미 준비됨
- ✅ `selectedSport` state 존재
- ✅ 스포츠 선택 UI 연결됨
- ⚠️ 하지만 데이터 필터링은 안 됨 (sport 필드 없음)

---

## 🚀 해결 방안 (최소 리팩토링)

### 1️⃣ 타입 정의에 `sport` 필드 추가

#### Recruit
```typescript
// src/types/recruit.ts
export interface Recruit {
  // ... 기존 필드
  sport?: string; // "soccer" | "basketball" | "baseball" 등
}
```

#### Match
```typescript
// src/types/match.ts
export interface Match {
  // ... 기존 필드
  sport?: string; // "soccer" | "basketball" | "baseball" 등
}
```

#### Guest Player
```typescript
// src/types/guest.ts
export interface GuestPlayer {
  // ... 기존 필드
  sport?: string; // "soccer" | "basketball" | "baseball" 등
}
```

### 2️⃣ 서비스 레이어에 `sport` 필터 추가

#### Recruit Service
```typescript
// src/services/recruitService.ts
export async function getRecruits(options?: {
  status?: "open" | "closed";
  sport?: string; // 추가
  limit?: number;
}): Promise<Recruit[]> {
  const conditions: any[] = [];
  
  if (options?.status) {
    conditions.push(where("status", "==", options.status));
  }
  
  if (options?.sport) { // 추가
    conditions.push(where("sport", "==", options.sport));
  }
  
  // ... 나머지
}
```

### 3️⃣ 생성 시 `sport` 필드 자동 추가

#### Recruit Create
```typescript
// src/pages/recruit/RecruitCreatePage.tsx
const recruitData = {
  ...input,
  authorId,
  sport: "soccer", // 기본값 (팀의 sportType에서 가져오기)
  status: "open",
  createdAt: serverTimestamp(),
};
```

---

## 📋 권장 접근 방법

### Phase 1: 축구 우선 개발 (현재)
- ✅ 축구 기능 먼저 완성
- ✅ `sport` 필드는 선택적(optional)으로 추가
- ✅ 기본값: `"soccer"`

### Phase 2: 멀티 스포츠 확장 준비
- ✅ 타입에 `sport?: string` 추가
- ✅ 서비스에 `sport` 필터 옵션 추가
- ✅ 생성 시 팀의 `sportType`에서 자동 설정

### Phase 3: 멀티 스포츠 활성화
- ✅ 홈 화면에서 스포츠 선택 시 필터링
- ✅ 각 스포츠별 독립적인 데이터 표시

---

## ✅ 결론

### 현재 상태
1. ❌ **데이터 모델**: `sport` 필드 없음 (recruits, matches, guest_players)
2. ✅ **UI**: 스포츠 선택 state 이미 연결됨
3. ❌ **쿼리**: `sport` 필터 없음

### 다음 단계
1. 타입 정의에 `sport?: string` 추가 (선택적)
2. 서비스 레이어에 `sport` 필터 옵션 추가
3. 생성 시 팀의 `sportType`에서 자동 설정
4. 홈 화면 필터링 연동

**전체 리팩토링 불필요**: 최소한의 변경으로 멀티 스포츠 확장 가능
