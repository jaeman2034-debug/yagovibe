# 🌏 전국 확장 가능한 플랫폼 아키텍처

**생성일**: 2025-01-XX  
**플랫폼 방향**: 노원구 → 서울 → 전국 확장  
**전략**: Deep Local → 확장 (배달의민족/당근마켓 전략)

---

## 🎯 핵심 원칙: 전국 확장 플랫폼

### 지역 구조 계층화

```
country (국가)
   ↓
province (시/도)
   ↓
city (구/시)
   ↓
league (리그)
   ↓
team (팀)
```

**예시**:
```
대한민국 (KR)
   ↓
서울 (SEOUL)
   ↓
노원구 (NOWON)
   ↓
노원 풋살 리그
   ↓
야고FC
```

---

## 📊 지역 코드 시스템 (전국 확장형)

### 개선된 Region Code 체계

**형식**: `{국가코드}_{시도}_{시군구}`

```typescript
// 서울
"KR_SEOUL_NOWON"      // 서울 노원구
"KR_SEOUL_GANGNAM"    // 서울 강남구
"KR_SEOUL_MAPO"       // 서울 마포구
"KR_SEOUL_SONGPA"     // 서울 송파구

// 경기
"KR_GYEONGGI_UIJEONGBU"  // 경기 의정부
"KR_GYEONGGI_SUWON"      // 경기 수원
"KR_GYEONGGI_SEONGNAM"   // 경기 성남
"KR_GYEONGGI_GOYANG"     // 경기 고양

// 인천
"KR_INCHEON_JUNG"     // 인천 중구
"KR_INCHEON_NAMDONG"  // 인천 남동구

// 부산
"KR_BUSAN_HAEUNDAE"   // 부산 해운대구
"KR_BUSAN_BUSANJIN"   // 부산 부산진구

// 기타
"KR_DAEGU"            // 대구
"KR_GWANGJU"          // 광주
"KR_DAEJEON"          // 대전
"KR_ULSAN"            // 울산
```

### Region Code 구조

```typescript
type RegionCode = 
  | `KR_SEOUL_${SeoulDistrict}`
  | `KR_GYEONGGI_${GyeonggiCity}`
  | `KR_INCHEON_${IncheonDistrict}`
  | `KR_BUSAN_${BusanDistrict}`
  | `KR_DAEGU`
  | `KR_GWANGJU`
  | `KR_DAEJEON`
  | `KR_ULSAN`
  | `KR_GANGWON`
  | `KR_CHUNGBUK`
  | `KR_CHUNGNAM`
  | `KR_JEONBUK`
  | `KR_JEONNAM`
  | `KR_GYEONGBUK`
  | `KR_GYEONGNAM`
  | `KR_JEJU`;
```

---

## 🗺️ 지도 기반 확장 구조

### 위치 정보 추가

**Teams**:
```typescript
teams/{teamId}
{
  name: "야고FC",
  sportType: "futsal",
  regionCode: "KR_SEOUL_NOWON",
  
  // 위치 정보 (지도 기반 확장)
  location: {
    lat: 37.654,      // 위도
    lng: 127.056,     // 경도
    address: "서울시 노원구 상계동"
  },
  
  // ...
}
```

**Matches**:
```typescript
matches/{matchId}
{
  sportType: "futsal",
  regionCode: "KR_SEOUL_NOWON",
  
  location: {
    lat: 37.654,
    lng: 127.056,
    address: "노원 풋살장"
  },
  
  // ...
}
```

**Leagues**:
```typescript
leagues/{leagueId}
{
  name: "노원 풋살 리그",
  sportType: "futsal",
  regionCode: "KR_SEOUL_NOWON",
  
  location: {
    lat: 37.654,
    lng: 127.056,
    address: "서울시 노원구"
  },
  
  // ...
}
```

---

## 🏆 3단계 랭킹 구조

### 1️⃣ 지역 랭킹 (구/시 단위)

**예**: 노원구 랭킹

```typescript
// 쿼리
teams
  .where("sportType", "==", "futsal")
  .where("regionCode", "==", "KR_SEOUL_NOWON")
  .where("status", "==", "active")
  .orderBy("stats.winRate", "desc")
  .orderBy("stats.goalDiff", "desc")
  .limit(50);
```

**라우트**: `/sports/futsal/ranking?region=KR_SEOUL_NOWON`

---

### 2️⃣ 시도 랭킹 (서울 전체)

**예**: 서울 랭킹

```typescript
// 쿼리 (regionCode prefix 매칭)
teams
  .where("sportType", "==", "futsal")
  .where("regionCode", ">=", "KR_SEOUL")
  .where("regionCode", "<", "KR_SEOUL\uf8ff")
  .where("status", "==", "active")
  .orderBy("stats.winRate", "desc")
  .orderBy("stats.goalDiff", "desc")
  .limit(100);
```

**라우트**: `/sports/futsal/ranking?region=KR_SEOUL`

---

### 3️⃣ 전국 랭킹

**예**: 대한민국 랭킹

```typescript
// 쿼리
teams
  .where("sportType", "==", "futsal")
  .where("status", "==", "active")
  .orderBy("stats.winRate", "desc")
  .orderBy("stats.goalDiff", "desc")
  .limit(200);
```

**라우트**: `/sports/futsal/ranking?region=KR`

---

## 🎯 매칭 시스템 (지역 기반)

### 근처 팀 매칭

**기본 매칭** (같은 구):
```typescript
matches
  .where("sportType", "==", "futsal")
  .where("regionCode", "==", "KR_SEOUL_NOWON")
  .where("status", "==", "open");
```

