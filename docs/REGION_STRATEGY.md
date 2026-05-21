# 🗺️ 지역 전략 및 목표

**생성일**: 2025-01-XX  
**플랫폼 방향**: 지역 아마추어 스포츠 플랫폼  
**핵심 질문**: 목표 지역은 어디인가?

---

## 🎯 지역 목표 전략

### 옵션 1: 서울 노원구 중심 (Deep Local) ⭐ 추천

**전략**: **"노원구 풋살/축구 플랫폼"**으로 시작

**장점**:
- ✅ 지역 커뮤니티 강화
- ✅ 초기 사용자 확보 용이
- ✅ 지역 리그 운영 용이
- ✅ 구장/시설 정보 집중 관리
- ✅ 마케팅 타겟 명확

**구조**:
```
regionCode: "SEOUL_NOWON"
region: "서울 노원구"
```

**기능**:
- 노원구 팀 목록
- 노원구 경기 매칭
- 노원구 리그
- 노원구 랭킹
- 노원구 구장 정보

**확장 계획**:
```
Phase 1: 노원구 (MVP)
Phase 2: 서울 주요 구 확장 (강남, 마포, 송파 등)
Phase 3: 수도권 전체
```

---

### 옵션 2: 수도권 전체 (Wide Launch)

**전략**: **"수도권 풋살/축구 플랫폼"**으로 시작

**장점**:
- ✅ 초기 사용자 풀 확대
- ✅ 네트워크 효과 빠름
- ✅ 다양한 리그 운영 가능

**단점**:
- ⚠️ 지역 커뮤니티 약함
- ⚠️ 초기 운영 복잡도 높음
- ⚠️ 마케팅 타겟 분산

**구조**:
```
regionCode: "SEOUL_NOWON" | "SEOUL_GANGNAM" | "GYEONGGI_SUWON" | ...
region: "서울 노원구" | "서울 강남구" | "경기 수원" | ...
```

---

## 📊 추천 전략: Deep Local → 확장

### Phase 1: 서울 노원구 중심 (MVP) ⭐

**목표**: 노원구 풋살/축구 커뮤니티 구축

**기능**:
- 노원구 팀 등록
- 노원구 경기 매칭
- 노원구 리그 운영
- 노원구 랭킹
- 노원구 구장 정보

**지역 코드**:
```typescript
regionCode: "SEOUL_NOWON"
region: "서울 노원구"
```

**예상 사용자**:
- 노원구 풋살/축구 팀 20~50개
- 노원구 선수 200~500명
- 노원구 리그 2~5개

---

### Phase 2: 서울 주요 구 확장

**목표**: 서울 내 주요 구로 확장

**추가 지역**:
- 강남구
- 마포구
- 송파구
- 강서구
- 성동구

**구조**:
```typescript
regionCode: "SEOUL_NOWON" | "SEOUL_GANGNAM" | "SEOUL_MAPO" | ...
```

---

### Phase 3: 수도권 전체

**목표**: 수도권 전체 커버

**추가 지역**:
- 경기 주요 도시 (의정부, 수원, 성남, 고양 등)
- 인천

---

## 🏗️ 지역 코드 구조

### 현재 구조 분석

**기존 사용**:
- `region: string` (예: "서울", "경기", "인천")
- 구 단위는 아직 명확하지 않음

**제안 구조**:
```typescript
// 시도 단위
region: "서울" | "경기" | "인천" | ...

// 시군구 단위 (상세)
regionCode: "SEOUL_NOWON" | "SEOUL_GANGNAM" | "GYEONGGI_UIJEONGBU" | ...
```

---

## 🎯 즉시 구현 권장사항

### 1. Region Code 표준화

**파일**: `src/constants/regionCodes.ts` ✅ 생성 완료

**사용**:
```typescript
import { RegionCode, getRegionLabel } from "@/constants/regionCodes";

const regionCode: RegionCode = "SEOUL_NOWON";
const label = getRegionLabel(regionCode); // "서울 노원구"
```

---

### 2. Teams에 regionCode 추가

**현재**: `teams.region: string`

**제안**: `teams.regionCode: RegionCode` 추가

```typescript
teams/{teamId}
{
  name: "노원FC",
  sportType: "futsal",
  region: "서울 노원구",        // 표시용
  regionCode: "SEOUL_NOWON",   // 필터링용
  // ...
}
```

---

### 3. 지역별 필터링 강화

**랭킹**:
```typescript
// 노원구 팀 랭킹
teams where regionCode == "SEOUL_NOWON" and sportType == "futsal"
order by stats.winRate desc
```

**매칭**:
```typescript
// 노원구 경기 매칭
matches where regionCode == "SEOUL_NOWON" and sportType == "futsal"
```

**리그**:
```typescript
// 노원구 리그
leagues where regionCode == "SEOUL_NOWON" and sportType == "futsal"
```

---

## 📍 지역별 기능 예시

### 노원구 중심 플랫폼

**홈 화면**:
- "노원구 오늘 용병"
- "노원구 오늘 경기 매칭"
- "노원구 최신 팀원 모집"
- "노원구 우리 지역 팀"

**랭킹**:
- "노원구 풋살 팀 랭킹"
- "노원구 축구 팀 랭킹"

**리그**:
- "노원구 풋살 리그"
- "노원구 축구 리그"

---

## 🚀 다음 단계

### 즉시 구현 (Phase 1)
1. ⭐ **Region Code 표준화** ✅ 완료
2. **Teams에 regionCode 추가**
3. **지역별 필터링 강화**
4. **노원구 중심 UI/UX**

### 중기 구현 (Phase 2)
1. **서울 주요 구 확장**
2. **지역 간 매칭 (선택적)**
3. **지역별 통계 대시보드**

---

## 💡 결론 및 추천

### 추천 전략: **서울 노원구 중심 (Deep Local)**

**이유**:
1. ✅ 지역 커뮤니티 강화
2. ✅ 초기 사용자 확보 용이
3. ✅ 리그 운영 용이
4. ✅ 마케팅 타겟 명확
5. ✅ 이후 확장 용이

**구조**:
```
Phase 1: 노원구 (MVP) ⭐ 지금
Phase 2: 서울 주요 구 확장
Phase 3: 수도권 전체
```

---

## 📝 참고 문서

- `docs/FOOTBALL_FUTSAL_ARCHITECTURE.md` - 축구/풋살 아키텍처
- `src/constants/regionCodes.ts` - 지역 코드 상수
- `src/types/sportRules.ts` - 스포츠 규칙 타입

---

## 🎉 평가

**현재 상태**: 지역 구조는 있으나 표준화 필요

**다음 단계**: Region Code 표준화 + 노원구 중심 UI/UX

이 구조가 완성되면 **지역 커뮤니티 중심 플랫폼**이 됩니다. ⚽
