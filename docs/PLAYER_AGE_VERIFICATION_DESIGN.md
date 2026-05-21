# 🔥 선수 명단 연령 자동 검증 시스템 설계 (최종)

## 🎯 핵심 원칙

**엑셀을 '입력'으로 쓰고, 엑셀을 '검증 결과'로 다시 돌려준다**

## 📋 전체 흐름

```
1. 팀 입력 (엑셀/복붙)
   ↓
2. 시스템 자동 처리
   - 출생연도 자동 계산
   - 연령 적합 여부 판단 (ageRule 기준)
   - 연령대 그룹 자동 분류
   ↓
3. 검증 결과 제공
   - 웹 UI: 필터링된 테이블
   - 엑셀: 연령대별 시트 자동 생성
```

## 🧩 데이터 구조

### 입력 형식 (팀이 입력)
```
이름 | 생년월일 | 포지션 | 비고
김민수 | 2011-03-12 | FW |
박철우 | 2008-07-01 | DF |
이성훈 | 2013-11-22 | MF |
```

### 검증 결과 (시스템이 생성)
```typescript
interface PlayerVerification {
  name: string;
  birthDate: string; // YYYY-MM-DD
  birthYear: number; // 자동 계산
  position?: string;
  notes?: string;
  
  // 🔥 자동 판별 결과
  eligible: boolean;
  reason?: string; // "연령 OK" | "연령 초과" | "생년월일 오류"
  ageGroup?: string; // "U-12" | "OVER-40" 등
}
```

## 🔧 구현 방법 (2가지 옵션)

### 방법 A: 복붙 UI + 웹 검증 (추천 · 빠름)
**장점:**
- 즉시 결과 확인
- 엑셀 없이도 가능
- 실시간 필터링

**구현:**
1. `PlayerListPasteForm.tsx` - 텍스트 영역에 복붙
2. `checkAgeEligibility()` 유틸 함수
3. `PlayerVerificationTable.tsx` - 필터링된 결과 표시
4. "엑셀로 다운로드" 버튼 (선택)

### 방법 B: 엑셀 업로드 + 결과 엑셀 생성 (전문적)
**장점:**
- 사무국 익숙한 방식
- 결과물도 엑셀로 제공
- 대량 처리 용이

**구현:**
1. `PlayerListUploadForm.tsx` - 엑셀 파일 업로드
2. Cloud Function: 엑셀 파싱 + 연령 판별
3. 결과 엑셀 자동 생성 (연령대별 시트)
4. 다운로드 제공

## 🎯 추천 순서

**1️⃣ 복붙 UI + 자동 분류 (먼저)**
- 빠르게 구현 가능
- 즉시 테스트 가능
- 웹 UI로 결과 확인

**2️⃣ 엑셀 업로드 + 결과 엑셀 (추가)**
- 사무국 요구 시 추가
- 대량 처리용

## 🔥 핵심 함수 설계

### `checkAgeEligibility(player, tournamentAgeRule)`

```typescript
interface AgeEligibilityResult {
  eligible: boolean;
  reason: string;
  ageGroup?: string;
}

function checkAgeEligibility(
  player: { birthYear: number },
  ageRule: AgeRule
): AgeEligibilityResult {
  if (ageRule.type === "OPEN") {
    return { eligible: true, reason: "연령 제한 없음" };
  }
  
  if (ageRule.type === "U") {
    if (player.birthYear <= (ageRule.maxBirthYear || 0)) {
      const age = new Date().getFullYear() - player.birthYear;
      return { 
        eligible: true, 
        reason: "연령 OK",
        ageGroup: `U-${age}`
      };
    }
    return { 
      eligible: false, 
      reason: `연령 초과 (${ageRule.maxBirthYear}년생 이하만 가능)`
    };
  }
  
  if (ageRule.type === "OVER") {
    if (player.birthYear >= (ageRule.minBirthYear || 0)) {
      return { 
        eligible: true, 
        reason: "연령 OK",
        ageGroup: `OVER-${new Date().getFullYear() - player.birthYear}`
      };
    }
    return { 
      eligible: false, 
      reason: `연령 미달 (${ageRule.minBirthYear}년생 이상만 가능)`
    };
  }
  
  return { eligible: false, reason: "알 수 없는 연령 기준" };
}
```

## 📊 검증 결과 시트 구조

### 시트 1: 출전 가능
```
이름 | 출생연도 | 연령 | 포지션 | 판정
김민수 | 2011 | 13세 | FW | ✅ 가능
이성훈 | 2013 | 11세 | MF | ✅ 가능
```

### 시트 2: 연령 초과/미달
```
이름 | 출생연도 | 연령 | 포지션 | 판정 | 사유
박철우 | 2008 | 16세 | DF | ❌ 불가 | 연령 초과
```

### 시트 3: 확인 필요
```
이름 | 출생연도 | 연령 | 포지션 | 판정 | 사유
정우진 | - | - | - | ⚠️ 확인 필요 | 생년월일 오류
```

## ✅ 다음 단계 대기

사용자 선택 대기:
- 1️⃣ 복붙 UI + 자동 분류 코드
- 2️⃣ 엑셀 업로드 → 결과 엑셀 생성