**확장 매칭** (같은 시도):
```typescript
matches
  .where("sportType", "==", "futsal")
  .where("regionCode", ">=", "KR_SEOUL")
  .where("regionCode", "<", "KR_SEOUL\uf8ff")
  .where("status", "==", "open");
```

**지도 기반 매칭** (반경 검색):
```typescript
// Firestore GeoHash 또는 별도 지도 서비스 사용
// 예: Google Maps API, Naver Maps API
```

---

## 📍 플랫폼 확장 로드맵

### Phase 1: 노원구 풋살/축구 플랫폼 (현재) ⭐

**목표**: 노원구 완전 장악

**기능**:
- ✅ 팀 생성/관리
- ✅ 경기 기록
- ✅ 통계/랭킹
- ✅ 리그 시스템
- ✅ 경기 매칭

**지역 코드**: `KR_SEOUL_NOWON`

**예상 사용자**:
- 노원구 팀 20~50개
- 노원구 선수 200~500명
- 노원구 리그 2~5개

---

### Phase 2: 서울 전체 플랫폼

**목표**: 서울 주요 구 확장

**추가 지역**:
- 강남구 (`KR_SEOUL_GANGNAM`)
- 마포구 (`KR_SEOUL_MAPO`)
- 송파구 (`KR_SEOUL_SONGPA`)
- 강서구 (`KR_SEOUL_GANGSEO`)
- 성동구 (`KR_SEOUL_SEONGDONG`)

**추가 기능**:
- 서울 리그
- 서울 랭킹
- 서울 매칭
- 구 간 경기

---

### Phase 3: 수도권 전체

**목표**: 수도권 커버

**추가 지역**:
- 경기 주요 도시 (의정부, 수원, 성남, 고양 등)
- 인천

**추가 기능**:
- 수도권 리그
- 수도권 랭킹
- 수도권 매칭

---

### Phase 4: 전국 플랫폼

**목표**: 전국 확장

**추가 지역**:
- 부산, 대구, 광주, 대전, 울산
- 강원, 충북, 충남, 전북, 전남, 경북, 경남
- 제주

**추가 기능**:
- 전국 리그
- 전국 랭킹
- 전국 토너먼트
- 지역 간 경기

---

## 🏗️ 최종 플랫폼 구조

### 전국 확장 가능한 구조

```
country (KR)
   ↓
region (KR_SEOUL_NOWON)
   ↓
season (2026)
   ↓
league (노원 풋살 리그)
   ↓
division (Division A)
   ↓
teams (야고FC)
   ↓
games (team_games)
   ↓
stats (teams.stats)
   ↓
ranking (3단계)
```

---

## 🔧 구현 우선순위

### 즉시 구현 (Phase 1)
1. ⭐ **Region Code 전국 확장형으로 개선** (`KR_SEOUL_NOWON` 형식)
2. **Teams에 location 필드 추가** (lat/lng)
3. **3단계 랭킹 구조 구현**
4. **지역별 필터링 강화**

### 중기 구현 (Phase 2)
1. **서울 주요 구 확장**
2. **지도 기반 매칭** (반경 검색)
3. **구 간 경기 매칭**

### 장기 구현 (Phase 3~4)
1. **수도권 확장**
2. **전국 확장**
3. **전국 토너먼트**

---

## 💡 핵심 기능 집중 전략

### 옵션 1: 경기 매칭 플랫폼 ⭐ 추천

**집중 영역**: 경기 상대 찾기

**아키텍처 방향**:
- 매칭 알고리즘 강화
- 지역 기반 필터링
- 지도 기반 검색
- 실시간 매칭

**확장 전략**:
```
노원구 매칭 완전 장악
↓
서울 매칭 확장
↓
전국 매칭
```

---

### 옵션 2: 리그 운영 플랫폼

**집중 영역**: 리그/토너먼트 운영

**아키텍처 방향**:
- 리그 관리 시스템 강화
- 시즌/디비전 관리
- 승격/강등 시스템
- 리그 통계/랭킹

**확장 전략**:
```
노원구 리그 완전 장악
↓
서울 리그 확장
↓
전국 리그
```

---

### 옵션 3: 팀 기록/통계 플랫폼

**집중 영역**: 경기 기록 및 통계

**아키텍처 방향**:
- 경기 기록 시스템 강화
- 통계 자동 계산
- 선수 기록 시스템
- 랭킹 시스템

**확장 전략**:
```
노원구 기록 완전 장악
↓
서울 기록 확장
↓
전국 기록
```

---

## 🎯 추천 전략

### 핵심 기능: 경기 매칭 플랫폼 ⭐

**이유**:
1. ✅ 사용자 트래픽 핵심
2. ✅ 지역 확장 용이
3. ✅ 네트워크 효과 빠름
4. ✅ 수익 모델 명확 (매칭 수수료)

**아키텍처**:
- 매칭 시스템 중심
- 지역 기반 필터링 강화
- 지도 기반 검색
- 실시간 매칭

---

## 📝 참고 문서

- `docs/FOOTBALL_FUTSAL_ARCHITECTURE.md` - 축구/풋살 아키텍처
- `docs/REGION_STRATEGY.md` - 지역 전략
- `src/constants/regionCodes.ts` - 지역 코드 상수

---

## 🎉 평가

**현재 플랫폼 구조**: **Sports Platform Core Engine**

**전국 확장 가능성**: ✅ **매우 높음**

**다음 단계**: Region Code 전국 확장형으로 개선 + 핵심 기능 집중 결정

이 구조가 완성되면 **전국 생활체육 플랫폼**이 됩니다. ⚽
